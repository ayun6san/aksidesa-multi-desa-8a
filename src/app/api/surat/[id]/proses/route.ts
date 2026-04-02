import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { isValidStatusTransition, generateNomorSurat, generateNomorRegister } from '@/lib/surat-utils';
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
    // Hanya MENUNGGU_PROSES dan surat yang ditolak (bisa diproses ulang)
    // DALAM_PROSES removed - surat in DALAM_PROSES should go to DICETAK, not re-processed
    const processableStatuses = ['MENUNGGU_PROSES', 'DITOLAK_OPERATOR', 'DITOLAK_KADES'];
    if (!processableStatuses.includes(existing.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Surat dengan status ${existing.status} tidak dapat diproses. Hanya surat "Menunggu Proses" atau "Ditolak" yang dapat diproses.`,
        },
        { status: 400 }
      );
    }

    // Determine next status BEFORE doing any database writes
    let nextStatus: string;
    if (existing.jenisSurat.tingkatApproval === 'PERLU_APPROVAL') {
      nextStatus = 'MENUNGGU_APPROVAL';
    } else {
      nextStatus = 'DALAM_PROSES';
    }

    // Validate the transition
    if (!isValidStatusTransition(existing.status, nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Transisi status dari ${existing.status} ke ${nextStatus} tidak valid`,
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

    // LOW #18: Validate formatBulan from konfigurasi
    const validFormatBulan = ['ROMAWI', 'ANGKA', 'TANPA'];
    const formatBulan = validFormatBulan.includes(konfigurasi.formatBulan)
      ? konfigurasi.formatBulan
      : 'ROMAWI';

    const now = new Date();
    const tahun = now.getFullYear();
    const bulan = now.getMonth() + 1;

    const resetPer = konfigurasi.resetNomorPer || 'PER_TAHUN';
    const bulanFilter = resetPer === 'PER_BULAN' ? bulan : 0;

    // HIGH #10: When re-processing a rejected surat, skip nomor generation if already has them
    const sudahPunyaNomor = !!existing.nomorSurat;
    const sudahPunyaRegister = !!existing.nomorRegister;

    // Build update data
    const updateData: Record<string, unknown> = {
      status: nextStatus,
      operatorId: user.id,
      catatanOperator: body.catatanOperator || existing.catatanOperator,
      tanggalProses: new Date(),
    };

    // Only set nomor fields if we're generating them
    if (sudahPunyaNomor) {
      updateData.nomorSurat = existing.nomorSurat;
      updateData.nomorIndex = existing.nomorIndex;
    }
    if (sudahPunyaRegister) {
      updateData.nomorRegister = existing.nomorRegister;
      updateData.nomorRegisterFmt = existing.nomorRegisterFmt;
    }

    // HIGH #3: Handle isiSurat dynamic fields if sent by frontend
    if (body.isiSurat !== undefined) {
      updateData.isiSurat = typeof body.isiSurat === 'string'
        ? body.isiSurat
        : JSON.stringify(body.isiSurat);
    }

    // If re-processing rejected surat, clear rejection data
    if (existing.status === 'DITOLAK_OPERATOR' || existing.status === 'DITOLAK_KADES') {
      updateData.alasanDitolak = null;
      updateData.catatanApprover = null;
      updateData.approverId = null;
    }

    // HIGH #2 + #8: Execute counter upserts, surat update, and log creation
    // ALL inside a Prisma $transaction to fix race conditions
    const surat = await db.$transaction(async (tx) => {
      let nomorSuratStr = existing.nomorSurat;
      let nextNomor = existing.nomorIndex;
      let nomorRegisterStr = existing.nomorRegisterFmt;
      let nextNomorRegister = existing.nomorRegister;

      // Generate nomor surat ONLY if surat doesn't already have one
      if (!sudahPunyaNomor) {
        // Find current counter
        const nomorSuratRecord = await tx.nomorSurat.findUnique({
          where: {
            desaId_jenisSuratId_tahun_bulan: {
              desaId: desaAccess.desaId,
              jenisSuratId: existing.jenisSuratId,
              tahun,
              bulan: bulanFilter,
            },
          },
        });

        nextNomor = (nomorSuratRecord?.nomorTerakhir || 0) + 1;

        nomorSuratStr = generateNomorSurat(
          nextNomor,
          konfigurasi.kodeDesaSurat,
          tahun,
          bulan,
          konfigurasi.formatNomorSurat,
          konfigurasi.digitPadding,
          formatBulan as 'ROMAWI' | 'ANGKA' | 'TANPA'
        );

        // Upsert nomor surat counter inside transaction
        await tx.nomorSurat.upsert({
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

        updateData.nomorSurat = nomorSuratStr;
        updateData.nomorIndex = nextNomor;
      }

      // Generate nomor register ONLY if surat doesn't already have one
      if (!sudahPunyaRegister) {
        const nomorRegisterRecord = await tx.nomorRegister.findUnique({
          where: {
            desaId_tahun: {
              desaId: desaAccess.desaId,
              tahun,
            },
          },
        });

        nextNomorRegister = (nomorRegisterRecord?.nomorTerakhir || 0) + 1;

        nomorRegisterStr = generateNomorRegister(
          nextNomorRegister,
          konfigurasi.kodeDesaSurat,
          tahun,
          konfigurasi.formatNomorRegister,
          konfigurasi.digitPaddingReg
        );

        // Upsert nomor register counter inside transaction
        await tx.nomorRegister.upsert({
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

        updateData.nomorRegister = nextNomorRegister;
        updateData.nomorRegisterFmt = nomorRegisterStr;
      }

      // Execute surat update inside transaction
      const updated = await tx.surat.update({
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

      // Create surat log inside transaction
      await tx.suratLog.create({
        data: {
          suratId: id,
          aksi: 'PROSES',
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

      return updated;
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.username,
      aksi: 'UPDATE',
      modul: 'SURAT',
      deskripsi: `Memproses surat ${existing.jenisSurat.nama}. Nomor: ${surat.nomorSurat}`,
      dataRef: {
        suratId: id,
        desaId: desaAccess.desaId,
        nomorSurat: surat.nomorSurat,
        nomorRegister: surat.nomorRegister,
      },
    });

    return NextResponse.json({
      success: true,
      data: surat,
      message: `Surat berhasil diproses. Nomor: ${surat.nomorSurat}`,
    });
  } catch (error) {
    console.error('Error processing surat:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memproses surat' },
      { status: 500 }
    );
  }
}
