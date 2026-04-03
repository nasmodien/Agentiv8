import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock data fallback
const mockConversations = [
  {
    id: 'mock-1',
    channel: 'AIRBNB',
    status: 'AI_HANDLED',
    lastMessageAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    booking: {
      guestName: 'Sarah Mitchell',
      guestEmail: 'sarah@example.com',
      checkIn: new Date().toISOString(),
      checkOut: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      adults: 2,
    },
    property: { name: 'Unit 5 – Ocean Vista Rentals' },
    messages: [
      { id: 'm1', role: 'GUEST', content: "Hi, what's the WiFi password?", createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
      { id: 'm2', role: 'AI', content: 'Hi Sarah! The WiFi network is OceanViewGuest and the password is sunset2026. Let me know if you need anything else!', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: 'mock-2',
    channel: 'BOOKING_COM',
    status: 'ESCALATED',
    lastMessageAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    booking: {
      guestName: 'Tom & Lisa',
      guestEmail: 'tom@example.com',
      checkIn: new Date().toISOString(),
      checkOut: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      adults: 2,
    },
    property: { name: 'Unit 8 – Ocean Vista Rentals' },
    messages: [
      { id: 'm3', role: 'GUEST', content: 'Can we get a late checkout until 2pm?', createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString() },
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor'); // lastMessageAt ISO for pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);
    const search = searchParams.get('search') ?? '';
    const propertyId = searchParams.get('propertyId');
    const status = searchParams.get('status');

    const conversations = await prisma.conversation.findMany({
      where: {
        ...(propertyId ? { propertyId } : {}),
        ...(status ? { status: status as 'AI_HANDLED' | 'NEEDS_REVIEW' | 'ESCALATED' | 'RESOLVED' } : {}),
        ...(cursor ? { lastMessageAt: { lt: new Date(cursor) } } : {}),
        ...(search ? {
          OR: [
            { booking: { guestName: { contains: search, mode: 'insensitive' } } },
            { messages: { some: { content: { contains: search, mode: 'insensitive' } } } },
          ],
        } : {}),
      },
      include: {
        booking: true,
        property: true,
        messages: { orderBy: { createdAt: 'asc' }, take: 100 },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
    });

    if (conversations.length === 0 && !cursor && !search && !propertyId) {
      return NextResponse.json({ conversations: mockConversations, source: 'mock', hasMore: false });
    }

    return NextResponse.json({
      conversations,
      source: 'db',
      hasMore: conversations.length === limit,
      nextCursor: conversations.length > 0 ? conversations[conversations.length - 1].lastMessageAt.toISOString() : null,
    });
  } catch (error) {
    console.error('GET /api/messages error:', error);
    return NextResponse.json({ conversations: mockConversations, source: 'mock', hasMore: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, content, role = 'HUMAN' } = body;

    if (!conversationId || !content) {
      return NextResponse.json({ error: 'conversationId and content are required' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        role,
        content,
      },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Trigger AI response if message is from guest
    if (role === 'GUEST') {
      // Fire and forget – response will be streamed separately
      const origin = request.headers.get('origin') ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
      fetch(`${origin}/api/ai/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, guestMessage: content }),
      }).catch(console.error);
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('POST /api/messages error:', error);
    return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
  }
}
