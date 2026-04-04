import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1';

async function getHostawayCreds(orgId: string) {
  const [accountIdRow, apiKeyRow] = await Promise.all([
    prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'HOSTAWAY_ACCOUNT_ID' } } }),
    prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'HOSTAWAY_API_KEY' } } }),
  ]);
  if (!accountIdRow?.value || !apiKeyRow?.value) {
    throw new Error('Hostaway credentials not configured.');
  }
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

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = new URL(req.url).searchParams.get('orgId') ?? 'default';
    const { id } = params;

    const { accountId, apiKey } = await getHostawayCreds(orgId);
    const token = await getHostawayToken(accountId, apiKey);

    const res = await fetch(`${HOSTAWAY_BASE}/listings/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-control': 'no-cache',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Hostaway returned ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ listing: data.result ?? data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch listing';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
