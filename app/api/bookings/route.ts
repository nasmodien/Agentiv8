import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') ?? 'default';

    const bookings = await prisma.booking.findMany({
      where: {
        property: { orgId },
      },
      include: {
        property: { select: { id: true, name: true, unitNumber: true } },
      },
      orderBy: { checkIn: 'asc' },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('GET /api/bookings error:', error);
    return NextResponse.json({ bookings: [] });
  }
}
