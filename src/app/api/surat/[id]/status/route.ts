import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { isValidStatusTransition } from '@/lib/surat-utils';
import { logActivity } from '@/lib/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid status sesuai Prisma enum SuratStatus
const VALID_STATUSES = [
  'DRAFT',
  'MENUNGGU_PROSES',
  'DALAM_PROSES',
  'MENUNGGU_APPROVAL',
  'DITOLAK_OPERATOR',
  'DITOLAK_KADES',
  'DISETUJUI',
  'DICETAK',
  'DIBATALKAN',
  'DIARSIPKAN',
];

// Map status ke log aksi yang sesuai dengan Prisma enum SuratLogAksi
const STATUS_TO_AKSI: Record<string, string> = {
  MENUNGGU_PROSES: 'AJUKAN',
  DALAM_PROSES: 'PROSES',
  MENUNGGU_APPROVAL: 'PROSES',
  DISETUJUI: 'APPROVE',
  DITOLAK_OPERATOR: 'REJECT',
  DITOLAK_KADES: 'REJECT',
  DICETAK: 'CETAK',
  DIBATALKAN: 'BATAL',
  DIARSIPKAN: 'ARSIP',
};

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

    // Validasi status harus sesuai Prisma enum
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: `Status tidak valid. Status yang diperbolehkan: ${VALID_STATUSES.join(', ')}` },
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

    const aksi = STATUS_TO_AKSI[body.status] || 'PROSES';

    // Build update data
    const updateData: Record<string, unknown> = {
      status: body.status,
    };

    // Set timestamps based on status
    if (body.status === 'MENUNGGU_PROSES' && !existing.tanggalAjukan) {
      updateData.tanggalAjukan = new Date();
    }
    if (body.status === 'DALAM_PROSES' || body.status === 'MENUNGGU_APPROVAL') {
      updateData.tanggalProses = new Date();
      updateData.operatorId = user.id;
    }
    if (body.status === 'DISETUJUI') {
      updateData.approverId = user.id;
      updateData.tanggalSelesai = new Date();
      if (body.catatanApprover) updateData.catatanApprover = body.catatanApprover;
      if (body.catatan) updateData.catatanApprover = body.catatan;
    }
    if (body.status === 'DICETAK') {
      updateData.dicetakPada = new Date();
    }
    if (body.status === 'DITOLAK_KADES' || body.status === 'DITOLAK_OPERATOR') {
      updateData.alasanDitolak = body.alasanDitolak || body.alasan || body.catatan || null;
      if (['SUPER_ADMIN', 'ADMIN_DESA'].includes(user.role)) {
        updateData.approverId = user.id;
        updateData.catatanApprover = body.catatanApprover || body.catatan || null;
      }
    }
    if (body.status === 'DIBATALKAN') {
      updateData.tanggalSelesai = new Date();
    }
    if (body.status === 'DIARSIPKAN') {
      updateData.tanggalSelesai = new Date();
    }

    // Update surat
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
        aksi: aksi as 'AJUKAN' | 'PROSES' | 'APPROVE' | 'REJECT' | 'CETAK' | 'BATAL' | 'ARSIP',
        userId: user.id,
        userName: user.namaLengkap || user.username,
        keterangan: body.catatan || body.keterangan || `Status diubah dari ${existing.status} ke ${body.status}`,
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
