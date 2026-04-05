import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAIClient, DEFAULT_MODEL } from '@/lib/ai-client';

interface AIRespondRequest {
  conversationId: string;
  guestMessage: string;
  propertyId?: string;
}

/** Retrieve the most relevant KB items via keyword scoring */
async function retrieveKnowledge(
  orgId: string,
  query: string,
  topK = 6
): Promise<{ title: string; category: string; content: string }[]> {
  // Attempt Pinecone vector search if configured
  if (process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY) {
    try {
      const { Pinecone } = await import('@pinecone-database/pinecone');
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const index = pc.index(process.env.PINECONE_INDEX ?? 'agentiv8-kb');

      const embRes = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query });
      const results = await index.query({
        vector: embRes.data[0].embedding, topK, filter: { orgId }, includeMetadata: true,
      });

      if (results.matches?.length) {
        const ids = results.matches.map(m => m.metadata?.itemId as string).filter(Boolean);
        if (ids.length) {
          const dbItems = await prisma.knowledgeItem.findMany({
            where: { id: { in: ids }, enabled: true },
            select: { id: true, title: true, category: true, content: true },
          });
          const order = Object.fromEntries(ids.map((id, i) => [id, i]));
          return dbItems.sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99))
            .map(i => ({ title: i.title, category: i.category, content: i.content ?? '' }));
        }
      }
    } catch (e) {
      console.warn('Vector search failed, using keyword fallback:', e);
    }
  }

  // Keyword fallback — score by query term overlap
  const allItems = await prisma.knowledgeItem.findMany({
    where: { orgId, enabled: true },
    select: { title: true, category: true, content: true },
  });
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  return allItems
    .map(item => {
      const hay = `${item.title} ${item.category} ${item.content ?? ''}`.toLowerCase();
      return { ...item, score: terms.reduce((s, t) => s + (hay.includes(t) ? 1 : 0), 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ title, category, content }) => ({ title, category, content: content ?? '' }));
}

export async function POST(req: NextRequest) {
  try {
    const body: AIRespondRequest = await req.json();
    const { conversationId, guestMessage } = body;

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

    // Load org settings (model, tone, length)
    const settings = await prisma.setting.findMany({ where: { orgId } });
    const getSetting = (key: string) => settings.find(s => s.key === key)?.value ?? '';
    const model = getSetting('AI_MODEL') || DEFAULT_MODEL;
    const tone = getSetting('AI_TONE') || 'friendly';
    const answerLength = getSetting('AI_ANSWER_LENGTH') || 'standard';

    const toneMap: Record<string, string> = {
      friendly: 'Be warm, approachable, and conversational.',
      neutral: 'Be balanced and straightforward.',
      professional: 'Be formal, precise, and business-like.',
    };
    const lengthMap: Record<string, string> = {
      concise: 'Keep replies to 1–2 sentences maximum.',
      standard: 'Keep replies to 2–4 sentences.',
      thorough: 'Provide complete, detailed answers.',
    };

    const knowledgeItems = await retrieveKnowledge(orgId, guestMessage);

    const propertyCtx = conversation.property
      ? `## Property\nName: ${conversation.property.name}\nUnit: ${conversation.property.unitNumber ?? 'N/A'}\nWiFi: ${conversation.property.wifiNetwork ?? 'N/A'} / ${conversation.property.wifiPassword ?? 'N/A'}\nParking Spot: ${conversation.property.parkingSpot ?? 'N/A'}, Code: ${conversation.property.parkingCode ?? 'N/A'}\nCheck-in: ${conversation.property.checkInTime ?? '15:00'}, Check-out: ${conversation.property.checkOutTime ?? '11:00'}`
      : '';

    const bookingCtx = conversation.booking
      ? `## Guest\nName: ${conversation.booking.guestName}\nCheck-in: ${conversation.booking.checkIn.toLocaleDateString()}\nCheck-out: ${conversation.booking.checkOut.toLocaleDateString()}\nAdults: ${conversation.booking.adults}\nChannel: ${conversation.booking.channel}`
      : '';

    const kbCtx = knowledgeItems.length > 0
      ? `## Knowledge Base\n${knowledgeItems.map(i => `[${i.category}] ${i.title}: ${i.content}`).join('\n\n')}`
      : '';

    const systemPrompt = `You are an expert AI concierge assistant for a short-term rental property management company.

${propertyCtx}

${bookingCtx}

${kbCtx}

## Style
- ${toneMap[tone] ?? toneMap.friendly}
- ${lengthMap[answerLength] ?? lengthMap.standard}
- Respond in the same language as the guest
- Never invent information not present above
- For late checkout: mention fee (R500–R800 for 2 extra hours) and payment link
- For maintenance: acknowledge urgently, say team will be notified

Respond ONLY with JSON: { "reply": "...", "needs_escalation": false, "confidence": 0.95, "escalation_reason": "" }`;

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
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      reply = parsed.reply ?? rawText;
      needsEscalation = parsed.needs_escalation ?? false;
      confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.9;
      escalationReason = parsed.escalation_reason ?? '';
    } catch { /* use raw text */ }

    if (confidence < 0.6) needsEscalation = true;

    await prisma.message.create({ data: { conversationId, role: 'AI', content: reply } });
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { status: needsEscalation ? 'NEEDS_REVIEW' : 'AI_HANDLED', lastMessageAt: new Date() },
    });

    return NextResponse.json({ reply, needsEscalation, confidence, escalationReason, model, kbItemsUsed: knowledgeItems.length });
  } catch (error) {
    console.error('AI respond error:', error);
    return NextResponse.json({ error: 'AI response failed' }, { status: 500 });
  }
}
