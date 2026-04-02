import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch single BPD member by ID
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

    const bpd = await db.bPD.findFirst({
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
    
    if (!bpd) {
      return NextResponse.json(
        { success: false, error: 'Data BPD tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: bpd
    });
  } catch (error) {
    console.error('Error fetching BPD:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data BPD' },
      { status: 500 }
    );
  }
}

// PUT - Update BPD member
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
    const existing = await db.bPD.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data BPD tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    const bpd = await db.bPD.update({
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
        deskripsi: `Mengupdate anggota BPD: ${body.namaLengkap}`,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: bpd,
      message: 'Data BPD berhasil diperbarui'
    });
  } catch (error) {
    console.error('Error updating BPD:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data BPD' },
      { status: 500 }
    );
  }
}

// DELETE - Delete BPD member
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
    const existing = await db.bPD.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data BPD tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.bPD.delete({
      where: { id }
    });

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'DELETE',
        modul: 'LEMBAGA_DESA',
        deskripsi: `Menghapus anggota BPD: ${existing.namaLengkap}`,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Data BPD berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting BPD:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus data BPD' },
      { status: 500 }
    );
  }
}
