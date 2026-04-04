import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('orgId') ?? 'default';
  try {
    const cleaners = await prisma.cleaner.findMany({
      where: { orgId },
      include: {
        properties: { include: { property: { select: { id: true, name: true, unitNumber: true } } } },
        tasks: { where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }, select: { id: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ cleaners });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId = 'default', name, email, phone, payRate, notes, propertyIds = [] } = body;

    const cleaner = await prisma.cleaner.create({
      data: {
        orgId,
        name,
        email: email || null,
        phone: phone || null,
        payRate: payRate ? Number(payRate) : null,
        notes: notes || null,
        properties: {
          create: (propertyIds as string[]).map((propertyId: string) => ({ propertyId })),
        },
      },
      include: { properties: true },
    });
    return NextResponse.json({ cleaner });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, phone, payRate, notes, active, propertyIds } = body;

    const cleaner = await prisma.cleaner.update({
      where: { id },
      data: {
        name,
        email: email || null,
        phone: phone || null,
        payRate: payRate ? Number(payRate) : null,
        notes: notes || null,
        active: active ?? true,
        ...(propertyIds !== undefined && {
          properties: {
            deleteMany: {},
            create: (propertyIds as string[]).map((propertyId: string) => ({ propertyId })),
          },
        }),
      },
      include: { properties: { include: { property: { select: { id: true, name: true, unitNumber: true } } } } },
    });
    return NextResponse.json({ cleaner });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  try {
    await prisma.cleaner.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
