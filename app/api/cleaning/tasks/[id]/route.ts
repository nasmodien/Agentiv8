import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { status, priority, notes, cleanerId, scheduledAt, payAmount, checklistItems } = body;

    const data: Record<string, unknown> = {};
    if (status !== undefined) {
      data.status = status;
      if (status === 'COMPLETED' || status === 'VERIFIED') {
        data.completedAt = new Date();
      }
    }
    if (priority !== undefined) data.priority = priority;
    if (notes !== undefined) data.notes = notes;
    if (cleanerId !== undefined) data.cleanerId = cleanerId || null;
    if (scheduledAt !== undefined) data.scheduledAt = new Date(scheduledAt);
    if (payAmount !== undefined) data.payAmount = payAmount ? Number(payAmount) : null;

    const task = await prisma.cleaningTask.update({
      where: { id: params.id },
      data,
      include: {
        property: { select: { id: true, name: true, unitNumber: true } },
        cleaner: { select: { id: true, name: true } },
        checklistItems: { orderBy: { order: 'asc' } },
      },
    });

    // Update individual checklist items if provided
    if (checklistItems) {
      for (const item of checklistItems as { id: string; done: boolean }[]) {
        await prisma.taskChecklistItem.update({
          where: { id: item.id },
          data: { done: item.done },
        });
      }
    }

    return NextResponse.json({ task });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.cleaningTask.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
