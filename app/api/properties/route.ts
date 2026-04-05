import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    // Fetch properties first (never fails), then try to include bookings separately
    const properties = await prisma.property.findMany({
      where: { orgId },
      orderBy: { name: 'asc' },
    });

    // Try to include booking counts — may fail if DB schema is out of sync
    let enriched: unknown[] = properties;
    try {
      enriched = await prisma.property.findMany({
        where: { orgId },
        include: {
          bookings: {
            // Fetch enough bookings to capture all distinct channels + current guest
            orderBy: { checkIn: 'desc' },
            take: 100,
            select: { id: true, guestName: true, checkIn: true, checkOut: true, status: true, channel: true },
          },
          _count: { select: { bookings: true, conversations: true } },
        },
        orderBy: { name: 'asc' },
      });
    } catch { /* ignore — DB migration pending */ }

    return NextResponse.json({ properties: enriched });
  } catch (error) {
    console.error('Properties GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, name, unitNumber, address, wifiNetwork, wifiPassword, parkingSpot, parkingCode, checkInTime, checkOutTime } = body;

    if (!orgId || !name) {
      return NextResponse.json({ error: 'orgId and name are required' }, { status: 400 });
    }

    const property = await prisma.property.create({
      data: {
        orgId,
        name,
        unitNumber,
        address,
        wifiNetwork,
        wifiPassword,
        parkingSpot,
        parkingCode,
        checkInTime: checkInTime ?? '15:00',
        checkOutTime: checkOutTime ?? '11:00',
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error('Properties POST error:', error);
    return NextResponse.json({ error: 'Failed to create property' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const property = await prisma.property.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({ property });
  } catch (error) {
    console.error('Properties PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update property' }, { status: 500 });
  }
}
