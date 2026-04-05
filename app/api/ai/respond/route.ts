import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIClient, DEFAULT_MODEL } from '@/lib/ai-client';
import {
  buildPropertyContext, buildBookingContext, buildKBContext,
  retrieveKnowledge, SYSTEM_INTRO, RESPONSE_FORMAT,
} from '@/lib/ai-context';

const TONE: Record<string, string> = {
  friendly: 'Be warm, approachable, and conversational.',
  neutral: 'Be balanced and straightforward.',
  professional: 'Be formal, precise, and business-like.',
};
const LENGTH: Record<string, string> = {
  concise: 'Keep replies to 1–2 sentences maximum.',
  standard: 'Keep replies to 2–4 sentences.',
  thorough: 'Provide complete, detailed answers.',
};

export async function POST(req: NextRequest) {
  try {
    const { conversationId, guestMessage } = await req.json();

    if (!conversationId || !guestMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        property: true,
        booking: true,
        messages: { orderBy: { createdAt: 'asc' }, take: 12 },
      },
    });
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

    const rawOrgId = conversation.property?.orgId ?? '';
    const orgId = (rawOrgId && rawOrgId !== 'default')
      ? rawOrgId
      : (await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } }))?.id ?? rawOrgId;

    // Load settings
    const settings = await prisma.setting.findMany({ where: { orgId } });
    const S = (key: string) => settings.find(s => s.key === key)?.value ?? '';
    const model = S('AI_MODEL') || DEFAULT_MODEL;
    const tone = S('AI_TONE') || 'friendly';
    const answerLength = S('AI_ANSWER_LENGTH') || 'standard';

    // Retrieve relevant KB items
    const kbItems = await retrieveKnowledge(
      orgId,
      guestMessage,
      conversation.propertyId ?? undefined
    );

    // Build context sections
    const propertyCtx = conversation.property ? buildPropertyContext(conversation.property) : '';
    const bookingCtx = conversation.booking ? buildBookingContext({
      ...conversation.booking,
      status: conversation.booking.status as string,
      channel: conversation.booking.channel as string,
    }) : '';
    const kbCtx = buildKBContext(kbItems);

    const styleInstructions = [
      TONE[tone] ?? TONE.friendly,
      LENGTH[answerLength] ?? LENGTH.standard,
      'Respond in the same language as the guest.',
      'For late checkout requests: mention the fee (R500–R800 for 2 extra hours) and that a payment link will be sent.',
      'For maintenance/urgent issues: acknowledge immediately and say the team will be notified.',
    ].join('\n- ');

    const systemPrompt = `${SYSTEM_INTRO}

${propertyCtx}

${bookingCtx}

${kbCtx}

## Style Guidelines
- ${styleInstructions}

${RESPONSE_FORMAT}`;

    const history = conversation.messages.slice(-8).map(m => ({
      role: m.role === 'GUEST' ? 'user' as const : 'assistant' as const,
      content: m.content,
    }));

    const client = getAIClient();
    const response = await client.chat.completions.create({
      model,
      max_tokens: 600,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: guestMessage },
      ],
    });

    const rawText = response.choices[0]?.message?.content ?? '';
    let reply = rawText;
    let needsEscalation = false;
    let confidence = 0.9;
    let escalationReason = '';

    try {
      const m = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : rawText);
      reply = parsed.reply ?? rawText;
      needsEscalation = parsed.needs_escalation ?? false;
      confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.9;
      escalationReason = parsed.escalation_reason ?? '';
    } catch { /* use raw */ }

    if (confidence < 0.6) needsEscalation = true;

    await prisma.message.create({ data: { conversationId, role: 'AI', content: reply } });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: needsEscalation ? 'NEEDS_REVIEW' : 'AI_HANDLED', lastMessageAt: new Date() },
    });

    return NextResponse.json({ reply, needsEscalation, confidence, escalationReason, model, kbItemsUsed: kbItems.length });
  } catch (error) {
    console.error('AI respond error:', error);
    return NextResponse.json({ error: 'AI response failed' }, { status: 500 });
  }
}
