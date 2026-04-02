import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, requireOperator } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// Valid hubungan keluarga (non-kepala)
const VALID_HUBUNGAN_ANGGOTA = [
  'SUAMI', 'ISTRI', 'ANAK', 'ANAK_TIRI', 'ANAK_ANGKAT', 'MENANTU', 'CUCU', 'ORANG_TUA', 'MERTUA', 'FAMILI_LAIN', 'PEMBANTU', 'LAINNYA',
];

// POST - Mutasi Anggota KK (Pindah ke KK lain / Pecah KK)
export async function POST(request: NextRequest) {
  try {
    // Auth check - require operator or higher
    const user = await requireOperator();

    // Validate desa access
    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed || !desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak - User tidak terikat ke desa manapun' },
        { status: 403 }
      );
    }

    const desaId = desaAccess.desaId;

    const body = await request.json();
    const {
      jenisMutasi,
      anggotaIds,
      // Untuk pindah-ke-kk
      kkTujuanId,
      hubunganAnggota,
      // Untuk pecah-kk
      kkBaru,
      kepalaKKBaruId,
      // Opsional - ganti kepala KK asal jika kepala ikut pindah
      gantiKepalaId,
      hubunganKepalaLama,
      // Umum
      tanggalMutasi,
      keterangan,
    } = body;

    // ========== Validasi Umum ==========
    if (!jenisMutasi || (jenisMutasi !== 'pindah-ke-kk' && jenisMutasi !== 'pecah-kk')) {
      return NextResponse.json(
        { success: false, error: 'Jenis mutasi tidak valid (pindah-ke-kk atau pecah-kk)' },
        { status: 400 }
      );
    }

    if (!anggotaIds || !Array.isArray(anggotaIds) || anggotaIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pilih minimal 1 anggota yang akan dimutasi' },
        { status: 400 }
      );
    }

    if (!tanggalMutasi) {
      return NextResponse.json(
        { success: false, error: 'Tanggal mutasi wajib diisi' },
        { status: 400 }
      );
    }

    const tanggalMutasiDate = new Date(tanggalMutasi);
    if (isNaN(tanggalMutasiDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Format tanggal mutasi tidak valid' },
        { status: 400 }
      );
    }

    // ========== Proses dalam Transaksi ==========
    const result = await db.$transaction(async (tx) => {
      const txDb = tx;

      if (jenisMutasi === 'pindah-ke-kk') {
        return await handlePindahKeKK(txDb, {
          desaId,
          anggotaIds,
          kkTujuanId,
          hubunganAnggota,
          gantiKepalaId,
          hubunganKepalaLama,
          tanggalMutasi: tanggalMutasiDate,
          keterangan,
        });
      } else {
        return await handlePecahKK(txDb, {
          desaId,
          anggotaIds,
          kkBaru,
          kepalaKKBaruId,
          gantiKepalaId,
          hubunganKepalaLama,
          tanggalMutasi: tanggalMutasiDate,
          keterangan,
        });
      }
    });

    // Catat log aktivitas (di luar transaksi, menggunakan data hasil transaksi)
    // result can be NextResponse (error) or plain object (success) - narrow the type
    if (result instanceof NextResponse) {
      return result;
    }

    const logDescription = jenisMutasi === 'pindah-ke-kk'
      ? `Mutasi KK (Pindah): ${result.mutasiBerhasil} anggota dipindahkan${result.gantiKepala ? ` — Ganti Kepala: ${(result.gantiKepala as { kepalaBaru?: string })?.kepalaBaru || ''}` : ''}${result.kkDinonaktifkan ? ' — KK asal dinonaktifkan' : ''}`
      : `Mutasi KK (Pecah): ${result.mutasiBerhasil} anggota keluar${result.gantiKepala ? ` — Ganti Kepala: ${(result.gantiKepala as { kepalaBaru?: string })?.kepalaBaru || ''}` : ''}${result.kkDinonaktifkan ? ' — KK asal dinonaktifkan' : ''}${result.kkBaru ? ' — KK baru dibuat' : ''}`;

    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.namaLengkap,
        aksi: 'UPDATE',
        modul: 'PENDUDUK',
        deskripsi: logDescription,
        dataRef: JSON.stringify(result),
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Mutasi berhasil diproses',
    });
  } catch (error) {
    console.error('Error processing mutasi KK:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal memproses mutasi KK';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// ==================== HANDLER: PINDAH KE KK LAIN ====================
async function handlePindahKeKK(
  txDb: any,
  params: {
    desaId: string;
    anggotaIds: string[];
    kkTujuanId: string;
    hubunganAnggota: Record<string, string>;
    gantiKepalaId?: string;
    hubunganKepalaLama?: string;
    tanggalMutasi: Date;
    keterangan?: string;
  }
) {
  const { desaId, anggotaIds, kkTujuanId, hubunganAnggota, gantiKepalaId, hubunganKepalaLama, tanggalMutasi, keterangan } = params;

  // 1. Validasi field wajib pindah-ke-kk
  if (!kkTujuanId) {
    return NextResponse.json(
      { success: false, error: 'KK tujuan wajib dipilih' },
      { status: 400 }
    );
  }

  if (!hubunganAnggota || typeof hubunganAnggota !== 'object') {
    return NextResponse.json(
      { success: false, error: 'Hubungan keluarga anggota di KK tujuan wajib diisi' },
      { status: 400 }
    );
  }

  // 2. Validasi semua anggota ada, aktif, dan milik desa
  const anggotaList = await txDb.penduduk.findMany({
    where: {
      id: { in: anggotaIds },
      desaId,
    },
    select: {
      id: true,
      nik: true,
      namaLengkap: true,
      hubunganKeluarga: true,
      kkId: true,
      status: true,
      isActive: true,
    },
  });

  if (anggotaList.length !== anggotaIds.length) {
    return NextResponse.json(
      { success: false, error: 'Beberapa anggota tidak ditemukan atau bukan dari desa Anda' },
      { status: 404 }
    );
  }

  // Validasi semua anggota aktif
  const anggotaTidakAktif = anggotaList.filter(a => !a.isActive || a.status === 'MENINGGAL' || a.status === 'PINDAH');
  if (anggotaTidakAktif.length > 0) {
    return NextResponse.json(
      { success: false, error: `${anggotaTidakAktif.map(a => a.namaLengkap).join(', ')} sudah tidak aktif. Tidak dapat dimutasi.` },
      { status: 400 }
    );
  }

  // Validasi semua anggota punya KK
  const tanpaKK = anggotaList.filter(a => !a.kkId);
  if (tanpaKK.length > 0) {
    return NextResponse.json(
      { success: false, error: `${tanpaKK.map(a => a.namaLengkap).join(', ')} tidak terikat ke KK manapun.` },
      { status: 400 }
    );
  }

  // 3. Validasi KK tujuan ada dan milik desa
  const kkTujuan = await txDb.kK.findFirst({
    where: { id: kkTujuanId, desaId },
    select: {
      id: true,
      nomorKK: true,
      alamat: true,
      isActive: true,
      kepalaKeluargaId: true,
    },
  });

  if (!kkTujuan) {
    return NextResponse.json(
      { success: false, error: 'KK tujuan tidak ditemukan atau bukan dari desa Anda' },
      { status: 404 }
    );
  }

  if (!kkTujuan.isActive) {
    return NextResponse.json(
      { success: false, error: 'KK tujuan sudah tidak aktif' },
      { status: 400 }
    );
  }

  // 4. Validasi tidak ada anggota yang sudah di KK tujuan
  const sudahDiTujuan = anggotaList.filter(a => a.kkId === kkTujuanId);
  if (sudahDiTujuan.length > 0) {
    return NextResponse.json(
      { success: false, error: `${sudahDiTujuan.map(a => a.namaLengkap).join(', ')} sudah berada di KK tujuan.` },
      { status: 400 }
    );
  }

  // 5. Validasi hubunganKeluarga tidak KEPALA_KELUARGA (di KK tujuan)
  for (const anggota of anggotaList) {
    const hub = hubunganAnggota[anggota.id];
    if (!hub) {
      return NextResponse.json(
        { success: false, error: `Hubungan keluarga untuk ${anggota.namaLengkap} di KK tujuan belum diisi` },
        { status: 400 }
      );
    }
    if (hub === 'KEPALA_KELUARGA') {
      return NextResponse.json(
        { success: false, error: `${anggota.namaLengkap} tidak dapat menjadi Kepala Keluarga di KK tujuan. Gunakan fitur Pecah KK jika ingin membuat KK baru.` },
        { status: 400 }
      );
    }
    if (!VALID_HUBUNGAN_ANGGOTA.includes(hub)) {
      return NextResponse.json(
        { success: false, error: `Hubungan keluarga "${hub}" untuk ${anggota.namaLengkap} tidak valid` },
        { status: 400 }
      );
    }
  }

  // 6. Ambil info KK asal (dari anggota pertama, semuanya seharusnya dari KK yang sama)
  const kkAsalId = anggotaList[0].kkId;
  const kkAsalList = anggotaList.map(a => a.kkId);
  const allSameKK = kkAsalList.every(kkId => kkId === kkAsalId);
  if (!allSameKK) {
    return NextResponse.json(
      { success: false, error: 'Semua anggota yang dipindahkan harus berasal dari KK yang sama' },
      { status: 400 }
    );
  }

  const kkAsal = await txDb.kK.findUnique({
    where: { id: kkAsalId },
    select: {
      id: true,
      nomorKK: true,
      alamat: true,
      kepalaKeluargaId: true,
    },
  });

  // 7. Cek apakah ada kepala KK di antara anggota yang pindah (SEBELUM update)
  let gantiKepalaResult: Record<string, unknown> | null = null;
  let kkDinonaktifkanResult: Record<string, unknown> | null = null;

  const kepalaKkYangPindah = anggotaList.find(a => a.hubunganKeluarga === 'KEPALA_KELUARGA');

  // 8. Handle ganti kepala KK asal jika kepala ikut pindah
  if (kepalaKkYangPindah && kkAsalId) {
    // Cek sisa anggota KK asal (tidak termasuk yang sudah dipindahkan)
    const sisaAnggota = await txDb.penduduk.findMany({
      where: {
        kkId: kkAsalId,
        id: { notIn: anggotaIds },
        status: { not: 'MENINGGAL' },
        isActive: true,
      },
      select: {
        id: true,
        namaLengkap: true,
        nik: true,
        hubunganKeluarga: true,
      },
    });

    if (sisaAnggota.length > 0) {
      // WAJIB ada gantiKepalaId dari sisa anggota
      if (!gantiKepalaId) {
        return NextResponse.json(
          { success: false, error: `Kepala KK (${kepalaKkYangPindah.namaLengkap}) ikut pindah dan masih ada ${sisaAnggota.length} anggota tersisa. Wajib memilih pengganti kepala keluarga.` },
          { status: 400 }
        );
      }

      const isValidGanti = sisaAnggota.some(a => a.id === gantiKepalaId);
      if (!isValidGanti) {
        return NextResponse.json(
          { success: false, error: 'Pengganti kepala keluarga harus dari anggota KK asal yang tersisa (tidak ikut pindah)' },
          { status: 400 }
        );
      }

      const selectedHubungan = hubunganKepalaLama || 'ORANG_TUA';
      if (!VALID_HUBUNGAN_ANGGOTA.includes(selectedHubungan)) {
        return NextResponse.json(
          { success: false, error: 'Hubungan keluarga kepala lama tidak valid' },
          { status: 400 }
        );
      }

      const gantiKepalaData = sisaAnggota.find(a => a.id === gantiKepalaId)!;

      // Update KK.kepalaKeluargaId (dulu, sebelum ubah hubungan siapa pun)
      await txDb.kK.update({
        where: { id: kkAsalId },
        data: { kepalaKeluargaId: gantiKepalaId },
      });

      // Update pengganti → KEPALA_KELUARGA
      await txDb.penduduk.update({
        where: { id: gantiKepalaId },
        data: { hubunganKeluarga: 'KEPALA_KELUARGA' },
      });

      // Catatan: hubungan kepala lama TIDAK perlu diupdate di sini
      // karena mereka pindah ke KK tujuan dan hubungan di KK tujuan
      // sudah ditentukan user di step 4 (hubunganAnggota)

      gantiKepalaResult = {
        kkId: kkAsalId,
        kkNomor: kkAsal?.nomorKK,
        kepalaLama: kepalaKkYangPindah.namaLengkap,
        kepalaBaru: gantiKepalaData.namaLengkap,
      };
    } else {
      // Tidak ada sisa anggota → nonaktifkan KK asal
      await txDb.kK.update({
        where: { id: kkAsalId },
        data: { isActive: false },
      });

      kkDinonaktifkanResult = {
        kkId: kkAsalId,
        kkNomor: kkAsal?.nomorKK,
        alasan: 'Seluruh anggota KK pindah ke KK lain',
      };
    }
  }

  // 9. Untuk setiap anggota: update kkId, hubunganKeluarga, urutanDalamKK
  // Ambil max urutanDalamKK di KK tujuan
  const maxUrutan = await txDb.penduduk.findFirst({
    where: { kkId: kkTujuanId },
    orderBy: { urutanDalamKK: 'desc' },
    select: { urutanDalamKK: true },
  });
  let urutanMulai = (maxUrutan?.urutanDalamKK || 0) + 1;

  const detail: Array<{
    pendudukId: string;
    namaLengkap: string;
    nik: string | null;
    hubunganBaru: string;
    dariKK: string | null;
    keKK: string | null;
  }> = [];

  for (const anggota of anggotaList) {
    // Gunakan hubungan dari step 4 (hubunganAnggota) untuk SEMUA anggota termasuk kepala KK
    // User sudah menentukan hubungan di KK tujuan untuk setiap anggota di step 4
    const finalHubungan = hubunganAnggota[anggota.id];

    await txDb.penduduk.update({
      where: { id: anggota.id },
      data: {
        kkId: kkTujuanId,
        hubunganKeluarga: finalHubungan,
        urutanDalamKK: urutanMulai,
      },
    });

    detail.push({
      pendudukId: anggota.id,
      namaLengkap: anggota.namaLengkap,
      nik: anggota.nik,
      hubunganBaru: finalHubungan,
      dariKK: kkAsal?.nomorKK || null,
      keKK: kkTujuan.nomorKK || null,
    });

    urutanMulai++;
  }

  // 9. Buat PeristiwaKependudukan untuk setiap anggota
  for (const anggota of anggotaList) {
    await txDb.peristiwaKependudukan.create({
      data: {
        desaId,
        jenisPeristiwa: 'MUTASI_KK',
        pendudukId: anggota.id,
        kkId: kkTujuanId,
        tanggalPeristiwa: tanggalMutasi,
        keterangan: JSON.stringify({
          jenisMutasi: 'pindah-ke-kk',
          kkAsalId,
          kkAsalNomor: kkAsal?.nomorKK,
          kkTujuanId,
          kkTujuanNomor: kkTujuan.nomorKK,
          hubunganBaru: hubunganAnggota[anggota.id],
          catatan: keterangan || null,
        }),
        alamatAsal: kkAsal?.alamat || null,
        alamatTujuan: kkTujuan.alamat || null,
        isProcessed: true,
      },
    });
  }

  return {
    mutasiBerhasil: anggotaList.length,
    detail,
    gantiKepala: gantiKepalaResult,
    kkDinonaktifkan: kkDinonaktifkanResult,
    kkBaru: null,
  };
}

// ==================== HANDLER: PECAH KK ====================
async function handlePecahKK(
  txDb: any,
  params: {
    desaId: string;
    anggotaIds: string[];
    kkBaru: {
      nomorKK: string;
      alamat: string;
      rtId?: string;
      dusunId?: string;
    };
    kepalaKKBaruId: string;
    gantiKepalaId?: string;
    hubunganKepalaLama?: string;
    tanggalMutasi: Date;
    keterangan?: string;
  }
) {
  const { desaId, anggotaIds, kkBaru, kepalaKKBaruId, gantiKepalaId, hubunganKepalaLama, tanggalMutasi, keterangan } = params;

  // 1. Validasi field wajib pecah-kk
  if (!kkBaru || !kkBaru.alamat || !kkBaru.alamat.trim()) {
    return NextResponse.json(
      { success: false, error: 'Alamat KK baru wajib diisi' },
      { status: 400 }
    );
  }

  if (!kepalaKKBaruId) {
    return NextResponse.json(
      { success: false, error: 'Kepala KK baru wajib dipilih dari anggota yang ikut pecah' },
      { status: 400 }
    );
  }

  // 2. Validasi semua anggota ada, aktif, dan milik desa
  const anggotaList = await txDb.penduduk.findMany({
    where: {
      id: { in: anggotaIds },
      desaId,
    },
    select: {
      id: true,
      nik: true,
      namaLengkap: true,
      hubunganKeluarga: true,
      kkId: true,
      status: true,
      isActive: true,
    },
  });

  if (anggotaList.length !== anggotaIds.length) {
    return NextResponse.json(
      { success: false, error: 'Beberapa anggota tidak ditemukan atau bukan dari desa Anda' },
      { status: 404 }
    );
  }

  // Validasi semua anggota aktif
  const anggotaTidakAktif = anggotaList.filter(a => !a.isActive || a.status === 'MENINGGAL' || a.status === 'PINDAH');
  if (anggotaTidakAktif.length > 0) {
    return NextResponse.json(
      { success: false, error: `${anggotaTidakAktif.map(a => a.namaLengkap).join(', ')} sudah tidak aktif. Tidak dapat dimutasi.` },
      { status: 400 }
    );
  }

  // Validasi semua anggota punya KK
  const tanpaKK = anggotaList.filter(a => !a.kkId);
  if (tanpaKK.length > 0) {
    return NextResponse.json(
      { success: false, error: `${tanpaKK.map(a => a.namaLengkap).join(', ')} tidak terikat ke KK manapun.` },
      { status: 400 }
    );
  }

  // 3. Validasi semua anggota dari KK yang sama
  const kkAsalIds = [...new Set(anggotaList.map(a => a.kkId))];
  if (kkAsalIds.length > 1) {
    return NextResponse.json(
      { success: false, error: 'Semua anggota yang akan pecah harus berasal dari KK yang sama' },
      { status: 400 }
    );
  }

  const kkAsalId = kkAsalIds[0];

  // 4. Validasi kepalaKKBaruId ada di anggotaIds
  if (!anggotaIds.includes(kepalaKKBaruId)) {
    return NextResponse.json(
      { success: false, error: 'Kepala KK baru harus dari anggota yang ikut pecah KK' },
      { status: 400 }
    );
  }

  // 5. Validasi data kkBaru
  // Nomor KK: 16 digit jika diisi, cek unik
  if (kkBaru.nomorKK) {
    if (!/^\d{16}$/.test(kkBaru.nomorKK)) {
      return NextResponse.json(
        { success: false, error: 'Nomor KK harus 16 digit angka' },
        { status: 400 }
      );
    }

    const existingNomorKK = await txDb.kK.findUnique({
      where: { nomorKK: kkBaru.nomorKK },
      select: { id: true },
    });
    if (existingNomorKK) {
      return NextResponse.json(
        { success: false, error: 'Nomor KK sudah terdaftar di sistem' },
        { status: 400 }
      );
    }
  }

  // Validasi RT milik desa jika diisi
  if (kkBaru.rtId) {
    const rtExists = await txDb.rT.findFirst({
      where: {
        id: kkBaru.rtId,
        rw: { dusun: { desaId } },
      },
      select: { id: true },
    });
    if (!rtExists) {
      return NextResponse.json(
        { success: false, error: 'RT tidak ditemukan di desa Anda' },
        { status: 404 }
      );
    }
  }

  // Validasi Dusun milik desa jika diisi
  if (kkBaru.dusunId) {
    const dusunExists = await txDb.dusun.findFirst({
      where: { id: kkBaru.dusunId, desaId },
      select: { id: true },
    });
    if (!dusunExists) {
      return NextResponse.json(
        { success: false, error: 'Dusun tidak ditemukan di desa Anda' },
        { status: 404 }
      );
    }
  }

  // 6. Ambil info KK asal
  const kkAsal = await txDb.kK.findUnique({
    where: { id: kkAsalId },
    select: {
      id: true,
      nomorKK: true,
      alamat: true,
      kepalaKeluargaId: true,
    },
  });

  // 7. Buat KK baru
  const newKK = await txDb.kK.create({
    data: {
      nomorKK: kkBaru.nomorKK || null,
      alamat: kkBaru.alamat,
      rtId: kkBaru.rtId || null,
      dusunId: kkBaru.dusunId || null,
      jenisTempatTinggal: 'MILIK_SENDIRI',
      kepalaKeluargaId: kepalaKKBaruId,
      desaId,
    },
  });

  // 8. Pindahkan anggota ke KK baru
  const detail: Array<{
    pendudukId: string;
    namaLengkap: string;
    nik: string | null;
    hubunganBaru: string;
    dariKK: string | null;
    keKK: string | null;
    isKepalaBaru: boolean;
  }> = [];

  let urutan = 1;
  for (const anggota of anggotaList) {
    let hubunganBaru: string;

    if (anggota.id === kepalaKKBaruId) {
      // Kepala KK baru
      hubunganBaru = 'KEPALA_KELUARGA';
      urutan = 1; // Kepala selalu urutan 1
    } else {
      // Anggota biasa - pertahankan hubungan lama
      hubunganBaru = anggota.hubunganKeluarga || 'LAINNYA';
      // Pastikan bukan KEPALA_KELUARGA (jangan ada 2 kepala)
      if (hubunganBaru === 'KEPALA_KELUARGA') {
        hubunganBaru = 'ORANG_TUA';
      }
      urutan++;
    }

    await txDb.penduduk.update({
      where: { id: anggota.id },
      data: {
        kkId: newKK.id,
        hubunganKeluarga: hubunganBaru,
        urutanDalamKK: urutan,
      },
    });

    detail.push({
      pendudukId: anggota.id,
      namaLengkap: anggota.namaLengkap,
      nik: anggota.nik,
      hubunganBaru,
      dariKK: kkAsal?.nomorKK || null,
      keKK: newKK.nomorKK || null,
      isKepalaBaru: anggota.id === kepalaKKBaruId,
    });
  }

  // 9. Cek apakah kepala KK asal ikut pindah
  let gantiKepalaResult: Record<string, unknown> | null = null;
  let kkDinonaktifkanResult: Record<string, unknown> | null = null;

  const kepalaAsalYangPindah = anggotaList.find(a => a.hubunganKeluarga === 'KEPALA_KELUARGA' && a.id !== kepalaKKBaruId);

  if (kepalaAsalYangPindah && kkAsalId) {
    // Kepala KK asal ikut pindah (tapi bukan sebagai kepala KK baru)
    // Catatan: jika kepalaAsalYangPindah === kepalaKKBaruId, berarti kepala lama jadi kepala baru - tidak perlu ganti kepala di asal

    const sisaAnggota = await txDb.penduduk.findMany({
      where: {
        kkId: kkAsalId,
        id: { notIn: anggotaIds },
        status: { not: 'MENINGGAL' },
        isActive: true,
      },
      select: {
        id: true,
        namaLengkap: true,
        nik: true,
        hubunganKeluarga: true,
      },
    });

    if (sisaAnggota.length > 0) {
      if (!gantiKepalaId) {
        return NextResponse.json(
          { success: false, error: `Kepala KK (${kepalaAsalYangPindah.namaLengkap}) ikut pecah dan masih ada ${sisaAnggota.length} anggota tersisa di KK asal. Wajib memilih pengganti kepala keluarga.` },
          { status: 400 }
        );
      }

      const isValidGanti = sisaAnggota.some(a => a.id === gantiKepalaId);
      if (!isValidGanti) {
        return NextResponse.json(
          { success: false, error: 'Pengganti kepala keluarga harus dari anggota KK asal yang tersisa' },
          { status: 400 }
        );
      }

      const selectedHubungan = hubunganKepalaLama || 'ORANG_TUA';
      if (!VALID_HUBUNGAN_ANGGOTA.includes(selectedHubungan)) {
        return NextResponse.json(
          { success: false, error: 'Hubungan keluarga kepala lama tidak valid' },
          { status: 400 }
        );
      }

      const gantiKepalaData = sisaAnggota.find(a => a.id === gantiKepalaId)!;

      // Update hubungan kepala lama yang ikut pindah
      await txDb.penduduk.update({
        where: { id: kepalaAsalYangPindah.id },
        data: { hubunganKeluarga: selectedHubungan },
      });

      // Update pengganti → KEPALA_KELUARGA
      await txDb.penduduk.update({
        where: { id: gantiKepalaId },
        data: { hubunganKeluarga: 'KEPALA_KELUARGA' },
      });

      // Update KK.kepalaKeluargaId
      await txDb.kK.update({
        where: { id: kkAsalId },
        data: { kepalaKeluargaId: gantiKepalaId },
      });

      gantiKepalaResult = {
        kkId: kkAsalId,
        kkNomor: kkAsal?.nomorKK,
        kepalaLama: kepalaAsalYangPindah.namaLengkap,
        kepalaBaru: gantiKepalaData.namaLengkap,
        hubunganKepalaLama: selectedHubungan,
      };
    } else {
      // Tidak ada sisa anggota → nonaktifkan KK asal
      await txDb.kK.update({
        where: { id: kkAsalId },
        data: { isActive: false },
      });

      kkDinonaktifkanResult = {
        kkId: kkAsalId,
        kkNomor: kkAsal?.nomorKK,
        alasan: 'Seluruh anggota KK pecah dan membentuk KK baru',
      };
    }
  } else if (!kepalaAsalYangPindah) {
    // Kepala KK asal TIDAK ikut pindah - KK asal tetap aktif, tidak perlu ganti kepala
    // (kepala tetap di KK asal, yang pindah hanya anggota biasa)
  }
  // Jika kepalaAsalYangPindah === kepalaKKBaruId, artinya kepala lama jadi kepala KK baru
  // Sisa anggota perlu ganti kepala
  else if (kepalaAsalYangPindah && kepalaAsalYangPindah.id === kepalaKKBaruId && kkAsalId) {
    // Kepala lama jadi kepala KK baru
    const sisaAnggota = await txDb.penduduk.findMany({
      where: {
        kkId: kkAsalId,
        id: { notIn: anggotaIds },
        status: { not: 'MENINGGAL' },
        isActive: true,
      },
      select: {
        id: true,
        namaLengkap: true,
        nik: true,
        hubunganKeluarga: true,
      },
    });

    if (sisaAnggota.length > 0) {
      if (!gantiKepalaId) {
        return NextResponse.json(
          { success: false, error: `Kepala KK (${kepalaAsalYangPindah.namaLengkap}) membuat KK baru dan masih ada ${sisaAnggota.length} anggota tersisa. Wajib memilih pengganti kepala keluarga.` },
          { status: 400 }
        );
      }

      const isValidGanti = sisaAnggota.some(a => a.id === gantiKepalaId);
      if (!isValidGanti) {
        return NextResponse.json(
          { success: false, error: 'Pengganti kepala keluarga harus dari anggota KK asal yang tersisa' },
          { status: 400 }
        );
      }

      const selectedHubungan = hubunganKepalaLama || 'ORANG_TUA';
      if (!VALID_HUBUNGAN_ANGGOTA.includes(selectedHubungan)) {
        return NextResponse.json(
          { success: false, error: 'Hubungan keluarga kepala lama tidak valid' },
          { status: 400 }
        );
      }

      const gantiKepalaData = sisaAnggota.find(a => a.id === gantiKepalaId)!;

      // Pengganti → KEPALA_KELUARGA
      await txDb.penduduk.update({
        where: { id: gantiKepalaId },
        data: { hubunganKeluarga: 'KEPALA_KELUARGA' },
      });

      // Update KK.kepalaKeluargaId
      await txDb.kK.update({
        where: { id: kkAsalId },
        data: { kepalaKeluargaId: gantiKepalaId },
      });

      // Kepala lama sudah diupdate ke KEPALA_KELUARGA di KK baru (langkah 8)

      gantiKepalaResult = {
        kkId: kkAsalId,
        kkNomor: kkAsal?.nomorKK,
        kepalaLama: kepalaAsalYangPindah.namaLengkap,
        kepalaBaru: gantiKepalaData.namaLengkap,
        hubunganKepalaLama: 'BUAT_KK_BARU', // Kepala lama buat KK baru
      };
    } else {
      // Tidak ada sisa anggota → nonaktifkan KK asal
      await txDb.kK.update({
        where: { id: kkAsalId },
        data: { isActive: false },
      });

      kkDinonaktifkanResult = {
        kkId: kkAsalId,
        kkNomor: kkAsal?.nomorKK,
        alasan: 'Kepala KK membuat KK baru, tidak ada anggota tersisa',
      };
    }
  }

  // 10. Buat PeristiwaKependudukan untuk setiap anggota
  for (const anggota of anggotaList) {
    await txDb.peristiwaKependudukan.create({
      data: {
        desaId,
        jenisPeristiwa: 'MUTASI_KK',
        pendudukId: anggota.id,
        kkId: newKK.id,
        tanggalPeristiwa: tanggalMutasi,
        keterangan: JSON.stringify({
          jenisMutasi: 'pecah-kk',
          kkAsalId,
          kkAsalNomor: kkAsal?.nomorKK,
          kkBaruId: newKK.id,
          kkBaruNomor: newKK.nomorKK,
          isKepalaBaru: anggota.id === kepalaKKBaruId,
          catatan: keterangan || null,
        }),
        alamatAsal: kkAsal?.alamat || null,
        alamatTujuan: kkBaru.alamat || null,
        isProcessed: true,
      },
    });
  }

  return {
    mutasiBerhasil: anggotaList.length,
    detail,
    gantiKepala: gantiKepalaResult,
    kkDinonaktifkan: kkDinonaktifkanResult,
    kkBaru: {
      id: newKK.id,
      nomorKK: newKK.nomorKK,
      alamat: newKK.alamat,
    },
  };
}
