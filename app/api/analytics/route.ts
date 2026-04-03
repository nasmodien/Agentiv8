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

    // Load host service fee % from settings (management fee applied to channel payout)
    const hostServiceFeeSetting = await prisma.setting.findUnique({
      where: { orgId_key: { orgId, key: 'HOST_SERVICE_FEE_PCT' } },
    });
    const hostServiceFeePct = hostServiceFeeSetting ? parseFloat(hostServiceFeeSetting.value) / 100 : 0.03;

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
    // Use stored channelCommission for OTA fees (most accurate — directly from Hostaway)
    // Derive gross: totalPrice (host payout) + channelCommission (OTA cut)
    const bkgOtaFee = (b: typeof bookings[0]) => b.channelCommission ?? 0;
    const storedCommissions = sum(bookings.map(bkgOtaFee));
    // Channel Payout: what host receives from channel (after OTA fees)
    const channelPayout  = sum(bookings.map(b => b.totalPrice ?? 0));
    // Gross Revenue: guestTotal if available, else derive from payout + commission
    const grossRevenue   = sum(bookings.map(b =>
      b.guestTotal ?? ((b.totalPrice ?? 0) + bkgOtaFee(b))
    ));
    // OTA Fees: stored commission is most accurate; fall back to derived
    const otaFees        = storedCommissions > 0 ? storedCommissions : grossRevenue - channelPayout;
    // Management Fee: applied to channel payout
    const managementFees = channelPayout * hostServiceFeePct;
    // Net Revenue: final owner income
    const netRevenue     = channelPayout - managementFees;
    // Total deductions
    const totalDeductions = otaFees + managementFees;
    // Cleaning fees (informational)
    const cleaningFees   = sum(bookings.map(b => b.cleaningFee ?? 0));

    const totalNights    = sum(bookings.map(nights));

    const daysInPeriod = Math.max(Math.round((periodEnd.getTime() - periodStart.getTime()) / 86400000), 1);
    const propCount = propertyIds.length > 0 ? propertyIds.length : properties.length;
    const availableNights = daysInPeriod * propCount;
    const occupancyRate = availableNights > 0 ? Math.min((totalNights / availableNights) * 100, 100) : 0;
    const adr = totalNights > 0 ? channelPayout / totalNights : 0;
    const revPAR = availableNights > 0 ? channelPayout / availableNights : 0;

    // ── Channel breakdown ──
    const channelMap: Record<string, { count: number; gross: number; channelPayout: number; otaFees: number; managementFee: number; net: number }> = {};
    for (const b of bookings) {
      if (!channelMap[b.channel]) channelMap[b.channel] = { count: 0, gross: 0, channelPayout: 0, otaFees: 0, managementFee: 0, net: 0 };
      channelMap[b.channel].count++;
      const cp = b.totalPrice ?? 0;
      const ota = bkgOtaFee(b) > 0 ? bkgOtaFee(b) : Math.max(0, (b.guestTotal ?? cp) - cp);
      const gross = b.guestTotal ?? cp + ota;
      const mgmt = cp * hostServiceFeePct;
      channelMap[b.channel].gross += gross;
      channelMap[b.channel].channelPayout += cp;
      channelMap[b.channel].otaFees += ota;
      channelMap[b.channel].managementFee += mgmt;
      channelMap[b.channel].net += cp - mgmt;
    }

    // ── Per-property stats ──
    const propMap: Record<string, { name: string; unitNumber: string | null; gross: number; channelPayout: number; net: number; managementFee: number; bookings: number; nights: number; cleaning: number; otaFees: number }> = {};
    for (const b of bookings) {
      const pid = b.property.id;
      if (!propMap[pid]) propMap[pid] = { name: b.property.name, unitNumber: b.property.unitNumber, gross: 0, channelPayout: 0, net: 0, managementFee: 0, bookings: 0, nights: 0, cleaning: 0, otaFees: 0 };
      const cp = b.totalPrice ?? 0;
      const ota = bkgOtaFee(b) > 0 ? bkgOtaFee(b) : Math.max(0, (b.guestTotal ?? cp) - cp);
      const gross = b.guestTotal ?? cp + ota;
      const mgmt = cp * hostServiceFeePct;
      propMap[pid].gross += gross;
      propMap[pid].channelPayout += cp;
      propMap[pid].otaFees += ota;
      propMap[pid].managementFee += mgmt;
      propMap[pid].net += cp - mgmt;
      propMap[pid].bookings++;
      propMap[pid].nights += nights(b);
      propMap[pid].cleaning += b.cleaningFee ?? 0;
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
        net: sum(mb.map(b => (b.totalPrice ?? 0) * (1 - hostServiceFeePct))),
        bookings: mb.length,
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    // ── Forecast (future 12 months) ──
    const forecast = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
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
        projectedRevenue: sum(fb.map(b => (b.totalPrice ?? 0) * (1 - hostServiceFeePct))),
        projectedGross: sum(fb.map(b => b.guestTotal ?? b.totalPrice ?? 0)),
        occupancy: fPropCount > 0 ? Math.min(Math.round((fn / (daysInMonth * fPropCount)) * 100), 100) : 0,
      });
    }

    return NextResponse.json({
      summary: {
        grossRevenue, channelPayout, otaFees, managementFees, netRevenue, totalDeductions, cleaningFees,
        totalBookings: bookings.length, totalNights, adr, revPAR,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        avgStayLength: bookings.length > 0 ? Math.round((totalNights / bookings.length) * 10) / 10 : 0,
        hasFinancials: grossRevenue > 0 || channelPayout > 0,
      },
      channels: Object.entries(channelMap).map(([channel, v]) => ({
        channel, count: v.count, gross: v.gross, channelPayout: v.channelPayout,
        otaFees: v.otaFees, managementFee: v.managementFee, net: v.net,
        pct: bookings.length > 0 ? Math.round((v.count / bookings.length) * 100) : 0,
      })).sort((a, b) => b.count - a.count),
      propertyStats: Object.entries(propMap).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.net - a.net),
      monthlyRevenue,
      forecast,
      properties,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    const msg = String(error);
    if (msg.includes('column') || msg.includes('does not exist') || msg.includes('Unknown column')) {
      return NextResponse.json({ error: 'migration_required' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
