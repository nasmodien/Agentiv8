import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [properties, bookings, conversations, messages] = await Promise.all([
      prisma.property.count(),
      prisma.booking.count(),
      prisma.conversation.count(),
      prisma.message.count(),
    ]);
    return NextResponse.json({ properties, bookings, conversations, messages });
  } catch {
    return NextResponse.json({ properties: 0, bookings: 0, conversations: 0, messages: 0 });
  }
}
