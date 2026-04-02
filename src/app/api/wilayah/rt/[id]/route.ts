import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update RT
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

    // Find RT and verify access
    const existing = await db.rT.findUnique({
      where: { id },
      include: {
        rw: {
          include: { 
            dusun: { 
              select: { 
                id: true, 
                nama: true,
                desaId: true,
              } 
            } 
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'RT tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verify desa access (if not super admin)
    if (desaAccess.desaId && existing.rw.dusun.desaId !== desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: 'RT tidak ditemukan' },
        { status: 404 }
      );
    }

    const formattedNomor = nomor?.trim().padStart(3, '0') || existing.nomor;

    const rt = await db.rT.update({
      where: { id },
      data: {
        nomor: formattedNomor,
      },
      include: {
        rw: {
          include: { dusun: { select: { id: true, nama: true } } },
        },
      },
    });

    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'UPDATE',
        modul: 'WILAYAH',
        deskripsi: `Mengupdate RT ${rt.nomor} di RW ${rt.rw.nomor} ${rt.rw.dusun.nama}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: rt,
      message: 'RT berhasil diupdate',
    });
  } catch (error) {
    console.error('[RT PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengupdate' },
      { status: 500 }
    );
  }
}

// DELETE - Delete RT
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

    // Find RT and verify access
    const rt = await db.rT.findUnique({
      where: { id },
      include: {
        rw: {
          include: { 
            dusun: { 
              select: { 
                id: true, 
                nama: true,
                desaId: true,
              } 
            } 
          },
        },
      },
    });

    if (!rt) {
      return NextResponse.json(
        { success: false, error: 'RT tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verify desa access (if not super admin)
    if (desaAccess.desaId && rt.rw.dusun.desaId !== desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: 'RT tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.rT.delete({
      where: { id },
    });

    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'DELETE',
        modul: 'WILAYAH',
        deskripsi: `Menghapus RT ${rt.nomor} di RW ${rt.rw.nomor} ${rt.rw.dusun.nama}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'RT berhasil dihapus',
    });
  } catch (error) {
    console.error('[RT DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menghapus' },
      { status: 500 }
    );
  }
}
