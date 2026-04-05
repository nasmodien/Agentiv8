import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function resolveOrgId(orgId: string): Promise<string> {
  if (orgId && orgId !== 'default') return orgId;
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  return org?.id ?? orgId;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const rawOrgId = formData.get('orgId') as string;
    const orgId = await resolveOrgId(rawOrgId);
    const category = formData.get('category') as string;

    if (!file || !orgId) {
      return NextResponse.json({ error: 'file and orgId are required' }, { status: 400 });
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, DOC, DOCX, and TXT files are allowed' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Read file content
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let textContent = '';

    if (file.type === 'application/pdf') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const parsed = await pdfParse(buffer);
        textContent = parsed.text;
      } catch {
        textContent = `[PDF: ${file.name}]`;
      }
    } else if (file.type === 'text/plain') {
      textContent = buffer.toString('utf-8');
    } else {
      textContent = `[Document: ${file.name}]`;
    }

    const title = file.name.replace(/\.[^.]+$/, '');
    const fileType = file.type.includes('pdf') ? 'PDF' : file.type.includes('word') ? 'DOCX' : 'TXT';

    // Save to knowledge base
    const item = await prisma.knowledgeItem.create({
      data: {
        orgId,
        title,
        category: category ?? 'General',
        content: textContent.slice(0, 50000),
        fileType,
        enabled: true,
      },
    });

    // Index in Pinecone if configured
    if (process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY && textContent) {
      try {
        const { Pinecone } = await import('@pinecone-database/pinecone');
        const OpenAI = (await import('openai')).default;

        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const index = pc.index(process.env.PINECONE_INDEX ?? 'agentiv8-kb');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: `${title}\n\n${textContent.slice(0, 8000)}`,
        });

        const vectorId = `kb-${item.id}`;
        await index.upsert({
          records: [
            {
              id: vectorId,
              values: embeddingResponse.data[0].embedding,
              metadata: { orgId, title, category: category ?? 'General', itemId: item.id },
            },
          ],
        });

        await prisma.knowledgeItem.update({
          where: { id: item.id },
          data: { vectorId },
        });
      } catch (e) {
        console.warn('Pinecone indexing failed (non-fatal):', e);
      }
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
