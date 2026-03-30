import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Hostaway webhook handler — receives new guest messages
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-hostaway-signature');

    // Verify webhook signature in production
    const webhookSecret = process.env.HOSTAWAY_WEBHOOK_SECRET;
    if (webhookSecret && signature !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = await req.json();
    const { event, data } = payload;

    if (event === 'message.received') {
      const {
        guestName,
        guestEmail,
        guestPhone,
        channel,
        message: messageContent,
        propertyId: externalPropertyId,
      } = data;

      // Find or create property
      let property = await prisma.property.findFirst({
        where: { name: { contains: externalPropertyId?.toString() } },
      });

      if (!property) {
        // Create a default org + property if none exists
        const org = await prisma.organization.findFirst();
        if (org) {
          property = await prisma.property.create({
            data: {
              orgId: org.id,
              name: `Unit ${externalPropertyId}`,
              unitNumber: externalPropertyId?.toString(),
            },
          });
        }
      }

      // Find or create booking
      let booking = await prisma.booking.findFirst({
        where: {
          guestEmail: guestEmail,
          propertyId: property?.id,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      });

      if (!booking && property) {
        booking = await prisma.booking.create({
          data: {
            propertyId: property.id,
            guestName: guestName ?? 'Unknown Guest',
            guestEmail: guestEmail,
            guestPhone: guestPhone,
            channel: mapChannel(channel),
            checkIn: new Date(),
            checkOut: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            status: 'CONFIRMED',
          },
        });
      }

      // Find or create conversation
      let conversation = await prisma.conversation.findFirst({
        where: { bookingId: booking?.id },
        orderBy: { createdAt: 'desc' },
      });

      if (!conversation && booking) {
        conversation = await prisma.conversation.create({
          data: {
            bookingId: booking.id,
            propertyId: property?.id,
            channel: channel ?? 'DIRECT',
            status: 'NEEDS_REVIEW',
          },
        });
      }

      if (conversation) {
        // Save guest message
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'GUEST',
            content: messageContent,
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        });

        // Trigger AI auto-response (fire-and-forget)
        if (process.env.NEXT_PUBLIC_APP_URL) {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: conversation.id,
              guestMessage: messageContent,
              propertyId: property?.id,
            }),
          }).catch(console.error);
        }
      }
    }

    if (event === 'reservation.created' || event === 'reservation.updated') {
      const {
        id: reservationId,
        guestName,
        guestEmail,
        guestPhone,
        channel,
        arrivalDate,
        departureDate,
        adults,
        propertyId: externalPropertyId,
      } = data;

      const property = await prisma.property.findFirst({
        where: { name: { contains: externalPropertyId?.toString() } },
      });

      if (property) {
        await prisma.booking.upsert({
          where: { id: reservationId ?? '' },
          create: {
            id: reservationId,
            propertyId: property.id,
            guestName: guestName ?? 'Unknown',
            guestEmail,
            guestPhone,
            channel: mapChannel(channel),
            checkIn: new Date(arrivalDate),
            checkOut: new Date(departureDate),
            adults: adults ?? 1,
            status: 'CONFIRMED',
          },
          update: {
            guestName: guestName ?? 'Unknown',
            checkIn: new Date(arrivalDate),
            checkOut: new Date(departureDate),
            adults: adults ?? 1,
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Hostaway webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

function mapChannel(channel: string): 'AIRBNB' | 'BOOKING_COM' | 'DIRECT' | 'WHATSAPP' | 'SMS' {
  const map: Record<string, 'AIRBNB' | 'BOOKING_COM' | 'DIRECT' | 'WHATSAPP' | 'SMS'> = {
    airbnb: 'AIRBNB',
    'booking.com': 'BOOKING_COM',
    bookingcom: 'BOOKING_COM',
    whatsapp: 'WHATSAPP',
    sms: 'SMS',
    direct: 'DIRECT',
  };
  return map[channel?.toLowerCase()] ?? 'DIRECT';
}
