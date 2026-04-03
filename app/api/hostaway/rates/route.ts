import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1';

async function getToken(orgId: string): Promise<string | null> {
  try {
    const [accSetting, keySetting] = await Promise.all([
      prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'HOSTAWAY_ACCOUNT_ID' } } }),
      prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'HOSTAWAY_API_KEY' } } }),
    ]);
    if (!accSetting || !keySetting) return null;
    const res = await fetch(`${HOSTAWAY_BASE}/accessTokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: accSetting.value,
        client_secret: keySetting.value,
        scope: 'general',
      }),
    });
    const data = await res.json();
    return data.access_token ?? null;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') ?? 'default';
    const propertyId = searchParams.get('propertyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!propertyId || !startDate || !endDate) {
      return NextResponse.json({ error: 'propertyId, startDate, endDate required' }, { status: 400 });
    }

    const token = await getToken(orgId);
    if (!token) return NextResponse.json({ rates: [] });

    const res = await fetch(
      `${HOSTAWAY_BASE}/listings/${propertyId}/calendar?startDate=${startDate}&endDate=${endDate}`,
      { headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' } }
    );
    if (!res.ok) return NextResponse.json({ rates: [] });

    const data = await res.json();
    const rates = (data.result ?? []).map((r: Record<string, unknown>) => ({
      date: r.date,
      price: r.price,
      isAvailable: r.isAvailable ?? r.status === 'available',
      minimumStay: r.minimumStay,
    }));

    return NextResponse.json({ rates });
  } catch (error) {
    console.error('Rates fetch error:', error);
    return NextResponse.json({ rates: [] });
  }
}
