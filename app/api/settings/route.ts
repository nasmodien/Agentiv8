import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') ?? 'default';
    const key = searchParams.get('key');

    if (!key) {
      const settings = await prisma.setting.findMany({ where: { orgId } });
      return NextResponse.json({ settings });
    }

    const setting = await prisma.setting.findUnique({ where: { orgId_key: { orgId, key } } });
    return NextResponse.json({ value: setting?.value ?? null });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ value: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { orgId = 'default', key, value } = await req.json();
    if (!key || value == null) {
      return NextResponse.json({ error: 'key and value required' }, { status: 400 });
    }

    // Ensure org exists
    await prisma.organization.upsert({
      where: { slug: orgId },
      create: { id: orgId, name: 'My Properties', slug: orgId },
      update: {},
    });

    const setting = await prisma.setting.upsert({
      where: { orgId_key: { orgId, key } },
      create: { orgId, key, value: String(value) },
      update: { value: String(value) },
    });

    return NextResponse.json({ setting });
  } catch (error) {
    console.error('POST /api/settings error:', error);
    return NextResponse.json({ error: 'Failed to save setting' }, { status: 500 });
  }
}
