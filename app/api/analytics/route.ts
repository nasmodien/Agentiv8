import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') ?? 'default';
    const propertyIds = searchParams.getAll('propertyId');

    let periodStart: Date, periodEnd: Date;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    if (startDateParam && endDateParam) {
      periodStart = new Date(startDateParam);
      periodEnd = new Date(endDateParam);
      periodEnd.setHours(23, 59, 59, 999);
    } else {
      const monthsBack = parseInt(searchParams.get('period') ?? '3', 10);
      periodStart = new Date();
      periodStart.setMonth(periodStart.getMonth() - monthsBack);
      periodEnd = new Date();
    }
    periodStart.setHours(0, 0, 0, 0);

    const propFilter = propertyIds.length > 0 ? { propertyId: { in: propertyIds } } : {};
    const baseWhere = { property: { orgId }, status: { not: 'CANCELLED' as const }, ...propFilter };

    const [bookings, futureBookings, properties] = await Promise.all([
      // Historical bookings in date range
      prisma.booking.findMany({
        where: { ...baseWhere, checkIn: { gte: periodStart, lte: periodEnd } },
        include: { property: { select: { id: true, name: true, unitNumber: true } } },
        orderBy: { checkIn: 'asc' },
      }),
      // Future bookings for forecast
      prisma.booking.findMany({
        where: { ...baseWhere, checkIn: { gt: new Date() }, status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
        include: { property: { select: { id: true, name: true, unitNumber: true } } },
        orderBy: { checkIn: 'asc' },
        take: 200,
      }),
      prisma.property.findMany({
        where: { orgId },
        select: { id: true, name: true, unitNumber: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const nights = (b: { checkIn: Date; checkOut: Date }) =>
      Math.max(Math.round((b.checkOut.getTime() - b.checkIn.getTime()) / 86400000), 1);

    // ── Financial summary ──
    const grossRevenue    = sum(bookings.map(b => b.guestTotal ?? b.totalPrice ?? 0));
    const netRevenue      = sum(bookings.map(b => b.totalPrice ?? 0));
    const cleaningFees    = sum(bookings.map(b => b.cleaningFee ?? 0));
    const otaFees         = sum(bookings.map(b => b.channelCommission ?? 0));
    const taxes           = sum(bookings.map(b => b.taxAmount ?? 0));
    const hostServiceFees = sum(bookings.map(b => b.hostServiceFee ?? 0));
    const totalDeductions = cleaningFees + otaFees + taxes + hostServiceFees;
    const totalNights     = sum(bookings.map(nights));

    const daysInPeriod = Math.max(Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000), 1);
    const propCount = propertyIds.length > 0 ? propertyIds.length : properties.length;
    const availableNights = daysInPeriod * propCount;
    const occupancyRate = availableNights > 0 ? Math.min((totalNights / availableNights) * 100, 100) : 0;
    const adr = totalNights > 0 ? netRevenue / totalNights : 0;
    const revPAR = availableNights > 0 ? netRevenue / availableNights : 0;

    // ── Channel breakdown ──
    const channelMap: Record<string, { count: number; gross: number; net: number }> = {};
    for (const b of bookings) {
      if (!channelMap[b.channel]) channelMap[b.channel] = { count: 0, gross: 0, net: 0 };
      channelMap[b.channel].count++;
      channelMap[b.channel].gross += b.guestTotal ?? b.totalPrice ?? 0;
      channelMap[b.channel].net += b.totalPrice ?? 0;
    }

    // ── Per-property stats ──
    const propMap: Record<string, { name: string; unitNumber: string | null; gross: number; net: number; bookings: number; nights: number; cleaning: number; otaFees: number }> = {};
    for (const b of bookings) {
      const pid = b.property.id;
      if (!propMap[pid]) propMap[pid] = { name: b.property.name, unitNumber: b.property.unitNumber, gross: 0, net: 0, bookings: 0, nights: 0, cleaning: 0, otaFees: 0 };
      propMap[pid].gross += b.guestTotal ?? b.totalPrice ?? 0;
      propMap[pid].net += b.totalPrice ?? 0;
      propMap[pid].bookings++;
      propMap[pid].nights += nights(b);
      propMap[pid].cleaning += b.cleaningFee ?? 0;
      propMap[pid].otaFees += b.channelCommission ?? 0;
    }

    // ── Monthly chart (historical) ──
    const monthlyRevenue = [];
    const cur = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1);
    while (cur <= periodEnd) {
      const y = cur.getFullYear(); const m = cur.getMonth();
      const label = cur.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
      const mb = bookings.filter(b => { const d = new Date(b.checkIn); return d.getFullYear() === y && d.getMonth() === m; });
      monthlyRevenue.push({
        month: label,
        gross: sum(mb.map(b => b.guestTotal ?? b.totalPrice ?? 0)),
        net: sum(mb.map(b => b.totalPrice ?? 0)),
        bookings: mb.length,
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    // ── Forecast (future 6 months) ──
    const forecast = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const y = d.getFullYear(); const m = d.getMonth();
      const label = d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
      const fb = futureBookings.filter(b => { const bd = new Date(b.checkIn); return bd.getFullYear() === y && bd.getMonth() === m; });
      const fn = sum(fb.map(nights));
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const fPropCount = propertyIds.length > 0 ? propertyIds.length : properties.length;
      forecast.push({
        month: label,
        bookings: fb.length,
        nights: fn,
        projectedRevenue: sum(fb.map(b => b.totalPrice ?? 0)),
        projectedGross: sum(fb.map(b => b.guestTotal ?? b.totalPrice ?? 0)),
        occupancy: fPropCount > 0 ? Math.min(Math.round((fn / (daysInMonth * fPropCount)) * 100), 100) : 0,
      });
    }

    return NextResponse.json({
      summary: {
        grossRevenue, netRevenue, cleaningFees, otaFees, taxes, hostServiceFees, totalDeductions,
        totalBookings: bookings.length, totalNights, adr, revPAR,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        avgStayLength: bookings.length > 0 ? Math.round((totalNights / bookings.length) * 10) / 10 : 0,
        hasFinancials: grossRevenue > 0 || netRevenue > 0,
      },
      channels: Object.entries(channelMap).map(([channel, v]) => ({
        channel, count: v.count, gross: v.gross, net: v.net,
        pct: bookings.length > 0 ? Math.round((v.count / bookings.length) * 100) : 0,
      })).sort((a, b) => b.count - a.count),
      propertyStats: Object.entries(propMap).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.net - a.net),
      monthlyRevenue,
      forecast,
      properties,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
