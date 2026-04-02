import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { isValidStatusTransition, generateNomorSurat, generateNomorRegister, padNumber } from '@/lib/surat-utils';
import { logActivity } from '@/lib/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/surat/[id]/proses - Process surat (operator)
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

    // Only operator+ can process
    if (!['SUPER_ADMIN', 'ADMIN_DESA', 'OPERATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Hanya operator yang dapat memproses surat' },
        { status: 403 }
      );
    }

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed || !desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak terikat ke desa manapun' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Find surat
    const existing = await db.surat.findFirst({
      where: {
        id,
        desaId: desaAccess.desaId,
      },
      include: {
        jenisSurat: {
          select: {
            id: true,
            nama: true,
            kategori: true,
            tingkatApproval: true,
          },
        },
        desa: {
          select: {
            id: true,
            namaDesa: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Surat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if the current status allows processing
    const processableStatuses = ['MENUNGGU_PROSES', 'DALAM_PROSES', 'MENUNGGU_APPROVAL', 'DITOLAK_OPERATOR', 'DITOLAK_KADES'];
    if (!processableStatuses.includes(existing.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Surat dengan status ${existing.status} tidak dapat diproses`,
        },
        { status: 400 }
      );
    }

    // Get desa konfigurasi for nomor surat
    const konfigurasi = await db.suratKonfigurasi.findUnique({
      where: { desaId: desaAccess.desaId },
    });

    if (!konfigurasi) {
      return NextResponse.json(
        { success: false, error: 'Konfigurasi surat desa belum diatur. Hubungi admin.' },
        { status: 400 }
      );
    }

    const now = new Date();
    const tahun = now.getFullYear();
    const bulan = now.getMonth() + 1;

    // Generate nomor surat
    const resetPer = konfigurasi.resetNomorPer || 'PER_TAHUN';
    const bulanFilter = resetPer === 'PER_BULAN' ? bulan : 0;

    // Find or create NomorSurat counter
    const nomorSuratRecord = await db.nomorSurat.findUnique({
      where: {
        desaId_jenisSuratId_tahun_bulan: {
          desaId: desaAccess.desaId,
          jenisSuratId: existing.jenisSuratId,
          tahun,
          bulan: bulanFilter,
        },
      },
    });

    const nextNomor = (nomorSuratRecord?.nomorTerakhir || 0) + 1;

    // Generate formatted nomor surat string
    const nomorSuratStr = generateNomorSurat(
      nextNomor,
      konfigurasi.kodeDesaSurat,
      tahun,
      bulan,
      konfigurasi.formatNomorSurat,
      konfigurasi.digitPadding,
      konfigurasi.formatBulan as 'ROMAWI' | 'ANGKA' | 'TANPA'
    );

    // Upsert nomor surat counter
    await db.nomorSurat.upsert({
      where: {
        desaId_jenisSuratId_tahun_bulan: {
          desaId: desaAccess.desaId,
          jenisSuratId: existing.jenisSuratId,
          tahun,
          bulan: bulanFilter,
        },
      },
      create: {
        desaId: desaAccess.desaId,
        jenisSuratId: existing.jenisSuratId,
        tahun,
        bulan: bulanFilter,
        nomorTerakhir: nextNomor,
      },
      update: {
        nomorTerakhir: nextNomor,
      },
    });

    // Generate nomor register
    const nomorRegisterRecord = await db.nomorRegister.findUnique({
      where: {
        desaId_tahun: {
          desaId: desaAccess.desaId,
          tahun,
        },
      },
    });

    const nextNomorRegister = (nomorRegisterRecord?.nomorTerakhir || 0) + 1;

    const nomorRegisterStr = generateNomorRegister(
      nextNomorRegister,
      konfigurasi.kodeDesaSurat,
      tahun,
      konfigurasi.formatNomorRegister,
      konfigurasi.digitPaddingReg
    );

    // Upsert nomor register counter
    await db.nomorRegister.upsert({
      where: {
        desaId_tahun: {
          desaId: desaAccess.desaId,
          tahun,
        },
      },
      create: {
        desaId: desaAccess.desaId,
        tahun,
        nomorTerakhir: nextNomorRegister,
      },
      update: {
        nomorTerakhir: nextNomorRegister,
      },
    });

    // Determine next status
    let nextStatus: string;
    if (existing.jenisSurat.tingkatApproval === 'PERLU_APPROVAL') {
      nextStatus = 'MENUNGGU_APPROVAL';
    } else {
      nextStatus = 'DALAM_PROSES';
    }

    if (!isValidStatusTransition(existing.status, nextStatus)) {
      // If re-processing a rejected surat, go to MENUNGGU_PROSES first
      if (existing.status === 'DITOLAK_OPERATOR' || existing.status === 'DITOLAK_KADES') {
        nextStatus = existing.jenisSurat.tingkatApproval === 'PERLU_APPROVAL' ? 'MENUNGGU_APPROVAL' : 'DALAM_PROSES';
      } else {
        return NextResponse.json(
          {
            success: false,
            error: `Transisi status dari ${existing.status} ke ${nextStatus} tidak valid`,
          },
          { status: 400 }
        );
      }
    }

    // Update surat with nomor surat, nomor register, and status
    const updateData: Record<string, unknown> = {
      status: nextStatus,
      nomorSurat: nomorSuratStr,
      nomorIndex: nextNomor,
      nomorRegister: nextNomorRegister,
      nomorRegisterFmt: nomorRegisterStr,
      operatorId: user.id,
      catatanOperator: body.catatanOperator || existing.catatanOperator,
      tanggalProses: new Date(),
    };

    // If re-processing rejected surat, clear rejection data
    if (existing.status === 'DITOLAK_OPERATOR' || existing.status === 'DITOLAK_KADES') {
      updateData.alasanDitolak = null;
      updateData.catatanApprover = null;
      updateData.approverId = null;
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
        operator: {
          select: { id: true, namaLengkap: true, username: true },
        },
      },
    });

    // Create surat log
    const logAksi: 'PROSES' = 'PROSES';

    await db.suratLog.create({
      data: {
        suratId: id,
        aksi: logAksi,
        userId: user.id,
        userName: user.namaLengkap || user.username,
        keterangan: `Surat diproses oleh operator. Nomor: ${nomorSuratStr}, Register: ${nomorRegisterStr}`,
        dataSebelum: JSON.stringify({
          status: existing.status,
          nomorSurat: existing.nomorSurat,
          nomorRegister: existing.nomorRegister,
        }),
        dataSesudah: JSON.stringify({
          status: nextStatus,
          nomorSurat: nomorSuratStr,
          nomorRegister: nextNomorRegister,
          nomorRegisterFmt: nomorRegisterStr,
        }),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.username,
      aksi: 'UPDATE',
      modul: 'SURAT',
      deskripsi: `Memproses surat ${existing.jenisSurat.nama}. Nomor: ${nomorSuratStr}`,
      dataRef: {
        suratId: id,
        desaId: desaAccess.desaId,
        nomorSurat: nomorSuratStr,
        nomorRegister: nextNomorRegister,
      },
    });

    return NextResponse.json({
      success: true,
      data: surat,
      message: `Surat berhasil diproses. Nomor: ${nomorSuratStr}`,
    });
  } catch (error) {
    console.error('Error processing surat:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses surat' },
      { status: 500 }
    );
  }
}
