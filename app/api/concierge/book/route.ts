import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceId, bookingId, guestName } = body;

    if (!serviceId || !bookingId) {
      return NextResponse.json({ error: 'serviceId and bookingId are required' }, { status: 400 });
    }

    const service = await prisma.conciergeService.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const conciergeBooking = await prisma.conciergeBooking.create({
      data: {
        serviceId,
        bookingId,
        amount: service.price,
        status: 'PENDING',
      },
    });

    // In production: generate Stripe/Yoco/PayFast payment link here
    const paymentLink = `https://pay.agentiv8.com/checkout/${conciergeBooking.id}`;

    return NextResponse.json({
      booking: conciergeBooking,
      paymentLink,
      message: `${service.name} booked for ${guestName ?? 'guest'}. Payment link: ${paymentLink}`,
    }, { status: 201 });
  } catch (error) {
    console.error('Concierge book error:', error);
    return NextResponse.json({ error: 'Booking failed' }, { status: 500 });
  }
}
