import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch single PKK member by ID
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

    const pkk = await db.pKK.findFirst({
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

    if (!pkk) {
      return NextResponse.json(
        { success: false, error: 'Data PKK tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: pkk
    });
  } catch (error) {
    console.error('Error fetching PKK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data PKK' },
      { status: 500 }
    );
  }
}

// PUT - Update PKK member
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
    const existing = await db.pKK.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data PKK tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();

    const pkk = await db.pKK.update({
      where: { id },
      data: {
        namaLengkap: body.namaLengkap,
        tempatLahir: body.tempatLahir || null,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        jenisKelamin: body.jenisKelamin,
        pendidikanTerakhir: body.pendidikanTerakhir || null,
        pekerjaan: body.pekerjaan || null,
        jabatan: body.jabatan,
        periodeMulai: body.periodeMulai ? new Date(body.periodeMulai) : null,
        periodeSelesai: body.periodeSelesai ? new Date(body.periodeSelesai) : null,
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
        deskripsi: `Mengupdate anggota PKK: ${body.namaLengkap}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: pkk,
      message: 'Data PKK berhasil diperbarui'
    });
  } catch (error) {
    console.error('Error updating PKK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data PKK' },
      { status: 500 }
    );
  }
}

// DELETE - Delete PKK member
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
    const existing = await db.pKK.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data PKK tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.pKK.delete({
      where: { id }
    });

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'DELETE',
        modul: 'LEMBAGA_DESA',
        deskripsi: `Menghapus anggota PKK: ${existing.namaLengkap}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Data PKK berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting PKK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus data PKK' },
      { status: 500 }
    );
  }
}
