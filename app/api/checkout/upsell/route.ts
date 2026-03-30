import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Late checkout upsell – generate payment link and send message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, bookingId, checkoutTime, fee } = body;

    if (!conversationId || !bookingId) {
      return NextResponse.json({ error: 'conversationId and bookingId required' }, { status: 400 });
    }

    const upsellFee = fee ?? 650; // default R650
    const lateTime = checkoutTime ?? '14:00';

    // In production: create Stripe / PayFast / Yoco checkout session
    const paymentLinkId = `lco-${bookingId}-${Date.now()}`;
    const paymentLink = `https://pay.agentiv8.com/late-checkout/${paymentLinkId}?amount=${upsellFee}`;

    const upsellMessage =
      `Great news! We can offer a late checkout until ${lateTime} for just R${upsellFee}. ` +
      `To confirm, simply complete your payment here: ${paymentLink} ` +
      `Once payment is received, we'll extend your checkout automatically. 🏡`;

    // Save the AI upsell message
    await prisma.message.create({
      data: {
        conversationId,
        role: 'AI',
        content: upsellMessage,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), status: 'AI_HANDLED' },
    });

    return NextResponse.json({
      paymentLink,
      message: upsellMessage,
      fee: upsellFee,
      time: lateTime,
    });
  } catch (error) {
    console.error('Late checkout upsell error:', error);
    return NextResponse.json({ error: 'Failed to generate upsell' }, { status: 500 });
  }
}
