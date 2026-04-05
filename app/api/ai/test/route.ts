import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIClient, DEFAULT_MODEL } from '@/lib/ai-client';
import {
  buildPropertyContext, buildKBContext, retrieveKnowledge,
  SYSTEM_INTRO, RESPONSE_FORMAT,
} from '@/lib/ai-context';

interface TestMessage { role: 'user' | 'assistant'; content: string; }

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
    const body = await req.json();
    const {
      propertyId, message, history = [] as TestMessage[],
      sendAs = 'guest', tone = 'friendly', answerLength = 'standard', model,
    } = body;

    if (!propertyId || !message) {
      return NextResponse.json({ error: 'propertyId and message required' }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    const orgId = property.orgId;

    // Resolve model: request arg → org setting → default
    let resolvedModel = model ?? DEFAULT_MODEL;
    if (!model) {
      const ms = await prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'AI_MODEL' } } });
      resolvedModel = ms?.value ?? DEFAULT_MODEL;
    }

    const kbItems = await retrieveKnowledge(orgId, message, propertyId);
    const propertyCtx = buildPropertyContext(property);
    const kbCtx = buildKBContext(kbItems);

    const systemPrompt = `${SYSTEM_INTRO}
${sendAs === 'host' ? '\n⚠️ TEST MODE — This message is from the HOST testing the AI, not a real guest. Acknowledge briefly that this is a test.\n' : ''}
${propertyCtx}

${kbCtx}

## Style Guidelines
- ${TONE[tone] ?? TONE.friendly}
- ${LENGTH[answerLength] ?? LENGTH.standard}
- Respond in the same language as the guest.
- Never invent information not present above.

${RESPONSE_FORMAT}`;

    const client = getAIClient();
    const response = await client.chat.completions.create({
      model: resolvedModel,
      max_tokens: 400,
      messages: [
        { role: 'system', content: systemPrompt },
        ...(history as TestMessage[]).slice(-6),
        { role: 'user', content: message },
      ],
    });

    const rawText = response.choices[0]?.message?.content ?? '';
    let reply = rawText;
    let confidence = 0.9;
    let needsEscalation = false;

    try {
      const m = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : rawText);
      reply = parsed.reply ?? rawText;
      confidence = parsed.confidence ?? 0.9;
      needsEscalation = parsed.needs_escalation ?? false;
    } catch { /* use raw */ }

    return NextResponse.json({ reply, confidence, needsEscalation, model: resolvedModel, kbItemsUsed: kbItems.length });
  } catch (error) {
    console.error('AI test error:', error);
    return NextResponse.json({ error: 'AI test failed' }, { status: 500 });
  }
}
