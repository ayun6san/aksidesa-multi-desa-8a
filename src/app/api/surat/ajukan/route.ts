import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { logActivity } from '@/lib/activity-logger';

// POST /api/surat/ajukan - Submit a new surat request (authenticated user)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
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

    // Validate required fields
    if (!body.jenisSuratId) {
      return NextResponse.json(
        { success: false, error: 'Jenis surat wajib dipilih' },
        { status: 400 }
      );
    }

    if (!body.pemohonNama) {
      return NextResponse.json(
        { success: false, error: 'Nama pemohon wajib diisi' },
        { status: 400 }
      );
    }

    // Verify jenis surat exists and belongs to user's desa
    const suratJenis = await db.suratJenis.findFirst({
      where: {
        id: body.jenisSuratId,
        desaId: desaAccess.desaId,
        isActive: true,
      },
    });

    if (!suratJenis) {
      return NextResponse.json(
        { success: false, error: 'Jenis surat tidak ditemukan atau tidak aktif' },
        { status: 404 }
      );
    }

    // Get desa konfigurasi
    const konfigurasi = await db.suratKonfigurasi.findUnique({
      where: { desaId: desaAccess.desaId },
    });

    if (!konfigurasi) {
      return NextResponse.json(
        { success: false, error: 'Konfigurasi surat desa belum diatur' },
        { status: 400 }
      );
    }

    // Find penduduk by NIK if provided
    let pemohonId: string | null = null;
    if (body.pemohonNIK) {
      const penduduk = await db.penduduk.findFirst({
        where: {
          nik: body.pemohonNIK,
          desaId: desaAccess.desaId,
          isActive: true,
        },
        select: { id: true },
      });
      if (penduduk) {
        pemohonId = penduduk.id;
      }
    }

    // Build isi surat JSON from provided data
    const isiSurat = body.isiSurat
      ? (typeof body.isiSurat === 'string' ? body.isiSurat : JSON.stringify(body.isiSurat))
      : '{}';

    // Create surat
    const surat = await db.surat.create({
      data: {
        desaId: desaAccess.desaId,
        jenisSuratId: body.jenisSuratId,
        pemohonId,
        pemohonNama: body.pemohonNama,
        pemohonNIK: body.pemohonNIK || null,
        pemohonAlamat: body.pemohonAlamat || null,
        pemohonRT: body.pemohonRT || null,
        pemohonRW: body.pemohonRW || null,
        pemohonDusun: body.pemohonDusun || null,
        pemohonTelepon: body.pemohonTelepon || null,
        isiSurat,
        status: 'MENUNGGU_PROSES',
        tanggalAjukan: new Date(),
        dokumenPendukung: body.dokumenPendukung
          ? (typeof body.dokumenPendukung === 'string' ? body.dokumenPendukung : JSON.stringify(body.dokumenPendukung))
          : null,
        catatanOperator: body.catatanOperator || null,
      },
      include: {
        jenisSurat: {
          select: {
            id: true,
            kode: true,
            nama: true,
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

    // Create surat log
    await db.suratLog.create({
      data: {
        suratId: surat.id,
        aksi: 'AJUKAN',
        userId: user.id,
        userName: user.namaLengkap || user.username,
        keterangan: 'Surat diajukan oleh pemohon',
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.username,
      aksi: 'CREATE',
      modul: 'SURAT',
      deskripsi: `Pengajuan surat ${suratJenis.nama} oleh ${body.pemohonNama}`,
      dataRef: {
        suratId: surat.id,
        suratJenisId: body.jenisSuratId,
        desaId: desaAccess.desaId,
        pemohonNIK: body.pemohonNIK,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: surat,
        message: 'Surat berhasil diajukan',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting surat:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengajukan surat' },
      { status: 500 }
    );
  }
}
