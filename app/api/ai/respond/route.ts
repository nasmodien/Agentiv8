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

/** Retrieve the most relevant KB items using vector search (Pinecone) or keyword fallback */
async function retrieveKnowledge(
  orgId: string,
  query: string,
  topK = 6
): Promise<{ title: string; category: string; content: string }[]> {
  // Attempt vector search if Pinecone + OpenAI keys are configured
  if (process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY) {
    try {
      const { Pinecone } = await import('@pinecone-database/pinecone');
      const OpenAI = (await import('openai')).default;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const index = pc.index(process.env.PINECONE_INDEX ?? 'agentiv8-kb');

      const embRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: query,
      });
      const queryVec = embRes.data[0].embedding;

      const results = await index.query({
        vector: queryVec,
        topK,
        filter: { orgId },
        includeMetadata: true,
      });

      if (results.matches && results.matches.length > 0) {
        // Fetch full content from DB for matched items
        const ids = results.matches
          .map((m) => m.metadata?.itemId as string | undefined)
          .filter(Boolean) as string[];

        if (ids.length > 0) {
          const dbItems = await prisma.knowledgeItem.findMany({
            where: { id: { in: ids }, enabled: true },
            select: { id: true, title: true, category: true, content: true },
          });
          // Preserve relevance order from Pinecone
          const idOrder = Object.fromEntries(ids.map((id, i) => [id, i]));
          return dbItems
            .sort((a, b) => (idOrder[a.id] ?? 99) - (idOrder[b.id] ?? 99))
            .map((i) => ({ title: i.title, category: i.category, content: i.content ?? '' }));
        }
      }
    } catch (e) {
      console.warn('Vector search failed, falling back to keyword search:', e);
    }
  }

  // Keyword / full-text fallback — score by term overlap
  const allItems = await prisma.knowledgeItem.findMany({
    where: { orgId, enabled: true },
    select: { title: true, category: true, content: true },
  });

  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const scored = allItems.map((item) => {
    const haystack = `${item.title} ${item.category} ${item.content ?? ''}`.toLowerCase();
    const score = queryTerms.reduce((s, t) => s + (haystack.includes(t) ? 1 : 0), 0);
    return { ...item, score };
  });

  return scored
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

    // Fetch conversation + property context
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        property: true,
        booking: true,
        messages: { orderBy: { createdAt: 'asc' }, take: 12 },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const rawOrgId = conversation.property?.orgId ?? '';
    const orgId = (rawOrgId && rawOrgId !== 'default')
      ? rawOrgId
      : (await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } }))?.id ?? rawOrgId;

    // Retrieve relevant knowledge
    const knowledgeItems = await retrieveKnowledge(orgId, guestMessage);

    // Build context blocks
    const propertyContext = conversation.property
      ? `## Property Details
Name: ${conversation.property.name}
Unit: ${conversation.property.unitNumber ?? 'N/A'}
Address: ${(conversation.property as { address?: string }).address ?? 'N/A'}
WiFi Network: ${conversation.property.wifiNetwork ?? 'N/A'}
WiFi Password: ${conversation.property.wifiPassword ?? 'N/A'}
Parking Spot: ${conversation.property.parkingSpot ?? 'N/A'}
Parking Code: ${conversation.property.parkingCode ?? 'N/A'}
Check-in Time: ${conversation.property.checkInTime ?? '15:00'}
Check-out Time: ${conversation.property.checkOutTime ?? '11:00'}`
      : '';

    const bookingContext = conversation.booking
      ? `## Guest Reservation
Guest Name: ${conversation.booking.guestName}
Check-in: ${conversation.booking.checkIn.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
Check-out: ${conversation.booking.checkOut.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
Adults: ${conversation.booking.adults}
Channel: ${conversation.booking.channel}
Status: ${conversation.booking.status}`
      : '';

    const kbContext =
      knowledgeItems.length > 0
        ? `## Relevant Knowledge Base\n${knowledgeItems
            .map((item) => `### [${item.category}] ${item.title}\n${item.content}`)
            .join('\n\n')}`
        : '';

    // Build message history (last 8 turns)
    const history = conversation.messages
      .slice(-8)
      .map((m) => ({
        role: m.role === 'GUEST' ? ('user' as const) : ('assistant' as const),
        content: m.content,
      }));

    const systemPrompt = `You are an expert AI concierge assistant for a short-term rental property management company. You handle guest inquiries professionally, warmly, and concisely.

${propertyContext}

${bookingContext}

${kbContext}

## Instructions
- Respond in the same language as the guest
- Keep replies concise: 2–4 sentences unless detailed instructions are needed
- Use the property details and knowledge base above to answer specific questions accurately
- For late checkout requests: mention the fee (typically R500–R800 for 2 extra hours) and that a payment link will be sent
- For maintenance issues: acknowledge urgently and say the team will be notified immediately
- For complex or sensitive matters (complaints, legal, refund disputes): set needs_escalation to true
- NEVER invent information not present in the context above

## Response Format
Respond ONLY with a JSON object in this exact format:
{
  "reply": "<your friendly guest-facing reply>",
  "needs_escalation": false,
  "confidence": 0.95,
  "escalation_reason": ""
}

Set needs_escalation to true and confidence below 0.6 if:
- You are not confident in the answer
- The guest is upset or there is a conflict
- The request requires human judgement (e.g. refunds, legal matters)`;

    const messages = [
      ...history,
      { role: 'user' as const, content: guestMessage },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    let reply = '';
    let needsEscalation = false;
    let confidence = 0.9;
    let escalationReason = '';

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      // Extract JSON even if Claude wraps it in markdown code fences
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
      reply = parsed.reply ?? rawText;
      needsEscalation = parsed.needs_escalation ?? false;
      confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.9;
      escalationReason = parsed.escalation_reason ?? '';
    } catch {
      reply = rawText;
    }

    // Auto-escalate if confidence is too low
    if (confidence < 0.6) needsEscalation = true;

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

    return NextResponse.json({
      reply,
      needsEscalation,
      confidence,
      escalationReason,
      kbItemsUsed: knowledgeItems.length,
    });
  } catch (error) {
    console.error('AI respond error:', error);
    return NextResponse.json({ error: 'AI response failed' }, { status: 500 });
  }
}
