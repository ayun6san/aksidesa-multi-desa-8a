import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch single Perangkat Desa by ID
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

    const perangkat = await db.perangkatDesa.findFirst({
      where,
      include: {
        desa: {
          select: {
            id: true,
            namaDesa: true,
            slug: true,
          }
        }
      }
    });
    
    if (!perangkat) {
      return NextResponse.json(
        { success: false, error: 'Data Perangkat Desa tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: perangkat
    });
  } catch (error) {
    console.error('Error fetching Perangkat Desa:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Perangkat Desa' },
      { status: 500 }
    );
  }
}

// PUT - Update Perangkat Desa
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

    // Build where clause for finding
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    // Check if exists and user has access
    const existing = await db.perangkatDesa.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data Perangkat Desa tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    const perangkat = await db.perangkatDesa.update({
      where: { id },
      data: {
        nip: body.nip || null,
        nipd: body.nipd || null,
        namaLengkap: body.namaLengkap,
        tempatLahir: body.tempatLahir || null,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        jenisKelamin: body.jenisKelamin,
        pendidikanTerakhir: body.pendidikanTerakhir || null,
        jabatan: body.jabatan,
        jabatanLainnya: body.jabatanLainnya || null,
        masaJabatanMulai: body.masaJabatanMulai ? new Date(body.masaJabatanMulai) : null,
        masaJabatanSelesai: body.masaJabatanSelesai ? new Date(body.masaJabatanSelesai) : null,
        skPengangkatan: body.skPengangkatan || null,
        tanggalSk: body.tanggalSk ? new Date(body.tanggalSk) : null,
        alamat: body.alamat || null,
        noHp: body.noHp || null,
        foto: body.foto || null,
        isActive: body.isActive ?? true
      }
    });

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'UPDATE',
        modul: 'LEMBAGA_DESA',
        deskripsi: `Mengupdate perangkat desa: ${body.namaLengkap}`,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: perangkat,
      message: 'Data Perangkat Desa berhasil diperbarui'
    });
  } catch (error) {
    console.error('Error updating Perangkat Desa:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data Perangkat Desa' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Perangkat Desa
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

    // Build where clause for finding
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    // Check if exists and user has access
    const existing = await db.perangkatDesa.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data Perangkat Desa tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.perangkatDesa.delete({
      where: { id }
    });

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'DELETE',
        modul: 'LEMBAGA_DESA',
        deskripsi: `Menghapus perangkat desa: ${existing.namaLengkap}`,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Data Perangkat Desa berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting Perangkat Desa:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus data Perangkat Desa' },
      { status: 500 }
    );
  }
}
