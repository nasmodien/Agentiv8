import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface AIRespondRequest {
  conversationId: string;
  guestMessage: string;
  propertyId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: AIRespondRequest = await req.json();
    const { conversationId, guestMessage } = body;

    if (!conversationId || !guestMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch conversation + property context
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        property: true,
        booking: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Fetch knowledge base for context
    const knowledgeItems = await prisma.knowledgeItem.findMany({
      where: {
        orgId: conversation.property?.orgId ?? '',
        enabled: true,
      },
      take: 20,
    });

    const propertyContext = conversation.property
      ? `Property: ${conversation.property.name}
Unit: ${conversation.property.unitNumber ?? 'N/A'}
WiFi Network: ${conversation.property.wifiNetwork ?? 'N/A'}
WiFi Password: ${conversation.property.wifiPassword ?? 'N/A'}
Parking: Spot ${conversation.property.parkingSpot ?? 'N/A'}, Code: ${conversation.property.parkingCode ?? 'N/A'}
Check-in Time: ${conversation.property.checkInTime ?? '15:00'}
Check-out Time: ${conversation.property.checkOutTime ?? '11:00'}`
      : '';

    const kbContext = knowledgeItems
      .map((item) => `[${item.category}] ${item.title}: ${item.content ?? ''}`)
      .join('\n');

    const guestContext = conversation.booking
      ? `Guest: ${conversation.booking.guestName}
Check-in: ${conversation.booking.checkIn.toLocaleDateString()}
Check-out: ${conversation.booking.checkOut.toLocaleDateString()}
Adults: ${conversation.booking.adults}`
      : '';

    // Build message history
    const history = conversation.messages
      .reverse()
      .map((m) => ({
        role: m.role === 'GUEST' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }))
      .slice(-8);

    const systemPrompt = `You are a professional AI concierge assistant for a short-term rental property management company.
You respond to guest messages helpfully, warmly, and concisely.

${propertyContext}

${guestContext}

Knowledge Base:
${kbContext}

Rules:
- Be friendly, professional, and concise (2–4 sentences max)
- Use the property details above to answer specific questions
- If you are not confident (less than 70% sure), say "I'll connect you with our team shortly" and set needs_escalation to true
- Never make up information you don't have
- For late checkout requests, mention the fee (typically R500-R800 for 2 extra hours) and say you'll send a payment link
- Respond in the same language as the guest

Return a JSON object: { "reply": "<your reply>", "needs_escalation": false, "confidence": 0.95 }`;

    const messages = [
      ...history,
      { role: 'user' as const, content: guestMessage },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: systemPrompt,
      messages,
    });

    let reply = '';
    let needsEscalation = false;
    let confidence = 0.9;

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      const parsed = JSON.parse(rawText);
      reply = parsed.reply ?? rawText;
      needsEscalation = parsed.needs_escalation ?? false;
      confidence = parsed.confidence ?? 0.9;
    } catch {
      reply = rawText;
    }

    // Save AI message to DB
    await prisma.message.create({
      data: {
        conversationId,
        role: 'AI',
        content: reply,
      },
    });

    // Update conversation status
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        status: needsEscalation ? 'NEEDS_REVIEW' : 'AI_HANDLED',
        lastMessageAt: new Date(),
      },
    });

    return NextResponse.json({ reply, needsEscalation, confidence });
  } catch (error) {
    console.error('AI respond error:', error);
    return NextResponse.json({ error: 'AI response failed' }, { status: 500 });
  }
}
