import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { isValidStatusTransition } from '@/lib/surat-utils';
import { logActivity } from '@/lib/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/surat/[id]/approve - Approve surat (admin/approver)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    // Only SUPER_ADMIN or ADMIN_DESA can approve
    if (!['SUPER_ADMIN', 'ADMIN_DESA'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Hanya Kepala Desa atau Admin Desa yang dapat menyetujui surat' },
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

    // Find surat
    const whereClause: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      whereClause.desaId = desaAccess.desaId;
    }

    const existing = await db.surat.findFirst({
      where: whereClause,
      include: {
        jenisSurat: {
          select: { id: true, nama: true, tingkatApproval: true },
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

    // Determine next status based on current status
    let nextStatus: string;
    let logAksi: string;

    switch (existing.status) {
      case 'DIAJUKAN':
        nextStatus = 'DIVERIFIKASI';
        logAksi = 'DIVERIFIKASI_LULUS';
        break;
      case 'DIVERIFIKASI':
        nextStatus = 'DIPROSES';
        logAksi = 'DIPROSES';
        break;
      case 'DIPROSES':
        nextStatus = 'DICETAK';
        logAksi = 'DICETAK';
        break;
      case 'DICETAK':
        nextStatus = 'DITANDATANGANI';
        logAksi = 'DITANDATANGANI';
        break;
      case 'DITANDATANGANI':
        nextStatus = 'SELESAI';
        logAksi = 'DIARSIPKAN';
        break;
      default:
        return NextResponse.json(
          {
            success: false,
            error: `Surat dengan status ${existing.status} tidak dapat disetujui`,
          },
          { status: 400 }
        );
    }

    // Validate transition
    if (!isValidStatusTransition(existing.status, nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Transisi status dari ${existing.status} ke ${nextStatus} tidak valid`,
        },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status: nextStatus,
      approverId: user.id,
      catatanApprover: body.catatan || null,
    };

    if (nextStatus === 'DIPROSES') {
      updateData.tanggalProses = new Date();
    }
    if (nextStatus === 'DICETAK') {
      updateData.dicetakPada = new Date();
    }
    if (nextStatus === 'SELESAI') {
      updateData.tanggalSelesai = new Date();
    }

    const surat = await db.surat.update({
      where: { id },
      data: updateData,
      include: {
        jenisSurat: {
          select: { id: true, kode: true, nama: true },
        },
        desa: {
          select: { id: true, namaDesa: true },
        },
      },
    });

    // Create surat log
    await db.suratLog.create({
      data: {
        suratId: id,
        aksi: logAksi as 'DIVERIFIKASI_LULUS' | 'DIPROSES' | 'DICETAK' | 'DITANDATANGANI' | 'DIARSIPKAN',
        userId: user.id,
        userName: user.namaLengkap || user.username,
        keterangan: body.catatan || `Surat disetujui oleh ${user.namaLengkap || user.username}`,
        dataSebelum: JSON.stringify({ status: existing.status }),
        dataSesudah: JSON.stringify({ status: nextStatus }),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.username,
      aksi: 'UPDATE',
      modul: 'SURAT',
      deskripsi: `Menyetujui surat ${existing.jenisSurat.nama} - status diubah ke ${nextStatus}`,
      dataRef: {
        suratId: id,
        desaId: existing.desaId,
        statusLama: existing.status,
        statusBaru: nextStatus,
      },
    });

    return NextResponse.json({
      success: true,
      data: surat,
      message: `Surat berhasil disetujui. Status: ${nextStatus}`,
    });
  } catch (error) {
    console.error('Error approving surat:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menyetujui surat' },
      { status: 500 }
    );
  }
}
