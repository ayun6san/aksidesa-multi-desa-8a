import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// PUT - Reorder PKK
export async function PUT(request: NextRequest) {
  try {
    // Auth check
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

    // Get current item
    const currentItem = await db.pKK.findFirst({
      where: { id, ...(desaAccess.desaId ? { desaId: desaAccess.desaId } : {}) }
    });

    if (!currentItem) {
      return NextResponse.json(
        { success: false, error: 'Data tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get all items ordered by urutan, scoped to same desa
    const allItems = await db.pKK.findMany({
      where: { desaId: currentItem.desaId },
      orderBy: { urutan: 'asc' }
    });

    const currentIndex = allItems.findIndex(item => item.id === id);

    if (direction === 'up' && currentIndex > 0) {
      const prevItem = allItems[currentIndex - 1];
      await db.$transaction([
        db.pKK.update({ where: { id }, data: { urutan: prevItem.urutan } }),
        db.pKK.update({ where: { id: prevItem.id }, data: { urutan: currentItem.urutan } })
      ]);
    } else if (direction === 'down' && currentIndex < allItems.length - 1) {
      const nextItem = allItems[currentIndex + 1];
      await db.$transaction([
        db.pKK.update({ where: { id }, data: { urutan: nextItem.urutan } }),
        db.pKK.update({ where: { id: nextItem.id }, data: { urutan: currentItem.urutan } })
      ]);
    } else {
      return NextResponse.json({
        success: false,
        error: direction === 'up' ? 'Item sudah di posisi paling atas' : 'Item sudah di posisi paling bawah'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Urutan berhasil diubah'
    });
  } catch (error) {
    console.error('Error reordering PKK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengubah urutan' },
      { status: 500 }
    );
  }
}
