import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const orgId = body.orgId ?? 'default';
    // How many days ahead to schedule (default 90)
    const daysAhead = body.daysAhead ?? 90;

    const from = new Date();
    from.setDate(from.getDate() - 1); // include yesterday's checkouts
    const to = new Date();
    to.setDate(to.getDate() + daysAhead);

    // Get all non-cancelled bookings in window
    const bookings = await prisma.booking.findMany({
      where: {
        property: { orgId },
        status: { not: 'CANCELLED' },
        checkOut: { gte: from, lte: to },
      },
      include: {
        property: {
          include: {
            cleanerAssignments: {
              include: { cleaner: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { checkOut: 'asc' },
    });

    // Get existing cleaning tasks in window (to avoid duplicates)
    const existingTasks = await prisma.cleaningTask.findMany({
      where: {
        property: { orgId },
        scheduledAt: { gte: from, lte: to },
        status: { not: 'CANCELLED' },
      },
      select: { propertyId: true, scheduledAt: true, bookingId: true },
    });

    const existingKeys = new Set(
      existingTasks.map(t => `${t.propertyId}__${new Date(t.scheduledAt).toDateString()}`)
    );
    const existingBookingIds = new Set(
      existingTasks.map(t => t.bookingId).filter(Boolean)
    );

    let created = 0;
    let skipped = 0;
    const createdTasks = [];

    for (const booking of bookings) {
      // Skip if task already exists for this booking
      if (existingBookingIds.has(booking.id)) { skipped++; continue; }

      const checkOutDate = new Date(booking.checkOut);
      checkOutDate.setHours(10, 0, 0, 0); // Default clean at 10am on checkout day

      const key = `${booking.propertyId}__${checkOutDate.toDateString()}`;
      if (existingKeys.has(key)) { skipped++; continue; }

      // Find default cleaner for this property
      const defaultCleaner = booking.property.cleanerAssignments[0]?.cleaner ?? null;

      const task = await prisma.cleaningTask.create({
        data: {
          propertyId: booking.propertyId,
          bookingId: booking.id,
          cleanerId: defaultCleaner?.id ?? null,
          scheduledAt: checkOutDate,
          status: 'PENDING',
          priority: 'NORMAL',
          notes: `Auto-scheduled: ${booking.guestName} checks out`,
          payAmount: defaultCleaner?.payRate ?? null,
        },
        include: {
          property: { select: { id: true, name: true, unitNumber: true } },
          cleaner: { select: { id: true, name: true } },
          booking: { select: { id: true, guestName: true, checkIn: true, checkOut: true } },
          checklistItems: true,
        },
      });

      existingKeys.add(key);
      createdTasks.push(task);
      created++;
    }

    return NextResponse.json({ created, skipped, tasks: createdTasks });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
