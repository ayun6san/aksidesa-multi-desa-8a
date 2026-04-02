import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { isValidStatusTransition } from '@/lib/surat-utils';
import { logActivity } from '@/lib/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT /api/surat/[id]/status - Update surat status (operator/approver)
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

    // Only operator+ can change status
    if (!['SUPER_ADMIN', 'ADMIN_DESA', 'OPERATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Hanya operator atau admin yang dapat mengubah status surat' },
        { status: 403 }
      );
    }

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.status) {
      return NextResponse.json(
        { success: false, error: 'Status baru wajib diisi' },
        { status: 400 }
      );
    }

    const validStatuses = [
      'DRAFT', 'DIAJUKAN', 'DIVERIFIKASI', 'DIPROSES',
      'DICETAK', 'DITANDATANGANI', 'DITOLAK', 'SELESAI', 'DIBATALKAN',
    ];

    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Status tidak valid' },
        { status: 400 }
      );
    }

    // Find surat
    const whereClause: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      whereClause.desaId = desaAccess.desaId;
    }

    const existing = await db.surat.findFirst({
      where: whereClause,
      include: {
        jenisSurat: {
          select: { id: true, nama: true },
        },
        desa: {
          select: { id: true, namaDesa: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Surat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate status transition
    if (!isValidStatusTransition(existing.status, body.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Transisi status dari ${existing.status} ke ${body.status} tidak valid`,
        },
        { status: 400 }
      );
    }

    // Map status to log action
    const statusToAksi: Record<string, string> = {
      DIVERIFIKASI: 'DIVERIFIKASI_LULUS',
      DIPROSES: 'DIPROSES',
      DICETAK: 'DICETAK',
      DITANDATANGANI: 'DITANDATANGANI',
      DITOLAK: 'DITOLAK_KADES',
      DIBATALKAN: 'DIBATALKAN',
      DIAJUKAN: 'DIAJUKAN',
      SELESAI: 'DIARSIPKAN',
    };

    const aksi = statusToAksi[body.status] || 'DIBUAT';

    // Build update data
    const updateData: Record<string, unknown> = {
      status: body.status,
    };

    // Set timestamps based on status
    if (body.status === 'DIAJUKAN' && !existing.tanggalAjukan) {
      updateData.tanggalAjukan = new Date();
    }
    if (body.status === 'DIPROSES') {
      updateData.tanggalProses = new Date();
      updateData.operatorId = user.id;
    }
    if (body.status === 'DICETAK') {
      updateData.dicetakPada = new Date();
    }
    if (body.status === 'SELESAI') {
      updateData.tanggalSelesai = new Date();
    }
    if (body.status === 'DITOLAK') {
      updateData.alasanDitolak = body.alasanDitolak || body.catatan || null;
      if (['SUPER_ADMIN', 'ADMIN_DESA'].includes(user.role)) {
        updateData.approverId = user.id;
        updateData.catatanApprover = body.catatan || null;
      }
    }

    // Update surat
    const surat = await db.surat.update({
      where: { id },
      data: updateData,
    });

    // Create surat log
    await db.suratLog.create({
      data: {
        suratId: id,
        aksi: aksi as 'DIBUAT' | 'DIAJUKAN' | 'DIVERIFIKASI_LULUS' | 'DIVERIFIKASI_DITOLAK' | 'DIPROSES' | 'DICETAK' | 'DITANDATANGANI' | 'DITOLAK_KADES' | 'DIBATALKAN' | 'DIARSIPKAN',
        userId: user.id,
        userName: user.namaLengkap || user.username,
        keterangan: body.catatan || `Status diubah dari ${existing.status} ke ${body.status}`,
        dataSebelum: JSON.stringify({ status: existing.status }),
        dataSesudah: JSON.stringify({ status: body.status }),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.username,
      aksi: 'UPDATE',
      modul: 'SURAT',
      deskripsi: `Status surat ${existing.jenisSurat.nama} diubah dari ${existing.status} ke ${body.status}`,
      dataRef: {
        suratId: id,
        desaId: existing.desaId,
        statusLama: existing.status,
        statusBaru: body.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: surat,
      message: `Status surat berhasil diubah ke ${body.status}`,
    });
  } catch (error) {
    console.error('Error updating surat status:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengubah status surat' },
      { status: 500 }
    );
  }
}
