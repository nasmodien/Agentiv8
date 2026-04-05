import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1';

async function getHostawayToken(accountId: string, apiKey: string): Promise<string> {
  const res = await fetch(`${HOSTAWAY_BASE}/accessTokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: accountId,
      client_secret: apiKey,
      scope: 'general',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Hostaway auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function getHostawayCreds(orgId: string) {
  const [accountIdRow, apiKeyRow] = await Promise.all([
    prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'HOSTAWAY_ACCOUNT_ID' } } }),
    prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'HOSTAWAY_API_KEY' } } }),
  ]);

  if (!accountIdRow?.value || !apiKeyRow?.value) {
    throw new Error('Hostaway credentials not configured. Go to Settings to add your Account ID and API Key.');
  }

  return { accountId: accountIdRow.value, apiKey: apiKeyRow.value };
}

// GET /api/hostaway/sync?orgId=default&type=listings|reservations|all
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') ?? 'default';
    const type = searchParams.get('type') ?? 'all';

    const { accountId, apiKey } = await getHostawayCreds(orgId);
    const token = await getHostawayToken(accountId, apiKey);

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Cache-control': 'no-cache',
    };

    // Ensure org exists
    let org = await prisma.organization.findFirst({ where: { id: orgId } });
    if (!org) {
      org = await prisma.organization.upsert({
        where: { slug: orgId },
        create: { id: orgId, name: 'My Properties', slug: orgId },
        update: {},
      });
    }

    const results: Record<string, unknown> = {};

    // ── SYNC LISTINGS (Properties) ──
    if (type === 'listings' || type === 'all') {
      const listingsRes = await fetch(`${HOSTAWAY_BASE}/listings?limit=100`, { headers });
      if (!listingsRes.ok) throw new Error(`Failed to fetch listings: ${listingsRes.status}`);
      const listingsData = await listingsRes.json();
      const listings = listingsData.result ?? [];

      let synced = 0;
      for (const listing of listings) {
        const listingData = {
          name: listing.name ?? `Property ${listing.id}`,
          unitNumber: listing.internalListingName ?? listing.name,
          address: listing.address ?? null,
          suburb: listing.state ?? listing.neighbourhood ?? null,
          city: listing.city ?? null,
          country: listing.countryCode ?? listing.country ?? null,
          description: listing.publicDescription?.summary
            ?? listing.description
            ?? listing.internalDescription
            ?? null,
          bedrooms: listing.bedroomsCount ?? listing.bedrooms ?? null,
          bathrooms: listing.bathroomsCount != null ? parseFloat(String(listing.bathroomsCount)) : null,
          maxGuests: listing.personCapacity ?? listing.guestsIncluded ?? null,
          wifiNetwork: listing.wifiName ?? null,
          wifiPassword: listing.wifiPassword ?? null,
          checkInTime: listing.checkInTimeStart != null ? `${listing.checkInTimeStart}:00` : '15:00',
          checkOutTime: listing.checkOutTime != null ? `${listing.checkOutTime}:00` : '11:00',
        };
        await prisma.property.upsert({
          where: { id: String(listing.id) },
          create: { id: String(listing.id), orgId: org.id, ...listingData },
          update: listingData,
        });
        synced++;
      }

      results.listings = { synced, total: listings.length };
    }

    // ── SYNC RESERVATIONS (Bookings) ──
    if (type === 'reservations' || type === 'all') {
      const today = new Date();
      const from = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const resRes = await fetch(
        `${HOSTAWAY_BASE}/reservations?arrivalStartDate=${from}&arrivalEndDate=${to}&limit=500`,
        { headers }
      );
      if (!resRes.ok) throw new Error(`Failed to fetch reservations: ${resRes.status}`);
      const resData = await resRes.json();
      const reservations = resData.result ?? [];

      const storedProperties = await prisma.property.findMany({ select: { id: true } });
      const storedIds = new Set(storedProperties.map(p => p.id));

      let synced = 0;
      const syncedReservationIds: string[] = [];

      for (const res of reservations) {
        const propertyId = String(res.listingMapId ?? res.listingId);

        if (!storedIds.has(propertyId)) continue;

        const channelMap: Record<string, 'AIRBNB' | 'BOOKING_COM' | 'DIRECT' | 'WHATSAPP' | 'SMS'> = {
          airbnb: 'AIRBNB',
          'airbnb.com': 'AIRBNB',
          airbnb2: 'AIRBNB',
          'airbnb pro': 'AIRBNB',
          'airbnb plus': 'AIRBNB',
          airbnb_pro: 'AIRBNB',
          'booking.com': 'BOOKING_COM',
          bookingcom: 'BOOKING_COM',
          vrbo: 'DIRECT',
          homeaway: 'DIRECT',
          expedia: 'DIRECT',
          direct: 'DIRECT',
        };
        // Robust channel detection — use includes() to handle "Airbnb Pro", "Airbnb 2", etc.
        const rawChannel = (res.channelName ?? '').toLowerCase();
        let channel: 'AIRBNB' | 'BOOKING_COM' | 'DIRECT' | 'WHATSAPP' | 'SMS' = 'DIRECT';
        if (rawChannel.includes('airbnb')) channel = 'AIRBNB';
        else if (rawChannel.includes('booking')) channel = 'BOOKING_COM';
        else if (rawChannel.includes('whatsapp')) channel = 'WHATSAPP';
        else if (rawChannel.includes('sms')) channel = 'SMS';
        else if (channelMap[rawChannel]) channel = channelMap[rawChannel];

        const fin = (v: unknown) => v != null ? parseFloat(String(v)) : null;
        const hostPayout = fin(res.airbnbPayoutSum ?? res.hostPayout ?? res.totalPrice);
        const commission = fin(res.channelCommission ?? res.channelCommissionAmount ?? res.pmCommission);
        const financials = {
          // airbnbPayoutSum = value reported directly from Airbnb
          totalPrice:        hostPayout,
          // Derive guestTotal: check direct fields first, then derive from payout + commission
          guestTotal:        fin(res.totalAmount ?? res.guestTotalAmount ?? res.channelAmount)
                             ?? (hostPayout != null && commission != null ? hostPayout + commission : hostPayout),
          cleaningFee:       fin(res.cleaningFee),
          channelCommission: commission,
          taxAmount:         fin(res.taxAmount ?? res.totalTaxes ?? res.vatAmount),
          hostServiceFee:    fin(res.hostServiceFee ?? res.airbnbHostFee),
        };
        const bookingData = {
          guestName: `${res.guestFirstName ?? ''} ${res.guestLastName ?? ''}`.trim() || 'Guest',
          guestEmail: res.guestEmail ?? null,
          guestPhone: res.phone ?? null,
          channel,
          checkIn: new Date(res.arrivalDate),
          checkOut: new Date(res.departureDate),
          adults: res.numberOfGuests ?? 1,
          status: mapStatus(res.status),
          ...financials,
        };
        await prisma.booking.upsert({
          where: { id: String(res.id) },
          create: { id: String(res.id), propertyId, ...bookingData },
          update: bookingData,
        });
        synced++;
        syncedReservationIds.push(String(res.id));
      }

      results.reservations = { synced, total: reservations.length };

      // Conversations sync is now a separate type to avoid timeouts
      // Run it separately when type=conversations or type=all (small batch only for 'all')
      if (type === 'all') {
        results.messages = { note: 'Use type=conversations to sync messages separately' };
      }
    }

    // ── SYNC CONVERSATIONS (batched, smart) ──
    if (type === 'conversations') {
      const offset = parseInt(searchParams.get('offset') ?? '0', 10);
      const BATCH = 30; // safe for Vercel 60s limit (~2 API calls each = 60 calls)

      // Fetch one page of conversations from Hostaway
      const convListRes = await fetch(
        `${HOSTAWAY_BASE}/conversations?limit=${BATCH}&offset=${offset}&sortOrder=lastMessage`,
        { headers }
      );
      if (!convListRes.ok) throw new Error(`Conversations fetch failed: ${convListRes.status}`);
      const convListData = await convListRes.json();
      const haConversations: Record<string, unknown>[] = convListData.result ?? [];

      let convsSynced = 0;
      let messagesInBatch = 0;
      let skipped = 0;

      // Get existing conversations to skip unchanged ones
      const existingConvIds = haConversations.map(c => `ha-conv-${c.id}`);
      const existingConvs = await prisma.conversation.findMany({
        where: { id: { in: existingConvIds } },
        select: { id: true, lastMessageAt: true },
      });
      const existingMap = new Map(existingConvs.map(c => [c.id, c.lastMessageAt]));

      for (const haCon of haConversations) {
        try {
          const haConvId = String(haCon.id);
          const convId = `ha-conv-${haConvId}`;
          const reservationId = haCon.reservationId != null ? String(haCon.reservationId) : null;

          // Smart skip: if lastMessageAt hasn't changed, skip fetching messages
          const haLastMsg = haCon.lastMessageAt ? new Date(haCon.lastMessageAt as string) : null;
          const dbLastMsg = existingMap.get(convId);
          if (dbLastMsg && haLastMsg && Math.abs(dbLastMsg.getTime() - haLastMsg.getTime()) < 1000) {
            skipped++;
            continue;
          }

          const booking = reservationId
            ? await prisma.booking.findUnique({ where: { id: reservationId } })
            : null;

          const propertyId = booking?.propertyId
            ?? (haCon.listingMapId != null ? String(haCon.listingMapId) : null)
            ?? (haCon.listingId != null ? String(haCon.listingId) : null);

          if (!propertyId) { skipped++; continue; }

          // Fetch messages for this conversation
          const msgRes = await fetch(
            `${HOSTAWAY_BASE}/conversations/${haConvId}/messages?limit=100`,
            { headers }
          );
          if (!msgRes.ok) continue;
          const msgData = await msgRes.json();
          const messages: Record<string, unknown>[] = msgData.result ?? [];

          const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
          const lastMsgAt = lastMsg?.createdAt
            ? new Date(lastMsg.createdAt as string)
            : haLastMsg ?? new Date();

          await prisma.conversation.upsert({
            where: { id: convId },
            create: {
              id: convId,
              bookingId: booking?.id ?? null,
              propertyId,
              channel: booking?.channel ?? 'DIRECT',
              status: 'AI_HANDLED',
              lastMessageAt: lastMsgAt,
            },
            update: { lastMessageAt: lastMsgAt },
          });
          convsSynced++;

          for (const msg of messages) {
            const msgId = `ha-msg-${haConvId}-${msg.id}`;
            await prisma.message.upsert({
              where: { id: msgId },
              create: {
                id: msgId,
                conversationId: convId,
                role: mapMessageRole(String(msg.type ?? '')),
                content: String(msg.body ?? msg.message ?? ''),
                createdAt: msg.createdAt ? new Date(msg.createdAt as string) : new Date(),
              },
              update: {
                role: mapMessageRole(String(msg.type ?? '')),
                content: String(msg.body ?? msg.message ?? ''),
              },
            });
            messagesInBatch++;
          }
        } catch { skipped++; }
      }

      const totalInHostaway = convListData.count ?? convListData.total ?? null;
      results.conversations = {
        synced: convsSynced,
        messages: messagesInBatch,
        skipped,
        offset,
        batchSize: haConversations.length,
        hasMore: haConversations.length === BATCH,
        nextOffset: offset + BATCH,
        total: totalInHostaway,
      };
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Sync failed';
    console.error('Hostaway sync error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function mapMessageRole(type: string): 'GUEST' | 'AI' | 'HUMAN' {
  const t = type.toLowerCase().trim();
  if (t === 'guest') return 'GUEST';
  if (t === 'automatic' || t === 'system') return 'AI';
  // 'host', 'owner', or anything else → host reply
  return 'HUMAN';
}

function mapStatus(status: string): 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED' {
  const map: Record<string, 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'> = {
    confirmed: 'CONFIRMED',
    checkedIn: 'CHECKED_IN',
    checkedout: 'CHECKED_OUT',
    cancelled: 'CANCELLED',
    canceled: 'CANCELLED',
  };
  return map[status?.toLowerCase()] ?? 'CONFIRMED';
}
