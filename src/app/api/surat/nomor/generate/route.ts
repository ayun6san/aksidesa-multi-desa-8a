import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { generateNomorSurat, padNumber } from '@/lib/surat-utils';

// GET /api/surat/nomor/generate - Generate next nomor surat (preview only, no side effects)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const jenisSuratId = searchParams.get('jenisSuratId');

    if (!jenisSuratId) {
      return NextResponse.json(
        { success: false, error: 'jenisSuratId wajib diisi' },
        { status: 400 }
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

    // Verify jenis surat exists and belongs to desa
    const suratJenis = await db.suratJenis.findFirst({
      where: {
        id: jenisSuratId,
        desaId: desaAccess.desaId,
      },
      select: { id: true, nama: true, kode: true },
    });

    if (!suratJenis) {
      return NextResponse.json(
        { success: false, error: 'Jenis surat tidak ditemukan' },
        { status: 404 }
      );
    }

    const now = new Date();
    const tahun = now.getFullYear();
    const bulan = now.getMonth() + 1;
    const resetPer = konfigurasi.resetNomorPer || 'PER_TAHUN';
    const bulanFilter = resetPer === 'PER_BULAN' ? bulan : 0;

    // Get current nomor terakhir
    const nomorSuratRecord = await db.nomorSurat.findUnique({
      where: {
        desaId_jenisSuratId_tahun_bulan: {
          desaId: desaAccess.desaId,
          jenisSuratId: jenisSuratId,
          tahun,
          bulan: bulanFilter,
        },
      },
    });

    const currentNomor = nomorSuratRecord?.nomorTerakhir || 0;
    const nextNomor = currentNomor + 1;

    // Generate preview nomor surat
    const nomorSuratStr = generateNomorSurat(
      nextNomor,
      konfigurasi.kodeDesaSurat,
      tahun,
      bulan,
      konfigurasi.formatNomorSurat,
      konfigurasi.digitPadding,
      konfigurasi.formatBulan as 'ROMAWI' | 'ANGKA' | 'TANPA'
    );

    // Also generate a few next numbers for preview
    const previewNomor: { nomor: number; formatted: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const previewNum = nextNomor + i;
      const formatted = generateNomorSurat(
        previewNum,
        konfigurasi.kodeDesaSurat,
        tahun,
        bulan,
        konfigurasi.formatNomorSurat,
        konfigurasi.digitPadding,
        konfigurasi.formatBulan as 'ROMAWI' | 'ANGKA' | 'TANPA'
      );
      previewNomor.push({ nomor: previewNum, formatted });
    }

    return NextResponse.json({
      success: true,
      data: {
        jenisSurat: suratJenis,
        currentNomorTerakhir: currentNomor,
        nextNomor,
        nomorSurat: nomorSuratStr,
        previewNomor,
        konfigurasi: {
          formatNomorSurat: konfigurasi.formatNomorSurat,
          kodeDesaSurat: konfigurasi.kodeDesaSurat,
          digitPadding: konfigurasi.digitPadding,
          formatBulan: konfigurasi.formatBulan,
          resetNomorPer: konfigurasi.resetNomorPer,
        },
        periode: {
          tahun,
          bulan,
          resetPer,
        },
      },
    });
  } catch (error) {
    console.error('Error generating nomor surat:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghasilkan nomor surat' },
      { status: 500 }
    );
  }
}
