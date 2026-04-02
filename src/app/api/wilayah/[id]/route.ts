import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, requireOperator } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// Helper to verify wilayah belongs to user's desa
async function verifyWilayahAccess(
  userId: string,
  wilayahId: string,
  level: 'dusun' | 'rw' | 'rt'
): Promise<{ allowed: boolean; desaId: string | null; error?: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { desaId: true, role: true },
  });

  if (!user) {
    return { allowed: false, desaId: null, error: 'User tidak ditemukan' };
  }

  // Super admin can access all
  if (user.role === 'SUPER_ADMIN') {
    return { allowed: true, desaId: null };
  }

  // Non-super admin must have desaId
  if (!user.desaId) {
    return { allowed: false, desaId: null, error: 'User tidak terikat ke desa manapun' };
  }

  // Verify wilayah belongs to user's desa
  if (level === 'dusun') {
    const dusun = await db.dusun.findUnique({
      where: { id: wilayahId },
      select: { desaId: true },
    });
    if (!dusun) {
      return { allowed: false, desaId: user.desaId, error: 'Dusun tidak ditemukan' };
    }
    if (dusun.desaId !== user.desaId) {
      return { allowed: false, desaId: user.desaId, error: 'Akses ditolak - Dusun bukan dari desa Anda' };
    }
  } else if (level === 'rw') {
    const rw = await db.rW.findUnique({
      where: { id: wilayahId },
      include: { dusun: { select: { desaId: true } } },
    });
    if (!rw) {
      return { allowed: false, desaId: user.desaId, error: 'RW tidak ditemukan' };
    }
    if (rw.dusun.desaId !== user.desaId) {
      return { allowed: false, desaId: user.desaId, error: 'Akses ditolak - RW bukan dari desa Anda' };
    }
  } else if (level === 'rt') {
    const rt = await db.rT.findUnique({
      where: { id: wilayahId },
      include: { rw: { include: { dusun: { select: { desaId: true } } } } },
    });
    if (!rt) {
      return { allowed: false, desaId: user.desaId, error: 'RT tidak ditemukan' };
    }
    if (rt.rw.dusun.desaId !== user.desaId) {
      return { allowed: false, desaId: user.desaId, error: 'Akses ditolak - RT bukan dari desa Anda' };
    }
  }

  return { allowed: true, desaId: user.desaId };
}

// PUT - Update Dusun/RW/RT
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireOperator();

    const { id } = await params;
    const body = await request.json();
    const { level, data } = body;

    // Verify access
    const access = await verifyWilayahAccess(currentUser.id, id, level);
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: 403 }
      );
    }

    if (level === 'dusun') {
      const dusun = await db.dusun.update({
        where: { id },
        data: {
          nama: data.nama,
          kode: data.kode || null,
          jumlahKK: data.jumlahKK || 0,
          jumlahPenduduk: data.jumlahPenduduk || 0,
        },
      });

      await db.logAktivitas.create({
        data: {
          userId: currentUser.id,
          userName: currentUser.namaLengkap,
          aksi: 'UPDATE',
          modul: 'WILAYAH',
          deskripsi: `Update dusun: ${dusun.nama}`,
        },
      });

      return NextResponse.json({ success: true, data: dusun });
    }

    if (level === 'rw') {
      const rw = await db.rW.update({
        where: { id },
        data: {
          nomor: data.nomor,
          jumlahKK: data.jumlahKK || 0,
          jumlahPenduduk: data.jumlahPenduduk || 0,
        },
      });

      await db.logAktivitas.create({
        data: {
          userId: currentUser.id,
          userName: currentUser.namaLengkap,
          aksi: 'UPDATE',
          modul: 'WILAYAH',
          deskripsi: `Update RW ${rw.nomor}`,
        },
      });

      return NextResponse.json({ success: true, data: rw });
    }

    if (level === 'rt') {
      const rt = await db.rT.update({
        where: { id },
        data: {
          nomor: data.nomor,
          jumlahKK: data.jumlahKK || 0,
          jumlahPenduduk: data.jumlahPenduduk || 0,
        },
      });

      await db.logAktivitas.create({
        data: {
          userId: currentUser.id,
          userName: currentUser.namaLengkap,
          aksi: 'UPDATE',
          modul: 'WILAYAH',
          deskripsi: `Update RT ${rt.nomor}`,
        },
      });

      return NextResponse.json({ success: true, data: rt });
    }

    return NextResponse.json(
      { success: false, error: 'Level tidak valid' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Wilayah PUT] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// DELETE - Delete Dusun/RW/RT
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireOperator();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');

    if (!level || !['dusun', 'rw', 'rt'].includes(level)) {
      return NextResponse.json(
        { success: false, error: 'Level tidak valid' },
        { status: 400 }
      );
    }

    // Verify access
    const access = await verifyWilayahAccess(currentUser.id, id, level as 'dusun' | 'rw' | 'rt');
    if (!access.allowed) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: 403 }
      );
    }

    if (level === 'dusun') {
      // Check if dusun has RW
      const rwCount = await db.rW.count({ where: { dusunId: id } });
      if (rwCount > 0) {
        return NextResponse.json(
          { success: false, error: `Tidak dapat menghapus dusun yang masih memiliki ${rwCount} RW` },
          { status: 400 }
        );
      }

      const dusun = await db.dusun.delete({ where: { id } });

      await db.logAktivitas.create({
        data: {
          userId: currentUser.id,
          userName: currentUser.namaLengkap,
          aksi: 'DELETE',
          modul: 'WILAYAH',
          deskripsi: `Hapus dusun: ${dusun.nama}`,
        },
      });

      return NextResponse.json({ success: true, message: 'Dusun berhasil dihapus' });
    }

    if (level === 'rw') {
      // Check if RW has RT
      const rtCount = await db.rT.count({ where: { rwId: id } });
      if (rtCount > 0) {
        return NextResponse.json(
          { success: false, error: `Tidak dapat menghapus RW yang masih memiliki ${rtCount} RT` },
          { status: 400 }
        );
      }

      const rw = await db.rW.delete({ where: { id } });

      await db.logAktivitas.create({
        data: {
          userId: currentUser.id,
          userName: currentUser.namaLengkap,
          aksi: 'DELETE',
          modul: 'WILAYAH',
          deskripsi: `Hapus RW ${rw.nomor}`,
        },
      });

      return NextResponse.json({ success: true, message: 'RW berhasil dihapus' });
    }

    if (level === 'rt') {
      const rt = await db.rT.delete({ where: { id } });

      await db.logAktivitas.create({
        data: {
          userId: currentUser.id,
          userName: currentUser.namaLengkap,
          aksi: 'DELETE',
          modul: 'WILAYAH',
          deskripsi: `Hapus RT ${rt.nomor}`,
        },
      });

      return NextResponse.json({ success: true, message: 'RT berhasil dihapus' });
    }

    return NextResponse.json(
      { success: false, error: 'Level tidak valid' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[Wilayah DELETE] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
