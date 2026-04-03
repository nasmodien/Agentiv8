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
        await prisma.property.upsert({
          where: { id: String(listing.id) },
          create: {
            id: String(listing.id),
            orgId: org.id,
            name: listing.name ?? `Property ${listing.id}`,
            unitNumber: listing.internalListingName ?? listing.name,
            address: [listing.address, listing.city, listing.state, listing.countryCode]
              .filter(Boolean)
              .join(', '),
            wifiNetwork: listing.wifiName ?? null,
            wifiPassword: listing.wifiPassword ?? null,
            checkInTime: listing.checkInTimeStart != null ? `${listing.checkInTimeStart}:00` : '15:00',
            checkOutTime: listing.checkOutTime != null ? `${listing.checkOutTime}:00` : '11:00',
          },
          update: {
            name: listing.name ?? `Property ${listing.id}`,
            unitNumber: listing.internalListingName ?? listing.name,
            address: [listing.address, listing.city, listing.state, listing.countryCode]
              .filter(Boolean)
              .join(', '),
            wifiNetwork: listing.wifiName ?? null,
            wifiPassword: listing.wifiPassword ?? null,
            checkInTime: listing.checkInTimeStart != null ? `${listing.checkInTimeStart}:00` : '15:00',
            checkOutTime: listing.checkOutTime != null ? `${listing.checkOutTime}:00` : '11:00',
          },
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
          'booking.com': 'BOOKING_COM',
          bookingcom: 'BOOKING_COM',
          direct: 'DIRECT',
        };
        const channel = channelMap[res.channelName?.toLowerCase()] ?? 'DIRECT';

        const fin = (v: unknown) => v != null ? parseFloat(String(v)) : null;
        const financials = {
          totalPrice:        fin(res.hostPayout ?? res.totalPrice),
          guestTotal:        fin(res.totalAmount ?? res.guestTotalAmount ?? res.channelAmount),
          cleaningFee:       fin(res.cleaningFee),
          channelCommission: fin(res.channelCommission ?? res.channelCommissionAmount),
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

      // ── SYNC MESSAGES (Conversations) ──
      // Only sync messages for active/recent bookings to avoid timeout
      const now = new Date();
      const cutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const activeBookings = await prisma.booking.findMany({
        where: {
          checkOut: { gte: cutoff },
        },
        select: { id: true },
        orderBy: { checkIn: 'desc' },
        take: 50,
      });
      const activeReservationIds = activeBookings.map(b => b.id);

      // Fetch conversations from Hostaway (linked to reservations)
      let messagesSynced = 0;

      for (const reservationId of activeReservationIds) {
        try {
          // Get conversation for this reservation
          const convRes = await fetch(
            `${HOSTAWAY_BASE}/conversations?reservationId=${reservationId}&limit=10`,
            { headers }
          );
          if (!convRes.ok) continue;
          const convData = await convRes.json();
          const haConversations: Record<string, unknown>[] = convData.result ?? [];
          if (haConversations.length === 0) continue;

          const booking = await prisma.booking.findUnique({ where: { id: reservationId } });
          if (!booking) continue;

          for (const haCon of haConversations) {
            const haConvId = String(haCon.id);
            const convId = `ha-conv-${haConvId}`;

            // Fetch messages for this conversation
            const msgRes = await fetch(`${HOSTAWAY_BASE}/conversations/${haConvId}/messages?limit=100`, { headers });
            if (!msgRes.ok) continue;
            const msgData = await msgRes.json();
            const messages: Record<string, unknown>[] = msgData.result ?? [];
            if (messages.length === 0) continue;

            const lastMsg = messages[messages.length - 1];
            const lastMsgAt = lastMsg?.createdAt ? new Date(lastMsg.createdAt as string) : new Date();

            await prisma.conversation.upsert({
              where: { id: convId },
              create: {
                id: convId,
                bookingId: reservationId,
                propertyId: booking.propertyId,
                channel: booking.channel,
                status: 'AI_HANDLED',
                lastMessageAt: lastMsgAt,
              },
              update: { lastMessageAt: lastMsgAt },
            });

            for (const msg of messages) {
              const msgId = `ha-msg-${haConvId}-${msg.id}`;
              const role = mapMessageRole(String(msg.type ?? ''));
              await prisma.message.upsert({
                where: { id: msgId },
                create: {
                  id: msgId,
                  conversationId: convId,
                  role,
                  content: String(msg.body ?? msg.message ?? ''),
                  createdAt: msg.createdAt ? new Date(msg.createdAt as string) : new Date(),
                },
                update: { content: String(msg.body ?? msg.message ?? '') },
              });
              messagesSynced++;
            }
          }
        } catch {
          // skip failed conversation fetches
        }
      }

      results.messages = { synced: messagesSynced };
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Sync failed';
    console.error('Hostaway sync error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function mapMessageRole(type: string): 'GUEST' | 'AI' | 'HUMAN' {
  if (type === 'guest') return 'GUEST';
  if (type === 'automatic') return 'AI';
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
