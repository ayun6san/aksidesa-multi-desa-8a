import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { isValidStatusTransition } from '@/lib/surat-utils';
import { logActivity } from '@/lib/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/surat/[id]/reject - Reject surat
// Supports:
// - Kades rejection: MENUNGGU_APPROVAL → DITOLAK_KADES (SUPER_ADMIN/ADMIN_DESA)
// - Operator rejection: MENUNGGU_PROSES → DITOLAK_OPERATOR (OPERATOR)
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

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Terima alasan dari field 'alasanDitolak' atau 'alasan' (compatibility)
    const alasan = body.alasanDitolak || body.alasan;
    if (!alasan) {
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

    // Determine rejection type based on user role and surat status
    let nextStatus: string;

    if (['SUPER_ADMIN', 'ADMIN_DESA'].includes(user.role)) {
      // Kades/Admin Desa can reject surat in MENUNGGU_APPROVAL status
      if (existing.status !== 'MENUNGGU_APPROVAL') {
        return NextResponse.json(
          {
            success: false,
            error: `Surat dengan status ${existing.status} tidak dapat ditolak oleh Kepala Desa. Hanya surat "Menunggu Approval" yang dapat ditolak.`,
          },
          { status: 400 }
        );
      }
      nextStatus = 'DITOLAK_KADES';
    } else if (user.role === 'OPERATOR') {
      // Operator can reject surat in MENUNGGU_PROSES status
      if (existing.status !== 'MENUNGGU_PROSES') {
        return NextResponse.json(
          {
            success: false,
            error: `Surat dengan status ${existing.status} tidak dapat ditolak oleh Operator. Hanya surat "Menunggu Proses" yang dapat ditolak.`,
          },
          { status: 400 }
        );
      }
      nextStatus = 'DITOLAK_OPERATOR';
    } else {
      return NextResponse.json(
        { success: false, error: 'Anda tidak memiliki izin untuk menolak surat' },
        { status: 403 }
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

    const surat = await db.surat.update({
      where: { id },
      data: {
        status: nextStatus,
        approverId: user.id,
        alasanDitolak: alasan,
        catatanApprover: body.catatanApprover || body.catatan || null,
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

    // Create surat log - gunakan enum REJECT yang valid
    await db.suratLog.create({
      data: {
        suratId: id,
        aksi: 'REJECT',
        userId: user.id,
        userName: user.namaLengkap || user.username,
        keterangan: `Surat ditolak oleh ${user.namaLengkap || user.username}. Alasan: ${alasan}`,
        dataSebelum: JSON.stringify({ status: existing.status }),
        dataSesudah: JSON.stringify({ status: nextStatus, alasan }),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.username,
      aksi: 'UPDATE',
      modul: 'SURAT',
      deskripsi: `Menolak surat ${existing.jenisSurat.nama} - alasan: ${alasan}`,
      dataRef: {
        suratId: id,
        desaId: existing.desaId,
        statusLama: existing.status,
        alasanDitolak: alasan,
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
