import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1';

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

// Returns { [listingId]: string[] } — the channel names each listing is connected to
export async function GET(req: NextRequest) {
  try {
    const orgId = new URL(req.url).searchParams.get('orgId') ?? 'default';
    const { accountId, apiKey } = await getHostawayCreds(orgId);
    const token = await getHostawayToken(accountId, apiKey);

    const res = await fetch(`${HOSTAWAY_BASE}/listings?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-control': 'no-cache',
      },
    });

    if (!res.ok) return NextResponse.json({ error: `Hostaway returned ${res.status}` }, { status: res.status });

    const data = await res.json();
    const listings: Record<string, unknown>[] = data.result ?? [];

    // Build a map of listingId -> channel names
    const channelMap: Record<string, string[]> = {};

    for (const listing of listings) {
      const id = String(listing.id);
      const channels: string[] = [];

      // Hostaway returns channelManagers as an array of { channelId, channelName, isEnabled, ... }
      const managers = (listing.channelManagers ?? listing.channels ?? []) as Record<string, unknown>[];
      for (const mgr of managers) {
        const name = (mgr.channelName ?? mgr.channel ?? mgr.name ?? '') as string;
        if (name) channels.push(name.toLowerCase());
      }

      // Also check top-level channelName (some endpoints include it)
      if (channels.length === 0 && listing.channelName) {
        channels.push(String(listing.channelName).toLowerCase());
      }

      channelMap[id] = channels;
    }

    return NextResponse.json({ channels: channelMap });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch channels';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
