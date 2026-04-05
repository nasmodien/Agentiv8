/**
 * GET /api/hostaway/fix-roles?orgId=default&debug=true
 *   → fetch one conversation's raw messages and return the field structure (for debugging)
 *
 * POST /api/hostaway/fix-roles?orgId=default
 *   → re-fetch all conversation messages from Hostaway and correct roles in DB
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1';

async function getHostawayToken(accountId: string, apiKey: string): Promise<string> {
  const res = await fetch(`${HOSTAWAY_BASE}/accessTokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: accountId,
      client_secret: apiKey,
      scope: 'general',
    }),
  });
  if (!res.ok) throw new Error(`Hostaway auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function getCreds(orgId: string) {
  const [a, k] = await Promise.all([
    prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'HOSTAWAY_ACCOUNT_ID' } } }),
    prisma.setting.findUnique({ where: { orgId_key: { orgId, key: 'HOSTAWAY_API_KEY' } } }),
  ]);
  return { accountId: a?.value, apiKey: k?.value };
}

function resolveRole(msg: Record<string, unknown>): 'GUEST' | 'AI' | 'HUMAN' {
  // Try multiple field names Hostaway might use
  const raw =
    String(msg.type ?? msg.senderType ?? msg.authorType ?? msg.sender ?? '').toLowerCase().trim();

  if (raw === 'guest') return 'GUEST';
  if (raw === 'automatic' || raw === 'system' || raw === 'bot') return 'AI';
  // 'host', 'owner', 'staff', or empty → host reply
  return 'HUMAN';
}

// GET: debug — show raw fields of first conversation's messages
export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get('orgId') ?? 'default';
  const resolvedOrgId = orgId === 'default'
    ? (await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } }))?.id ?? orgId
    : orgId;

  const { accountId, apiKey } = await getCreds(resolvedOrgId);
  if (!accountId || !apiKey) return NextResponse.json({ error: 'No credentials' }, { status: 400 });

  const token = await getHostawayToken(accountId, apiKey);
  const headers = { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' };

  // Fetch one conversation and return the raw message objects so we can see field names
  const convRes = await fetch(`${HOSTAWAY_BASE}/conversations?limit=5&sortOrder=lastMessage`, { headers });
  if (!convRes.ok) return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });

  const convData = await convRes.json();
  const conversations: Record<string, unknown>[] = convData.result ?? [];
  if (!conversations.length) return NextResponse.json({ message: 'No conversations found' });

  const firstConv = conversations[0];
  const msgRes = await fetch(`${HOSTAWAY_BASE}/conversations/${firstConv.id}/messages?limit=5`, { headers });
  const msgData = await msgRes.json();
  const messages: Record<string, unknown>[] = msgData.result ?? [];

  return NextResponse.json({
    conversationId: firstConv.id,
    sampleMessages: messages.map(m => ({
      id: m.id,
      type: m.type,
      senderType: m.senderType,
      authorType: m.authorType,
      sender: m.sender,
      isHost: m.isHost,
      body: String(m.body ?? m.message ?? '').slice(0, 80),
      resolvedRole: resolveRole(m),
    })),
  });
}

// POST: fix all message roles in DB by re-fetching from Hostaway
export async function POST(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get('orgId') ?? 'default';
  const resolvedOrgId = orgId === 'default'
    ? (await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } }))?.id ?? orgId
    : orgId;

  const { accountId, apiKey } = await getCreds(resolvedOrgId);
  if (!accountId || !apiKey) return NextResponse.json({ error: 'No credentials' }, { status: 400 });

  const token = await getHostawayToken(accountId, apiKey);
  const headers = { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' };

  let fixed = 0;
  let skipped = 0;
  let offset = 0;
  const BATCH = 30;

  while (true) {
    const convRes = await fetch(
      `${HOSTAWAY_BASE}/conversations?limit=${BATCH}&offset=${offset}&sortOrder=lastMessage`,
      { headers }
    );
    if (!convRes.ok) break;
    const convData = await convRes.json();
    const conversations: Record<string, unknown>[] = convData.result ?? [];
    if (!conversations.length) break;

    for (const conv of conversations) {
      const haConvId = String(conv.id);
      const convId = `ha-conv-${haConvId}`;

      const dbConv = await prisma.conversation.findUnique({ where: { id: convId } });
      if (!dbConv) { skipped++; continue; }

      const msgRes = await fetch(
        `${HOSTAWAY_BASE}/conversations/${haConvId}/messages?limit=100`,
        { headers }
      );
      if (!msgRes.ok) { skipped++; continue; }
      const msgData = await msgRes.json();
      const messages: Record<string, unknown>[] = msgData.result ?? [];

      for (const msg of messages) {
        const msgId = `ha-msg-${haConvId}-${msg.id}`;
        const newRole = resolveRole(msg);
        const updated = await prisma.message.updateMany({
          where: { id: msgId },
          data: { role: newRole },
        });
        if (updated.count > 0) fixed++;
      }
    }

    if (conversations.length < BATCH) break;
    offset += BATCH;
  }

  return NextResponse.json({ success: true, fixed, skipped });
}
