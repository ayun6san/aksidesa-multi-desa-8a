import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update RW
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    // Get desa filter based on user role
    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const { nomor } = await request.json();

    // Find RW and verify access
    const existing = await db.rW.findUnique({
      where: { id },
      include: { 
        dusun: { 
          select: { 
            id: true, 
            nama: true, 
            desaId: true,
          } 
        } 
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'RW tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verify desa access (if not super admin)
    if (desaAccess.desaId && existing.dusun.desaId !== desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: 'RW tidak ditemukan' },
        { status: 404 }
      );
    }

    const formattedNomor = nomor?.trim().padStart(3, '0') || existing.nomor;

    const rw = await db.rW.update({
      where: { id },
      data: {
        nomor: formattedNomor,
      },
      include: { dusun: { select: { id: true, nama: true } } },
    });

    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'UPDATE',
        modul: 'WILAYAH',
        deskripsi: `Mengupdate RW ${rw.nomor} di ${rw.dusun.nama}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: rw,
      message: 'RW berhasil diupdate',
    });
  } catch (error) {
    console.error('[RW PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengupdate' },
      { status: 500 }
    );
  }
}

// DELETE - Delete RW
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    // Get desa filter based on user role
    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    // Find RW and verify access
    const rw = await db.rW.findUnique({
      where: { id },
      include: { 
        dusun: { 
          select: { 
            id: true, 
            nama: true,
            desaId: true,
          } 
        } 
      },
    });

    if (!rw) {
      return NextResponse.json(
        { success: false, error: 'RW tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verify desa access (if not super admin)
    if (desaAccess.desaId && rw.dusun.desaId !== desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: 'RW tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if RW has RT
    const rtCount = await db.rT.count({
      where: { rwId: id },
    });

    if (rtCount > 0) {
      return NextResponse.json(
        { success: false, error: `Tidak dapat menghapus RW yang memiliki ${rtCount} RT` },
        { status: 400 }
      );
    }

    await db.rW.delete({
      where: { id },
    });

    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'DELETE',
        modul: 'WILAYAH',
        deskripsi: `Menghapus RW ${rw.nomor} di ${rw.dusun.nama}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'RW berhasil dihapus',
    });
  } catch (error) {
    console.error('[RW DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menghapus' },
      { status: 500 }
    );
  }
}
