import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Keys that are safe to return to the client (non-sensitive)
const PUBLIC_KEYS = ['HOSTAWAY_ACCOUNT_ID', 'ESCALATION_EMAIL', 'SMS_NUMBER', 'PINECONE_INDEX', 'AI_CONFIDENCE_THRESHOLD', 'HOST_SERVICE_FEE_PCT'];

// Mask sensitive values for display
function maskValue(key: string, value: string): string {
  if (PUBLIC_KEYS.includes(key)) return value;
  if (value.length <= 8) return '••••••••';
  return value.slice(0, 4) + '•'.repeat(Math.min(value.length - 4, 40));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') ?? 'default';
    const key = searchParams.get('key');

    // Single-key lookup (used by RevenueSettings for HOST_SERVICE_FEE_PCT)
    if (key) {
      const setting = await prisma.setting.findUnique({ where: { orgId_key: { orgId, key } } });
      return NextResponse.json({ value: setting?.value ?? null });
    }

    // All settings (masked for display)
    const settings = await prisma.setting.findMany({ where: { orgId } });
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = maskValue(s.key, s.value);
    }
    return NextResponse.json({ settings: result });
  } catch {
    return NextResponse.json({ settings: {}, value: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const orgId = body.orgId ?? 'default';

    // Ensure org exists
    await prisma.organization.upsert({
      where: { slug: orgId },
      create: { id: orgId, name: 'My Properties', slug: orgId },
      update: {},
    });

    // Single key/value (used by RevenueSettings slider)
    if (body.key != null) {
      const setting = await prisma.setting.upsert({
        where: { orgId_key: { orgId, key: body.key } },
        create: { orgId, key: body.key, value: String(body.value) },
        update: { value: String(body.value) },
      });
      return NextResponse.json({ success: true, setting });
    }

    // Bulk settings object (used by section saves)
    const { settings } = body as { settings: Record<string, string> };
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'key+value or settings object required' }, { status: 400 });
    }

    const ops = Object.entries(settings)
      .filter(([, v]) => v && !v.includes('•')) // skip masked/empty values
      .map(([key, value]) =>
        prisma.setting.upsert({
          where: { orgId_key: { orgId, key } },
          create: { orgId, key, value },
          update: { value },
        })
      );

    await Promise.all(ops);
    return NextResponse.json({ success: true, saved: ops.length });
  } catch (error) {
    console.error('Settings POST error:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
