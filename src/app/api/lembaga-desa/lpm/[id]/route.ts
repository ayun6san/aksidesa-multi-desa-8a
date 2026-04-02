import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch single LPM member by ID
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

    const lpm = await db.lPM.findFirst({ where });
    
    if (!lpm) {
      return NextResponse.json(
        { success: false, error: 'Data LPM tidak ditemukan' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: lpm
    });
  } catch (error) {
    console.error('Error fetching LPM:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data LPM' },
      { status: 500 }
    );
  }
}

// PUT - Update LPM member
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

    const existing = await db.lPM.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data LPM tidak ditemukan' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    const lpm = await db.lPM.update({
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
      data: lpm,
      message: 'Data LPM berhasil diperbarui'
    });
  } catch (error) {
    console.error('Error updating LPM:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data LPM' },
      { status: 500 }
    );
  }
}

// DELETE - Delete LPM member
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

    const existing = await db.lPM.findFirst({ where });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Data LPM tidak ditemukan' },
        { status: 404 }
      );
    }

    await db.lPM.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Data LPM berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting LPM:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus data LPM' },
      { status: 500 }
    );
  }
}
