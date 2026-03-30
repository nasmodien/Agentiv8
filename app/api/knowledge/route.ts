import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    if (!orgId) {
      return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    }

    const items = await prisma.knowledgeItem.findMany({
      where: {
        orgId,
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Knowledge GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge items' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, title, category, content, fileUrl, fileType } = body;

    if (!orgId || !title || !category) {
      return NextResponse.json({ error: 'orgId, title, and category are required' }, { status: 400 });
    }

    // Store in Pinecone if API key is configured
    let vectorId: string | undefined;
    if (process.env.PINECONE_API_KEY && content) {
      try {
        const { Pinecone } = await import('@pinecone-database/pinecone');
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pc.index(process.env.PINECONE_INDEX ?? 'agentiv8-kb');

        // Generate embedding via OpenAI
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: `${title}\n\n${content}`,
        });
        const embedding = embeddingResponse.data[0].embedding;

        vectorId = `kb-${orgId}-${Date.now()}`;
        await index.upsert({
          records: [
            {
              id: vectorId,
              values: embedding,
              metadata: { orgId, title, category, content: content.slice(0, 1000) },
            },
          ],
        });
      } catch (pineconeError) {
        console.warn('Pinecone upsert failed (non-fatal):', pineconeError);
      }
    }

    const item = await prisma.knowledgeItem.create({
      data: {
        orgId,
        title,
        category,
        content,
        fileUrl,
        fileType,
        vectorId,
        enabled: true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Knowledge POST error:', error);
    return NextResponse.json({ error: 'Failed to create knowledge item' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, enabled, title, content, category } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const item = await prisma.knowledgeItem.update({
      where: { id },
      data: {
        ...(enabled !== undefined ? { enabled } : {}),
        ...(title ? { title } : {}),
        ...(content ? { content } : {}),
        ...(category ? { category } : {}),
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Knowledge PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update knowledge item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await prisma.knowledgeItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Knowledge DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete knowledge item' }, { status: 500 });
  }
}
