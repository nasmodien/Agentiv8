import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('orgId') ?? 'default';
  try {
    const templates = await prisma.checklistTemplate.findMany({
      where: { orgId },
      include: { items: { orderBy: { order: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ templates });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId = 'default', name, propertyId, items = [] } = body;

    const template = await prisma.checklistTemplate.create({
      data: {
        orgId,
        name,
        propertyId: propertyId || null,
        items: {
          create: (items as string[]).map((label: string, i: number) => ({ label, order: i })),
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    return NextResponse.json({ template });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, items } = body;

    const template = await prisma.checklistTemplate.update({
      where: { id },
      data: {
        name,
        ...(items !== undefined && {
          items: {
            deleteMany: {},
            create: (items as string[]).map((label: string, i: number) => ({ label, order: i })),
          },
        }),
      },
      include: { items: { orderBy: { order: 'asc' } } },
    });
    return NextResponse.json({ template });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await prisma.checklistTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
