import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const orgId = searchParams.get('orgId') ?? 'default';
  const status = searchParams.get('status');
  const propertyId = searchParams.get('propertyId');

  try {
    const tasks = await prisma.cleaningTask.findMany({
      where: {
        property: { orgId },
        ...(status && status !== 'all' ? { status: status as never } : {}),
        ...(propertyId ? { propertyId } : {}),
      },
      include: {
        property: { select: { id: true, name: true, unitNumber: true } },
        cleaner: { select: { id: true, name: true, phone: true } },
        booking: { select: { id: true, guestName: true, checkIn: true, checkOut: true } },
        checklistItems: { orderBy: { order: 'asc' } },
      },
      orderBy: { scheduledAt: 'asc' },
    });
    return NextResponse.json({ tasks });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      propertyId, cleanerId, bookingId, scheduledAt,
      priority = 'NORMAL', notes, payAmount, checklistItems = [],
    } = body;

    const task = await prisma.cleaningTask.create({
      data: {
        propertyId,
        cleanerId: cleanerId || null,
        bookingId: bookingId || null,
        scheduledAt: new Date(scheduledAt),
        priority,
        notes: notes || null,
        payAmount: payAmount ? Number(payAmount) : null,
        checklistItems: {
          create: (checklistItems as string[]).map((label: string, i: number) => ({
            label,
            order: i,
          })),
        },
      },
      include: {
        property: { select: { id: true, name: true, unitNumber: true } },
        cleaner: { select: { id: true, name: true } },
        checklistItems: { orderBy: { order: 'asc' } },
      },
    });
    return NextResponse.json({ task });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
