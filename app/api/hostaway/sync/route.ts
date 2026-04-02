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
            checkInTime: listing.checkInTimeStart ?? '15:00',
            checkOutTime: listing.checkOutTime ?? '11:00',
          },
          update: {
            name: listing.name ?? `Property ${listing.id}`,
            unitNumber: listing.internalListingName ?? listing.name,
            address: [listing.address, listing.city, listing.state, listing.countryCode]
              .filter(Boolean)
              .join(', '),
            wifiNetwork: listing.wifiName ?? null,
            wifiPassword: listing.wifiPassword ?? null,
            checkInTime: listing.checkInTimeStart ?? '15:00',
            checkOutTime: listing.checkOutTime ?? '11:00',
          },
        });
        synced++;
      }

      results.listings = { synced, total: listings.length };
    }

    // ── SYNC RESERVATIONS (Bookings) ──
    if (type === 'reservations' || type === 'all') {
      const today = new Date();
      const from = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const resRes = await fetch(
        `${HOSTAWAY_BASE}/reservations?arrivalStartDate=${from}&arrivalEndDate=${to}&limit=100`,
        { headers }
      );
      if (!resRes.ok) throw new Error(`Failed to fetch reservations: ${resRes.status}`);
      const resData = await resRes.json();
      const reservations = resData.result ?? [];

      let synced = 0;
      for (const res of reservations) {
        const propertyId = String(res.listingId);

        // Skip if property not synced yet
        const property = await prisma.property.findUnique({ where: { id: propertyId } });
        if (!property) continue;

        const channelMap: Record<string, 'AIRBNB' | 'BOOKING_COM' | 'DIRECT' | 'WHATSAPP' | 'SMS'> = {
          airbnb: 'AIRBNB',
          'booking.com': 'BOOKING_COM',
          bookingcom: 'BOOKING_COM',
          direct: 'DIRECT',
        };
        const channel = channelMap[res.channelName?.toLowerCase()] ?? 'DIRECT';

        await prisma.booking.upsert({
          where: { id: String(res.id) },
          create: {
            id: String(res.id),
            propertyId,
            guestName: `${res.guestFirstName ?? ''} ${res.guestLastName ?? ''}`.trim() || 'Guest',
            guestEmail: res.guestEmail ?? null,
            guestPhone: res.phone ?? null,
            channel,
            checkIn: new Date(res.arrivalDate),
            checkOut: new Date(res.departureDate),
            adults: res.numberOfGuests ?? 1,
            status: mapStatus(res.status),
          },
          update: {
            guestName: `${res.guestFirstName ?? ''} ${res.guestLastName ?? ''}`.trim() || 'Guest',
            guestEmail: res.guestEmail ?? null,
            channel,
            checkIn: new Date(res.arrivalDate),
            checkOut: new Date(res.departureDate),
            adults: res.numberOfGuests ?? 1,
            status: mapStatus(res.status),
          },
        });
        synced++;
      }

      results.reservations = { synced, total: reservations.length };
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Sync failed';
    console.error('Hostaway sync error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
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
