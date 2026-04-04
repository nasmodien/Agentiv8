import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1';

// Hostaway numeric channelId → canonical key
const CHANNEL_ID_MAP: Record<number, string> = {
  2000: 'airbnb',
  2002: 'airbnb',   // Airbnb 2
  2003: 'airbnb',   // Airbnb Pro
  2009: 'booking',
  2016: 'vrbo',
  2017: 'homeaway',
  2022: 'expedia',
  2028: 'wotif',
  2030: 'google',
  2034: 'tripadvisor',
  2041: 'hotelbeds',
  2042: 'marriott',
  2050: 'agoda',
  2065: 'direct',
};

// Normalise a string channel name to a canonical key
function normaliseChannelName(raw: string): string {
  const s = raw.toLowerCase().replace(/[\s._\-]/g, '');
  if (s.includes('airbnb'))      return 'airbnb';
  if (s.includes('booking'))     return 'booking';
  if (s.includes('vrbo'))        return 'vrbo';
  if (s.includes('homeaway'))    return 'homeaway';
  if (s.includes('expedia'))     return 'expedia';
  if (s.includes('wotif'))       return 'wotif';
  if (s.includes('google'))      return 'google';
  if (s.includes('tripadvisor')) return 'tripadvisor';
  if (s.includes('agoda'))       return 'agoda';
  if (s.includes('whatsapp'))    return 'whatsapp';
  if (s.includes('direct') || s.includes('website') || s.includes('manual')) return 'direct';
  return s;
}

async function getHostawayCreds(orgId: string) {
  const [accountIdRow, apiKeyRow] = await Promise.all([
    prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'HOSTAWAY_ACCOUNT_ID' } } }),
    prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'HOSTAWAY_API_KEY' } } }),
  ]);
  if (!accountIdRow?.value || !apiKeyRow?.value) throw new Error('Hostaway credentials not configured.');
  return { accountId: accountIdRow.value, apiKey: apiKeyRow.value };
}

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
  if (!res.ok) throw new Error(`Hostaway auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// Returns { [listingId]: string[] } — canonical channel keys for each listing
export async function GET(req: NextRequest) {
  try {
    const orgId = new URL(req.url).searchParams.get('orgId') ?? 'default';
    const { accountId, apiKey } = await getHostawayCreds(orgId);
    const token = await getHostawayToken(accountId, apiKey);

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Cache-control': 'no-cache',
    };

    // includeRelations=1 asks Hostaway to embed channelManagers in each listing
    const res = await fetch(`${HOSTAWAY_BASE}/listings?limit=100&includeRelations=1`, { headers });
    if (!res.ok) return NextResponse.json({ error: `Hostaway returned ${res.status}` }, { status: res.status });

    const data = await res.json();
    const listings: Record<string, unknown>[] = data.result ?? [];

    const channelMap: Record<string, string[]> = {};

    for (const listing of listings) {
      const id = String(listing.id);
      const seen = new Set<string>();

      // Try channelManagers array (most complete source)
      const managers = (listing.channelManagers ?? listing.channels ?? []) as Record<string, unknown>[];
      for (const mgr of managers) {
        // Skip disabled channels if flag is present
        if (mgr.isEnabled === false || mgr.enabled === false || mgr.status === 'inactive') continue;

        // Try numeric channelId first
        if (mgr.channelId != null) {
          const mapped = CHANNEL_ID_MAP[Number(mgr.channelId)];
          if (mapped) { seen.add(mapped); continue; }
        }

        // Fall back to string name fields
        const name = String(mgr.channelName ?? mgr.channel ?? mgr.name ?? '');
        if (name) seen.add(normaliseChannelName(name));
      }

      // Fall back to top-level channelName on the listing itself
      if (seen.size === 0 && listing.channelName) {
        seen.add(normaliseChannelName(String(listing.channelName)));
      }

      channelMap[id] = Array.from(seen).filter(Boolean);
    }

    return NextResponse.json({ channels: channelMap });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch channels';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
