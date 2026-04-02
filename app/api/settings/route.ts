import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Keys that are safe to return to the client (non-sensitive)
const PUBLIC_KEYS = ['HOSTAWAY_ACCOUNT_ID', 'ESCALATION_EMAIL', 'SMS_NUMBER', 'PINECONE_INDEX'];

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

    const settings = await prisma.setting.findMany({ where: { orgId } });

    // Return masked values for sensitive keys
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = maskValue(s.key, s.value);
    }

    return NextResponse.json({ settings: result });
  } catch {
    return NextResponse.json({ settings: {} });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId = 'default', settings } = body as {
      orgId?: string;
      settings: Record<string, string>;
    };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'settings object required' }, { status: 400 });
    }

    // Save each key-value pair using upsert
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
