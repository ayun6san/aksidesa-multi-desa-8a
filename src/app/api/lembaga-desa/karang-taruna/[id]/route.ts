import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch single Karang Taruna member by ID
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

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    const karangTaruna = await db.karangTaruna.findFirst({ where });
    
    if (!karangTaruna) {
      return NextResponse.json(
        { success: false, error: 'Data Karang Taruna tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: karangTaruna
    });
  } catch (error) {
    console.error('Error fetching Karang Taruna:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Karang Taruna' },
      { status: 500 }
    );
  }
}

// PUT - Update Karang Taruna member
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

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    const existing = await db.karangTaruna.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data Karang Taruna tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    const karangTaruna = await db.karangTaruna.update({
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
    
    return NextResponse.json({
      success: true,
      data: karangTaruna,
      message: 'Data Karang Taruna berhasil diperbarui'
    });
  } catch (error) {
    console.error('Error updating Karang Taruna:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data Karang Taruna' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Karang Taruna member
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

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    const existing = await db.karangTaruna.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data Karang Taruna tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.karangTaruna.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Data Karang Taruna berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting Karang Taruna:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus data Karang Taruna' },
      { status: 500 }
    );
  }
}
