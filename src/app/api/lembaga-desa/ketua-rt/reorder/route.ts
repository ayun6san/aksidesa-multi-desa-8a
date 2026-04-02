import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// PUT - Reorder Ketua RT members
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const { id, direction } = await request.json();

    const currentItem = await db.ketuaRT.findFirst({
      where: { id, ...(desaAccess.desaId ? { desaId: desaAccess.desaId } : {}) }
    });

    if (!currentItem) {
      return NextResponse.json(
        { success: false, error: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    const allItems = await db.ketuaRT.findMany({
      where: { desaId: currentItem.desaId },
      orderBy: { urutan: 'asc' }
    });

    const currentIndex = allItems.findIndex(item => item.id === id);

    if (direction === 'up' && currentIndex > 0) {
      const prevItem = allItems[currentIndex - 1];
      await db.$transaction([
        db.ketuaRT.update({ where: { id }, data: { urutan: prevItem.urutan } }),
        db.ketuaRT.update({ where: { id: prevItem.id }, data: { urutan: currentItem.urutan } })
      ]);
    } else if (direction === 'down' && currentIndex < allItems.length - 1) {
      const nextItem = allItems[currentIndex + 1];
      await db.$transaction([
        db.ketuaRT.update({ where: { id }, data: { urutan: nextItem.urutan } }),
        db.ketuaRT.update({ where: { id: nextItem.id }, data: { urutan: currentItem.urutan } })
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering Ketua RT:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengubah urutan' },
      { status: 500 }
    );
  }
}
