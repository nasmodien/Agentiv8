import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const category = searchParams.get('category');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    const services = await prisma.conciergeService.findMany({
      where: {
        orgId,
        enabled: true,
        ...(category && category !== 'all' ? { category } : {}),
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Concierge GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, name, description, emoji, price, commission, category } = body;

    if (!orgId || !name || !price) {
      return NextResponse.json({ error: 'orgId, name, and price are required' }, { status: 400 });
    }

    const service = await prisma.conciergeService.create({
      data: {
        orgId,
        name,
        description,
        emoji,
        price: parseFloat(price),
        commission: parseFloat(commission ?? 0),
        category: category ?? 'General',
        enabled: true,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('Concierge POST error:', error);
    return NextResponse.json({ error: 'Failed to create service' }, { status: 500 });
  }
}
