import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface TestRequest {
  propertyId: string;
  message: string;
  history: TestMessage[];
  sendAs: 'guest' | 'host';
  tone?: string;
  answerLength?: string;
}

const TONE_INSTRUCTIONS: Record<string, string> = {
  friendly: 'Be warm, approachable, and conversational. Use a welcoming tone.',
  neutral: 'Be balanced and straightforward. Avoid overly casual or formal language.',
  professional: 'Be formal, precise, and business-like. Maintain a polished tone.',
  custom: '',
};

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  concise: 'Keep replies to 1–2 sentences maximum. Be brief and direct.',
  standard: 'Keep replies to 2–4 sentences. Balance detail with brevity.',
  thorough: 'Provide complete, detailed answers with all relevant information.',
};

export async function POST(req: NextRequest) {
  try {
    const body: TestRequest = await req.json();
    const { propertyId, message, history = [], sendAs = 'guest', tone = 'friendly', answerLength = 'standard' } = body;

    if (!propertyId || !message) {
      return NextResponse.json({ error: 'propertyId and message required' }, { status: 400 });
    }

    // Fetch property
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Fetch knowledge base
    const orgId = property.orgId;
    const knowledgeItems = await prisma.knowledgeItem.findMany({
      where: { orgId, enabled: true },
      take: 10,
      select: { title: true, category: true, content: true },
    });

    // Resolve tone / length settings from DB if not passed
    const settingTone = tone;
    const settingLength = answerLength;

    const toneInstr = TONE_INSTRUCTIONS[settingTone] ?? TONE_INSTRUCTIONS.friendly;
    const lengthInstr = LENGTH_INSTRUCTIONS[settingLength] ?? LENGTH_INSTRUCTIONS.standard;

    const propertyCtx = `Property: ${property.name}
Unit: ${property.unitNumber ?? 'N/A'}
WiFi: ${property.wifiNetwork ?? 'N/A'} / ${property.wifiPassword ?? 'N/A'}
Parking Spot: ${property.parkingSpot ?? 'N/A'}, Code: ${property.parkingCode ?? 'N/A'}
Check-in: ${property.checkInTime ?? '15:00'}, Check-out: ${property.checkOutTime ?? '11:00'}`;

    const kbCtx = knowledgeItems.length > 0
      ? knowledgeItems.map(i => `[${i.category}] ${i.title}: ${i.content ?? ''}`).join('\n')
      : 'No knowledge base items configured yet.';

    const systemPrompt = `You are an AI concierge assistant for a short-term rental property.

## Property
${propertyCtx}

## Knowledge Base
${kbCtx}

## Instructions
- ${toneInstr}
- ${lengthInstr}
- Respond in the same language as the guest
- Never invent information not in the context above
${sendAs === 'host' ? '- This is a TEST message from the HOST (not a real guest). Acknowledge you are in test mode.' : ''}

Return ONLY a JSON object: { "reply": "<your reply>", "confidence": 0.95, "needs_escalation": false }`;

    const messages: TestMessage[] = [
      ...history.slice(-6),
      { role: 'user', content: message },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    let reply = rawText;
    let confidence = 0.9;
    let needsEscalation = false;

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      reply = parsed.reply ?? rawText;
      confidence = parsed.confidence ?? 0.9;
      needsEscalation = parsed.needs_escalation ?? false;
    } catch { /* use raw */ }

    return NextResponse.json({ reply, confidence, needsEscalation });
  } catch (error) {
    console.error('AI test error:', error);
    return NextResponse.json({ error: 'AI test failed' }, { status: 500 });
  }
}
