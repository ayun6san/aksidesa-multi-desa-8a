import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/surat/[id]/pdf - Generate/download PDF for surat
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

    // Find surat with full details
    const whereClause: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      whereClause.desaId = desaAccess.desaId;
    }

    const surat = await db.surat.findFirst({
      where: whereClause,
      include: {
        desa: {
          select: {
            id: true,
            namaDesa: true,
            slug: true,
            kodeDesa: true,
            kecamatan: true,
            kabupaten: true,
            provinsi: true,
            negara: true,
            alamatKantor: true,
            telepon: true,
            email: true,
            logo: true,
          },
        },
        jenisSurat: {
          select: {
            id: true,
            kode: true,
            nama: true,
            kategori: true,
            deskripsi: true,
            suratTemplate: {
              select: {
                id: true,
                nama: true,
                kontenHTML: true,
                kontenCSS: true,
              },
            },
          },
        },
        pemohon: {
          select: {
            id: true,
            nik: true,
            namaLengkap: true,
            tempatLahir: true,
            tanggalLahir: true,
            jenisKelamin: true,
            agama: true,
            pekerjaan: true,
            pendidikan: true,
            statusPerkawinan: true,
            kewarganegaraan: true,
            noHP: true,
            kk: {
              select: {
                nomorKK: true,
                alamat: true,
              },
            },
          },
        },
        operator: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
          },
        },
        approver: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
          },
        },
      },
    });

    if (!surat) {
      return NextResponse.json(
        { success: false, error: 'Surat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get desa konfigurasi for kepala desa info
    const konfigurasi = await db.suratKonfigurasi.findUnique({
      where: { desaId: surat.desaId },
      select: {
        kodeDesaSurat: true,
        kepalaDesaNama: true,
        kepalaDesaNIP: true,
        sekretarisNama: true,
        sekretarisNIP: true,
      },
    });

    // Parse isi surat
    let isiSuratData: Record<string, unknown> = {};
    try {
      isiSuratData = surat.isiSurat ? JSON.parse(surat.isiSurat) : {};
    } catch {
      isiSuratData = {};
    }

    // Build PDF data object
    const pdfData = {
      surat: {
        id: surat.id,
        nomorSurat: surat.nomorSurat,
        nomorRegisterFmt: surat.nomorRegisterFmt,
        status: surat.status,
        tanggalAjukan: surat.tanggalAjukan,
        tanggalProses: surat.tanggalProses,
        tanggalSelesai: surat.tanggalSelesai,
        dicetakPada: surat.dicetakPada,
        catatanOperator: surat.catatanOperator,
        catatanApprover: surat.catatanApprover,
        createdAt: surat.createdAt,
      },
      jenisSurat: {
        nama: surat.jenisSurat.nama,
        kode: surat.jenisSurat.kode,
        kategori: surat.jenisSurat.kategori,
        deskripsi: surat.jenisSurat.deskripsi,
      },
      desa: {
        namaDesa: surat.desa.namaDesa,
        kecamatan: surat.desa.kecamatan,
        kabupaten: surat.desa.kabupaten,
        provinsi: surat.desa.provinsi,
        negara: surat.desa.negara,
        alamatKantor: surat.desa.alamatKantor,
        telepon: surat.desa.telepon,
        email: surat.desa.email,
        logo: surat.desa.logo,
      },
      konfigurasi: konfigurasi || {},
      pemohon: {
        nama: surat.pemohonNama,
        nik: surat.pemohonNIK,
        alamat: surat.pemohonAlamat,
        rt: surat.pemohonRT,
        rw: surat.pemohonRW,
        dusun: surat.pemohonDusun,
        telepon: surat.pemohonTelepon,
        pendudukData: surat.pemohon || null,
      },
      operator: surat.operator ? {
        nama: surat.operator.namaLengkap,
      } : null,
      approver: surat.approver ? {
        nama: surat.approver.namaLengkap,
      } : null,
      isiSurat: isiSuratData,
      template: surat.jenisSurat.suratTemplate || null,
    };

    // Check if there's already a cached PDF file path
    if (surat.filePDF) {
      return NextResponse.json({
        success: true,
        data: {
          pdfUrl: surat.filePDF,
          qrCode: surat.fileQRCode,
          ...pdfData,
        },
        message: 'PDF sudah tersedia',
      });
    }

    // Return PDF data for client-side rendering
    // The actual PDF generation should be handled by the client using the template
    return NextResponse.json({
      success: true,
      data: pdfData,
      message: 'Data surat untuk pembuatan PDF',
    });
  } catch (error) {
    console.error('Error generating PDF data:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menyiapkan data PDF surat' },
      { status: 500 }
    );
  }
}
