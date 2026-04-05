import { prisma } from '@/lib/prisma';

interface PropertyContext {
  id: string;
  name: string;
  unitNumber: string | null;
  address: string | null;
  suburb: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  maxGuests: number | null;
  wifiNetwork: string | null;
  wifiPassword: string | null;
  parkingSpot: string | null;
  parkingCode: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  orgId: string;
}

interface BookingContext {
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  channel: string;
  status: string;
}

interface KBItem {
  title: string;
  category: string;
  content: string | null;
}

/** Build the full system prompt context for a property + optional booking */
export function buildPropertyContext(property: PropertyContext): string {
  const lines: string[] = ['## Listing Details'];

  lines.push(`Property Name: ${property.name}`);
  if (property.unitNumber && property.unitNumber !== property.name) {
    lines.push(`Internal Name: ${property.unitNumber}`);
  }
  if (property.address)    lines.push(`Street Address: ${property.address}`);
  if (property.suburb)     lines.push(`Suburb: ${property.suburb}`);
  if (property.city)       lines.push(`City: ${property.city}`);
  if (property.country)    lines.push(`Country: ${property.country}`);
  if (property.bedrooms != null)  lines.push(`Bedrooms: ${property.bedrooms}`);
  if (property.bathrooms != null) lines.push(`Bathrooms: ${property.bathrooms}`);
  if (property.maxGuests != null) lines.push(`Maximum Guests: ${property.maxGuests}`);
  lines.push(`Check-in Time: ${property.checkInTime ?? '15:00'}`);
  lines.push(`Check-out Time: ${property.checkOutTime ?? '11:00'}`);

  if (property.description) {
    lines.push('');
    lines.push('## Property Description');
    lines.push(property.description.slice(0, 1500));
  }

  lines.push('');
  lines.push('## Access Information');
  lines.push(`WiFi Network: ${property.wifiNetwork ?? 'Not provided'}`);
  lines.push(`WiFi Password: ${property.wifiPassword ?? 'Not provided'}`);
  if (property.parkingSpot) {
    lines.push(`Parking Spot: ${property.parkingSpot}`);
    if (property.parkingCode) lines.push(`Parking Code: ${property.parkingCode}`);
  }

  return lines.join('\n');
}

export function buildBookingContext(booking: BookingContext): string {
  const nights = Math.round(
    (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 86400000
  );
  return `## Current Reservation
Guest Name: ${booking.guestName}
${booking.guestEmail ? `Email: ${booking.guestEmail}` : ''}
${booking.guestPhone ? `Phone: ${booking.guestPhone}` : ''}
Check-in: ${new Date(booking.checkIn).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
Check-out: ${new Date(booking.checkOut).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
Nights: ${nights}
Guests: ${booking.adults} adult${booking.adults !== 1 ? 's' : ''}
Booking Channel: ${booking.channel}
Status: ${booking.status}`.trim();
}

export function buildKBContext(items: KBItem[]): string {
  if (items.length === 0) return '';
  return `## Knowledge Base\n${items
    .map(i => `### [${i.category}] ${i.title}\n${i.content ?? ''}`)
    .join('\n\n')}`;
}

/** Keyword-scored KB retrieval (Pinecone fallback) */
export async function retrieveKnowledge(
  orgId: string,
  query: string,
  propertyId?: string,
  topK = 8
): Promise<KBItem[]> {
  // Try Pinecone vector search first
  if (process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY) {
    try {
      const { Pinecone } = await import('@pinecone-database/pinecone');
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const index = pc.index(process.env.PINECONE_INDEX ?? 'agentiv8-kb');

      const embRes = await openai.embeddings.create({ model: 'text-embedding-3-small', input: query });
      const results = await index.query({
        vector: embRes.data[0].embedding,
        topK,
        filter: { orgId },
        includeMetadata: true,
      });

      if (results.matches?.length) {
        const ids = results.matches.map(m => m.metadata?.itemId as string).filter(Boolean);
        if (ids.length) {
          const dbItems = await prisma.knowledgeItem.findMany({
            where: { id: { in: ids }, enabled: true },
            select: { id: true, title: true, category: true, content: true },
          });
          const order = Object.fromEntries(ids.map((id, i) => [id, i]));
          return dbItems
            .sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99))
            .map(i => ({ title: i.title, category: i.category, content: i.content }));
        }
      }
    } catch (e) {
      console.warn('Pinecone search failed, using keyword fallback:', e);
    }
  }

  // Keyword fallback — fetch all relevant items and score by term overlap
  const allItems = await prisma.knowledgeItem.findMany({
    where: {
      orgId,
      enabled: true,
      ...(propertyId ? { OR: [{ propertyId }, { propertyId: null }] } : {}),
    },
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
    .map(({ title, category, content }) => ({ title, category, content }));
}

export const SYSTEM_INTRO = `You are an expert AI concierge assistant for a short-term rental property management company. You handle all guest inquiries accurately, warmly, and concisely using ONLY the information provided in this prompt. Never invent or guess information.`;

export const RESPONSE_FORMAT = `Respond ONLY with this JSON object:
{ "reply": "<your reply>", "needs_escalation": false, "confidence": 0.95, "escalation_reason": "" }

Set needs_escalation: true and confidence < 0.6 when:
- The answer requires information not in this prompt
- Guest is upset or there is a conflict
- Request involves refunds, legal matters, or human judgement`;
