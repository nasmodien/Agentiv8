import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIClient, DEFAULT_MODEL } from '@/lib/ai-client';

interface TestMessage { role: 'user' | 'assistant'; content: string; }

interface TestRequest {
  propertyId: string;
  message: string;
  history: TestMessage[];
  sendAs: 'guest' | 'host';
  tone?: string;
  answerLength?: string;
  model?: string;
}

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
    const body: TestRequest = await req.json();
    const { propertyId, message, history = [], sendAs = 'guest', tone = 'friendly', answerLength = 'standard', model } = body;

    if (!propertyId || !message) {
      return NextResponse.json({ error: 'propertyId and message required' }, { status: 400 });
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 });

    // Resolve model: arg → org setting → default
    const orgId = property.orgId;
    let resolvedModel = model ?? DEFAULT_MODEL;
    if (!model) {
      const modelSetting = await prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'AI_MODEL' } } });
      resolvedModel = modelSetting?.value ?? DEFAULT_MODEL;
    }

    const kbItems = await prisma.knowledgeItem.findMany({
      where: { orgId, enabled: true }, take: 10,
      select: { title: true, category: true, content: true },
    });

    const systemPrompt = `You are an AI concierge for a short-term rental property (TEST MODE).

Property: ${property.name} (${property.unitNumber ?? 'N/A'})
WiFi: ${property.wifiNetwork ?? 'N/A'} / ${property.wifiPassword ?? 'N/A'}
Parking: Spot ${property.parkingSpot ?? 'N/A'}, Code ${property.parkingCode ?? 'N/A'}
Check-in: ${property.checkInTime ?? '15:00'}, Check-out: ${property.checkOutTime ?? '11:00'}

${kbItems.length > 0 ? 'Knowledge Base:\n' + kbItems.map(i => `[${i.category}] ${i.title}: ${i.content ?? ''}`).join('\n') : ''}

Style: ${TONE[tone] ?? TONE.friendly} ${LENGTH[answerLength] ?? LENGTH.standard}
${sendAs === 'host' ? 'Note: This is a HOST test — acknowledge test mode briefly.' : ''}

Reply ONLY with JSON: { "reply": "...", "confidence": 0.9, "needs_escalation": false }`;

    const client = getAIClient();
    const response = await client.chat.completions.create({
      model: resolvedModel,
      max_tokens: 400,
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.slice(-6),
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

    return NextResponse.json({ reply, confidence, needsEscalation, model: resolvedModel });
  } catch (error) {
    console.error('AI test error:', error);
    return NextResponse.json({ error: 'AI test failed' }, { status: 500 });
  }
}
