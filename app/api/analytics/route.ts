import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') ?? 'default';
    const propertyIds = searchParams.getAll('propertyId');
    const period = searchParams.get('period') ?? '12';

    const monthsBack = parseInt(period, 10);
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - monthsBack);
    periodStart.setDate(1);
    periodStart.setHours(0, 0, 0, 0);

    const bookingWhere = {
      property: { orgId },
      status: { not: 'CANCELLED' as const },
      checkIn: { gte: periodStart },
      ...(propertyIds.length > 0 ? { propertyId: { in: propertyIds } } : {}),
    };

    const [bookings, properties] = await Promise.all([
      prisma.booking.findMany({
        where: bookingWhere,
        include: { property: { select: { id: true, name: true, unitNumber: true } } },
        orderBy: { checkIn: 'asc' },
      }),
      prisma.property.findMany({
        where: { orgId },
        select: { id: true, name: true, unitNumber: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const totalRevenue = bookings.reduce((s, b) => s + (b.totalPrice ?? 0), 0);
    const totalNights = bookings.reduce((s, b) => {
      return s + Math.max(Math.round((b.checkOut.getTime() - b.checkIn.getTime()) / 86400000), 1);
    }, 0);
    const avgDailyRate = totalNights > 0 ? totalRevenue / totalNights : 0;

    const today = new Date();
    const daysInPeriod = Math.round((today.getTime() - periodStart.getTime()) / 86400000);
    const propCount = propertyIds.length > 0 ? propertyIds.length : properties.length;
    const availableNights = daysInPeriod * propCount;
    const occupancyRate = availableNights > 0 ? Math.min((totalNights / availableNights) * 100, 100) : 0;

    const channelMap: Record<string, { count: number; revenue: number }> = {};
    for (const b of bookings) {
      if (!channelMap[b.channel]) channelMap[b.channel] = { count: 0, revenue: 0 };
      channelMap[b.channel].count++;
      channelMap[b.channel].revenue += b.totalPrice ?? 0;
    }

    const propertyMap: Record<string, { name: string; unitNumber: string | null; revenue: number; bookings: number; nights: number }> = {};
    for (const b of bookings) {
      const pid = b.property.id;
      if (!propertyMap[pid]) propertyMap[pid] = { name: b.property.name, unitNumber: b.property.unitNumber, revenue: 0, bookings: 0, nights: 0 };
      propertyMap[pid].revenue += b.totalPrice ?? 0;
      propertyMap[pid].bookings++;
      propertyMap[pid].nights += Math.max(Math.round((b.checkOut.getTime() - b.checkIn.getTime()) / 86400000), 1);
    }

    const monthlyRevenue = [];
    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const y = d.getFullYear();
      const m = d.getMonth();
      const label = d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
      const mb = bookings.filter(b => { const bd = new Date(b.checkIn); return bd.getFullYear() === y && bd.getMonth() === m; });
      monthlyRevenue.push({ month: label, revenue: mb.reduce((s, b) => s + (b.totalPrice ?? 0), 0), bookings: mb.length });
    }

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalBookings: bookings.length,
        totalNights,
        avgDailyRate,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        avgStayLength: bookings.length > 0 ? Math.round((totalNights / bookings.length) * 10) / 10 : 0,
      },
      channels: Object.entries(channelMap).map(([channel, v]) => ({
        channel, count: v.count, revenue: v.revenue,
        pct: bookings.length > 0 ? Math.round((v.count / bookings.length) * 100) : 0,
      })).sort((a, b) => b.count - a.count),
      propertyStats: Object.entries(propertyMap).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.revenue - a.revenue),
      monthlyRevenue,
      properties,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
