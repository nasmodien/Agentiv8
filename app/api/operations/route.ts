import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const [checkIns, cleaningTasks, maintenanceIssues] = await Promise.all([
      prisma.booking.findMany({
        where: {
          property: { orgId },
          checkIn: { gte: today, lt: dayAfter },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
        include: { property: true },
        orderBy: { checkIn: 'asc' },
      }),

      prisma.cleaningTask.findMany({
        where: {
          property: { orgId },
          scheduledAt: { gte: today, lt: dayAfter },
        },
        include: { property: true },
        orderBy: { scheduledAt: 'asc' },
      }),

      prisma.maintenanceIssue.findMany({
        where: {
          property: { orgId },
          status: { not: 'RESOLVED' },
        },
        include: { property: true },
        orderBy: { reportedAt: 'desc' },
      }),
    ]);

    const overdueCount = await prisma.cleaningTask.count({
      where: {
        property: { orgId },
        scheduledAt: { lt: today },
        status: { not: 'COMPLETED' },
      },
    });

    return NextResponse.json({
      checkIns,
      cleaningTasks,
      maintenanceIssues,
      stats: {
        checkInsToday: checkIns.length,
        cleaningTasks: cleaningTasks.length,
        maintenanceIssues: maintenanceIssues.length,
        overdueTasks: overdueCount,
      },
    });
  } catch (error) {
    console.error('Operations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch operations data' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, status } = body;

    if (!type || !id || !status) {
      return NextResponse.json({ error: 'type, id, and status are required' }, { status: 400 });
    }

    if (type === 'cleaning') {
      const task = await prisma.cleaningTask.update({
        where: { id },
        data: { status },
      });
      return NextResponse.json({ task });
    }

    if (type === 'maintenance') {
      const issue = await prisma.maintenanceIssue.update({
        where: { id },
        data: { status },
      });
      return NextResponse.json({ issue });
    }

    if (type === 'booking') {
      const booking = await prisma.booking.update({
        where: { id },
        data: { status },
      });
      return NextResponse.json({ booking });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Operations PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
