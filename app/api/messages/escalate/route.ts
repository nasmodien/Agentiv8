import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, reason } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'ESCALATED' },
    });

    if (reason) {
      await prisma.message.create({
        data: {
          conversationId,
          role: 'AI',
          content: `[Escalated to human agent: ${reason}]`,
        },
      });
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Escalate error:', error);
    return NextResponse.json({ error: 'Failed to escalate' }, { status: 500 });
  }
}
