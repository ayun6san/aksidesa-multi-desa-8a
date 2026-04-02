import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { isValidStatusTransition } from '@/lib/surat-utils';
import { logActivity } from '@/lib/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/surat/[id]/reject - Reject surat (admin/approver)
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

    // Only SUPER_ADMIN or ADMIN_DESA can reject
    if (!['SUPER_ADMIN', 'ADMIN_DESA'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Hanya Kepala Desa atau Admin Desa yang dapat menolak surat' },
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

    if (!body.alasan) {
      return NextResponse.json(
        { success: false, error: 'Alasan penolakan wajib diisi' },
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

    // Check if rejection is valid from current status
    const rejectableStatuses = ['DIAJUKAN', 'DIVERIFIKASI', 'DIPROSES'];
    if (!rejectableStatuses.includes(existing.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Surat dengan status ${existing.status} tidak dapat ditolak`,
        },
        { status: 400 }
      );
    }

    if (!isValidStatusTransition(existing.status, 'DITOLAK')) {
      return NextResponse.json(
        {
          success: false,
          error: `Transisi status dari ${existing.status} ke DITOLAK tidak valid`,
        },
        { status: 400 }
      );
    }

    const surat = await db.surat.update({
      where: { id },
      data: {
        status: 'DITOLAK',
        approverId: user.id,
        catatanApprover: body.catatan || null,
        alasanDitolak: body.alasan,
      },
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
        aksi: 'DITOLAK_KADES',
        userId: user.id,
        userName: user.namaLengkap || user.username,
        keterangan: `Surat ditolak oleh ${user.namaLengkap || user.username}. Alasan: ${body.alasan}`,
        dataSebelum: JSON.stringify({ status: existing.status }),
        dataSesudah: JSON.stringify({ status: 'DITOLAK', alasan: body.alasan }),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.username,
      aksi: 'UPDATE',
      modul: 'SURAT',
      deskripsi: `Menolak surat ${existing.jenisSurat.nama} - alasan: ${body.alasan}`,
      dataRef: {
        suratId: id,
        desaId: existing.desaId,
        statusLama: existing.status,
        alasanDitolak: body.alasan,
      },
    });

    return NextResponse.json({
      success: true,
      data: surat,
      message: 'Surat ditolak',
    });
  } catch (error) {
    console.error('Error rejecting surat:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menolak surat' },
      { status: 500 }
    );
  }
}
