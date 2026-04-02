import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get single Dusun detail
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    // Build where clause
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    const dusun = await db.dusun.findFirst({
      where,
      include: {
        desa: {
          select: {
            id: true,
            namaDesa: true,
            slug: true,
          },
        },
        rw: {
          include: {
            rt: true,
          },
          orderBy: { nomor: 'asc' },
        },
      },
    });

    if (!dusun) {
      return NextResponse.json(
        { success: false, error: 'Dusun tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dusun,
    });
  } catch (error) {
    console.error('[Dusun GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

// PUT - Update Dusun
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

    const { nama, kode } = await request.json();

    if (!nama || !nama.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama dusun wajib diisi' },
        { status: 400 }
      );
    }

    // Build where clause for finding the dusun
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    // Check if dusun exists and belongs to user's desa
    const existingDusun = await db.dusun.findFirst({ where });

    if (!existingDusun) {
      return NextResponse.json(
        { success: false, error: 'Dusun tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if name already exists (except this dusun) in the same desa
    const duplicateName = await db.dusun.findFirst({
      where: {
        nama: nama.trim(),
        desaId: existingDusun.desaId,
        NOT: { id },
      },
    });

    if (duplicateName) {
      return NextResponse.json(
        { success: false, error: 'Nama dusun sudah ada di desa ini' },
        { status: 400 }
      );
    }

    const dusun = await db.dusun.update({
      where: { id },
      data: {
        nama: nama.trim(),
        kode: kode?.trim() || null,
      },
    });

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'UPDATE',
        modul: 'WILAYAH',
        deskripsi: `Mengupdate dusun: ${dusun.nama}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: dusun,
      message: 'Dusun berhasil diupdate',
    });
  } catch (error) {
    console.error('[Dusun PUT] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat mengupdate' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Dusun
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

    // Build where clause for finding the dusun
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    // Check if dusun exists and belongs to user's desa
    const dusun = await db.dusun.findFirst({ where });

    if (!dusun) {
      return NextResponse.json(
        { success: false, error: 'Dusun tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if dusun has RW
    const rwCount = await db.rW.count({
      where: { dusunId: id },
    });

    if (rwCount > 0) {
      return NextResponse.json(
        { success: false, error: `Tidak dapat menghapus dusun yang memiliki ${rwCount} RW` },
        { status: 400 }
      );
    }

    await db.dusun.delete({
      where: { id },
    });

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'DELETE',
        modul: 'WILAYAH',
        deskripsi: `Menghapus dusun: ${dusun.nama}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Dusun berhasil dihapus',
    });
  } catch (error) {
    console.error('[Dusun DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menghapus' },
      { status: 500 }
    );
  }
}
