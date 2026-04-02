import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - Get population statistics
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
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const dusunId = searchParams.get('dusunId') || '';
    const rwId = searchParams.get('rwId') || '';
    const rtId = searchParams.get('rtId') || '';

    // Build base where clause - map wilayah filter to KK IDs (Penduduk has no rtId field)
    const where: Record<string, unknown> = {};
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }
    if (rtId) {
      const kks = await db.kK.findMany({ where: { rtId, isActive: true }, select: { id: true } });
      if (kks.length > 0) where.kkId = { in: kks.map(k => k.id) };
      else where.kkId = { in: ['__none__'] };
    } else if (rwId) {
      const rw = await db.rW.findFirst({ where: { id: rwId }, include: { rt: { select: { id: true } } } });
      if (rw && rw.rt.length > 0) {
        const kks = await db.kK.findMany({ where: { rtId: { in: rw.rt.map(r => r.id) }, isActive: true }, select: { id: true } });
        if (kks.length > 0) where.kkId = { in: kks.map(k => k.id) };
        else where.kkId = { in: ['__none__'] };
      }
    } else if (dusunId) {
      const kks = await db.kK.findMany({ where: { dusunId, isActive: true }, select: { id: true } });
      if (kks.length > 0) where.kkId = { in: kks.map(k => k.id) };
      else where.kkId = { in: ['__none__'] };
    }

    // Build kkWhere for totalKK count (filter KK directly by wilayah fields)
    const kkWhere: Record<string, unknown> = { isActive: true };
    if (desaAccess.desaId) kkWhere.desaId = desaAccess.desaId;
    if (rtId) {
      kkWhere.rtId = rtId;
    } else if (rwId) {
      const rwRts = await db.rT.findMany({ where: { rwId }, select: { id: true } });
      if (rwRts.length > 0) kkWhere.rtId = { in: rwRts.map(r => r.id) };
      else kkWhere.id = { in: ['__none__'] };
    } else if (dusunId) {
      kkWhere.dusunId = dusunId;
    }

    // Count totalKK with same wilayah filter as penduduk
    const totalKK = await db.kK.count({ where: kkWhere });

    // Run all aggregations in parallel
    const [
      totalPenduduk,
      // Jenis Kelamin
      lakiLaki,
      perempuan,
      // Status Penduduk
      statusTetap,
      statusPendatang,
      statusPindah,
      statusMeninggal,
      // Perkawinan
      belumKawin,
      kawinTercatat,
      kawinTidakTercatat,
      ceraiHidupTercatat,
      ceraiHidupTidakTercatat,
      ceraiMati,
      // Hubungan dalam KK
      hkKepala,
      hkSuami,
      hkIstri,
      hkAnak,
      hkAnakTiri,
      hkAnakAngkat,
      hkMenantu,
      hkMertua,
      hkCucu,
      hkKakek,
      hkNenek,
      hkOrangTua,
      hkFamiliLain,
      hkPembantu,
      hkLainnya,
      // Kewarganegaraan
      wni,
      wna,
      wnaNegaraAsalData,
      // Disabilitas
      disabilitas,
      // Agama distribution
      agamaIslam,
      agamaKristen,
      agamaKatolik,
      agamaHindu,
      agamaBuddha,
      agamaKonghucu,
      agamaLainnya,
      // Pendidikan distribution (by hierarchy level)
      pendTidakSekolah,
      pendSD,
      pendSMP,
      pendSMA,
      pendD1,
      pendD2,
      pendD3,
      pendS1,
      pendS2,
      pendS3,
      pendTotalWithPendidikan,
      // Pekerjaan distribution
      pekerjaanData,
      // Golongan darah
      golDarahData,
      golDarahTidakTahu,
      // Pendatang stats
      pendatangAktif,
      pendatangPulang,
      // Median age
      medianAgeResult,
      // Dependency ratio age groups (0-14, 15-64, 65+)
      youthCountResult,
      productiveCountResult,
      oldAgeCountResult,
      // Growth data this month
      kelahiranBulanIni,
      kematianBulanIni,
      pindahMasukBulanIni,
      pindahKeluarBulanIni,
      // Disabilitas breakdown by type
      disabilitasBreakdownRaw,
      // Umur produktif breakdown (5 buckets)
      umurProduktifRaw,
      // Mutasi trend last 12 months
      mutasiTrendRaw,
      // Status KTP
      statusKTPBelumBuat,
      statusKTPSudahBuat,
      statusKTPHilang,
      statusKTPDalamProses,
      // Piramida Penduduk
      piramidaPendudukRaw,
      // Status Anak (Yatim/Piatu)
      statusAnakBukanYatimPiatu,
      statusAnakYatim,
      statusAnakPiatu,
      statusAnakYatimPiatu,
    ] = await Promise.all([
      // Total
      db.penduduk.count({ where: { ...where, status: 'TETAP' } }),
      // JK
      db.penduduk.count({ where: { ...where, jenisKelamin: 'LAKI_LAKI', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, jenisKelamin: 'PEREMPUAN', status: 'TETAP' } }),
      // Status
      db.penduduk.count({ where: { ...where, status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, status: 'PENDATANG' } }),
      db.penduduk.count({ where: { ...where, status: 'PINDAH' } }),
      db.penduduk.count({ where: { ...where, status: 'MENINGGAL' } }),
      // Perkawinan
      db.penduduk.count({ where: { ...where, statusPerkawinan: 'BELUM_KAWIN', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusPerkawinan: 'KAWIN_TERCATAT', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusPerkawinan: 'KAWIN_TIDAK_TERCATAT', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusPerkawinan: 'CERAI_HIDUP_TERCATAT', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusPerkawinan: 'CERAI_HIDUP_TIDAK_TERCATAT', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusPerkawinan: 'CERAI_MATI', status: 'TETAP' } }),
      // Hubungan dalam KK
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'KEPALA_KELUARGA', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'SUAMI', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'ISTRI', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'ANAK', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'ANAK_TIRI', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'ANAK_ANGKAT', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'MENANTU', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'MERTUA', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'CUCU', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'KAKEK', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'NENEK', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'ORANG_TUA', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'FAMILI_LAIN', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'PEMBANTU', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, hubunganKeluarga: 'LAINNYA', status: 'TETAP' } }),
      // Kewarganegaraan
      db.penduduk.count({ where: { ...where, kewarganegaraan: 'WNI', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, kewarganegaraan: 'WNA', status: 'TETAP' } }),
      // Kewarganegaraan - WNA breakdown by negara asal
      db.penduduk.groupBy({
        by: ['negaraAsal'],
        where: { ...where, kewarganegaraan: 'WNA', status: 'TETAP', negaraAsal: { not: null } },
        _count: true,
        orderBy: { _count: { negaraAsal: 'desc' } },
      }),
      // Disabilitas
      db.penduduk.count({ where: { ...where, jenisDisabilitas: { not: 'TIDAK_ADA' }, status: 'TETAP' } }),
      // Agama
      db.penduduk.count({ where: { ...where, agama: 'ISLAM', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, agama: 'KRISTEN', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, agama: 'KATOLIK', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, agama: 'HINDU', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, agama: 'BUDDHA', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, agama: 'KONGHUCU', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, agama: 'LAINNYA', status: 'TETAP' } }),
      // Pendidikan - count by hierarchy level (not groupBy, to ensure correct order)
      db.penduduk.count({ where: { ...where, pendidikan: 'Tidak/Belum Sekolah', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, pendidikan: 'SD/Sederajat', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, pendidikan: 'SMP/Sederajat', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, pendidikan: 'SMA/Sederajat', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, pendidikan: 'D1', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, pendidikan: 'D2', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, pendidikan: 'D3', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, pendidikan: 'D4/S1', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, pendidikan: 'S2', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, pendidikan: 'S3', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, status: 'TETAP', pendidikan: { not: null } } }),
      // Pekerjaan - groupBy top 10
      db.penduduk.groupBy({
        by: ['pekerjaan'],
        where: { ...where, pekerjaan: { not: null }, status: 'TETAP' },
        _count: true,
        orderBy: { _count: { pekerjaan: 'desc' } },
        take: 10,
      }),
      // Golongan Darah - groupBy
      db.penduduk.groupBy({
        by: ['golonganDarah'],
        where: { ...where, golonganDarah: { not: null }, status: 'TETAP' },
        _count: true,
        orderBy: { _count: { golonganDarah: 'desc' } },
      }),
      // Golongan Darah - Tidak Tahu (null)
      db.penduduk.count({ where: { ...where, golonganDarah: null, status: 'TETAP' } }),
      // Pendatang stats
      db.pendatang.count({ where: { desaId: desaAccess.desaId || undefined, isActive: true } }),
      db.pendatang.count({ where: { desaId: desaAccess.desaId || undefined, isActive: false } }),
      // NEW: Median age - use raw SQL to calculate median
      db.$queryRawUnsafe<{ medianAge: number }[]>(
        `SELECT CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) as medianAge
         FROM Penduduk
         WHERE ${buildBaseWhere(where)} AND tanggalLahir IS NOT NULL AND status = 'TETAP'
         ORDER BY CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER)
         LIMIT 1
         OFFSET (SELECT COUNT(*) FROM Penduduk WHERE ${buildBaseWhere(where)} AND tanggalLahir IS NOT NULL AND status = 'TETAP') / 2`
      ).then(r => Number(r[0]?.medianAge || 0)),
      // NEW: Youth count (0-14)
      db.$queryRawUnsafe<{ count: number }[]>(
        `SELECT COUNT(*) as count FROM Penduduk WHERE ${buildBaseWhere(where)} AND tanggalLahir IS NOT NULL AND status = 'TETAP' AND CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 15`
      ).then(r => Number(r[0]?.count || 0)),
      // NEW: Productive age count (15-64)
      db.$queryRawUnsafe<{ count: number }[]>(
        `SELECT COUNT(*) as count FROM Penduduk WHERE ${buildBaseWhere(where)} AND tanggalLahir IS NOT NULL AND status = 'TETAP' AND CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) >= 15 AND CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 65`
      ).then(r => Number(r[0]?.count || 0)),
      // NEW: Old age count (65+)
      db.$queryRawUnsafe<{ count: number }[]>(
        `SELECT COUNT(*) as count FROM Penduduk WHERE ${buildBaseWhere(where)} AND tanggalLahir IS NOT NULL AND status = 'TETAP' AND CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) >= 65`
      ).then(r => Number(r[0]?.count || 0)),
      // NEW: Growth data - this month
      db.peristiwaKependudukan.count({
        where: {
          desaId: desaAccess.desaId || undefined,
          jenisPeristiwa: 'KELAHIRAN',
          tanggalPeristiwa: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      }),
      db.peristiwaKependudukan.count({
        where: {
          desaId: desaAccess.desaId || undefined,
          jenisPeristiwa: 'KEMATIAN',
          tanggalPeristiwa: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      }),
      db.peristiwaKependudukan.count({
        where: {
          desaId: desaAccess.desaId || undefined,
          jenisPeristiwa: 'PINDAH_MASUK',
          tanggalPeristiwa: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      }),
      db.peristiwaKependudukan.count({
        where: {
          desaId: desaAccess.desaId || undefined,
          jenisPeristiwa: 'PINDAH_KELUAR',
          tanggalPeristiwa: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
        },
      }),
      // Disabilitas breakdown by type
      db.penduduk.groupBy({
        by: ['jenisDisabilitas'],
        where: { ...where, jenisDisabilitas: { not: 'TIDAK_ADA' }, status: 'TETAP' },
        _count: true,
        orderBy: { _count: { jenisDisabilitas: 'desc' } },
      }),
      // NEW: Umur Produktif breakdown (5 buckets: 0-5, 6-14, 15-24, 25-64, 65+)
      db.penduduk.findMany({
        where: { ...where, tanggalLahir: { not: null }, status: 'TETAP' },
        select: { tanggalLahir: true },
      }).then(pendudukList => {
        const now = new Date();
        const buckets: Record<string, number> = {
          'Balita (0-5)': 0,
          'Anak-anak (6-14)': 0,
          'Remaja (15-24)': 0,
          'Dewasa Produktif (25-64)': 0,
          'Lansia (65+)': 0,
        };
        for (const p of pendudukList) {
          if (!p.tanggalLahir) continue;
          const birthDate = new Date(p.tanggalLahir);
          let age = now.getFullYear() - birthDate.getFullYear();
          const monthDiff = now.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age <= 5) buckets['Balita (0-5)']++;
          else if (age <= 14) buckets['Anak-anak (6-14)']++;
          else if (age <= 24) buckets['Remaja (15-24)']++;
          else if (age <= 64) buckets['Dewasa Produktif (25-64)']++;
          else buckets['Lansia (65+)']++;
        }
        return Object.entries(buckets).map(([label, count]) => ({ label, count }));
      }),
      // NEW: Mutasi trend last 12 months
      db.$queryRawUnsafe<{ bulan: string; jenisPeristiwa: string; count: number }[]>(
        `SELECT strftime('%Y-%m', tanggalPeristiwa) as bulan, jenisPeristiwa, COUNT(*) as count
         FROM PeristiwaKependudukan
         WHERE desaId = '${sanitizeId(desaAccess.desaId || '')}' AND tanggalPeristiwa >= date('now', '-12 months')
         GROUP BY bulan, jenisPeristiwa
         ORDER BY bulan`
      ).then(rows => rows.map(r => ({ bulan: r.bulan, jenisPeristiwa: r.jenisPeristiwa, count: Number(r.count) }))),
      // Status KTP
      db.penduduk.count({ where: { ...where, statusKTP: 'BELUM_BUAT', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusKTP: 'SUDAH_BUAT', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusKTP: 'HILANG', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusKTP: 'DALAM_PROSES', status: 'TETAP' } }),
      // Piramida Penduduk (age × gender)
      db.$queryRawUnsafe<{ range: string; lakiLaki: number; perempuan: number }[]>(
        `SELECT
          CASE
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 5 THEN '0-4'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 10 THEN '5-9'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 15 THEN '10-14'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 20 THEN '15-19'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 25 THEN '20-24'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 30 THEN '25-29'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 35 THEN '30-34'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 40 THEN '35-39'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 45 THEN '40-44'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 50 THEN '45-49'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 55 THEN '50-54'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 60 THEN '55-59'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 65 THEN '60-64'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 70 THEN '65-69'
            WHEN CAST((julianday('now') - julianday(datetime(tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER) < 75 THEN '70-74'
            ELSE '75+'
          END as range,
          SUM(CASE WHEN jenisKelamin = 'LAKI_LAKI' THEN 1 ELSE 0 END) as lakiLaki,
          SUM(CASE WHEN jenisKelamin = 'PEREMPUAN' THEN 1 ELSE 0 END) as perempuan
        FROM Penduduk
        WHERE ${buildBaseWhere(where)} AND tanggalLahir IS NOT NULL AND status = 'TETAP'
        GROUP BY range`
      ).then(rows => {
        const allRanges = ['0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39', '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75+'];
        const map = new Map(rows.map(r => [r.range as string, { range: r.range as string, lakiLaki: Number(r.lakiLaki), perempuan: Number(r.perempuan) }]));
        return allRanges.map(range => map.get(range) || { range, lakiLaki: 0, perempuan: 0 });
      }),
      // Status Anak (Yatim/Piatu)
      db.penduduk.count({ where: { ...where, statusAnak: 'BUKAN_YATIM_PIATU', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusAnak: 'YATIM', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusAnak: 'PIATU', status: 'TETAP' } }),
      db.penduduk.count({ where: { ...where, statusAnak: 'YATIM_PIATU', status: 'TETAP' } }),
    ]);

    // Calculate dependency ratios
    const youthRatio = productiveCountResult > 0 ? Math.round((youthCountResult / productiveCountResult) * 1000) / 10 : 0;
    const oldAgeRatio = productiveCountResult > 0 ? Math.round((oldAgeCountResult / productiveCountResult) * 1000) / 10 : 0;
    const totalDependencyRatio = Math.round((youthRatio + oldAgeRatio) * 10) / 10;

    // Calculate density (penduduk / totalKK)
    const kepadatan = totalKK > 0 ? Math.round((totalPenduduk / totalKK) * 10) / 10 : 0;

    // Build response
    const total = totalPenduduk;
    const pct = (n: number) => total > 0 ? Math.round((n / total) * 1000) / 10 : 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalPenduduk,
          totalKK,
          lakiLaki,
          perempuan,
          sexRatio: perempuan > 0 ? Math.round((lakiLaki / perempuan) * 1000) / 100 : 0,
          rataAnggotaKK: totalKK > 0 ? Math.round((totalPenduduk / totalKK) * 10) / 10 : 0,
          pendatangAktif,
          pendatangPulang,
          disabilitas,
          // NEW fields
          medianUsia: medianAgeResult,
          kepadatan,
          dependencyRatio: {
            total: totalDependencyRatio,
            youth: youthRatio,
            oldAge: oldAgeRatio,
          },
          totalYatimPiatu: statusAnakYatim + statusAnakPiatu + statusAnakYatimPiatu,
          growthData: {
            kelahiranBulanIni,
            kematianBulanIni,
            pindahMasukBulanIni,
            pindahKeluarBulanIni,
          },
        },
        jenisKelamin: {
          'Laki-laki': lakiLaki,
          'Perempuan': perempuan,
        },
        pendidikan: [
          { label: 'Tidak/Belum Sekolah', count: pendTidakSekolah, percentage: pct(pendTidakSekolah) },
          { label: 'SD/Sederajat', count: pendSD, percentage: pct(pendSD) },
          { label: 'SMP/Sederajat', count: pendSMP, percentage: pct(pendSMP) },
          { label: 'SMA/Sederajat', count: pendSMA, percentage: pct(pendSMA) },
          { label: 'D1', count: pendD1, percentage: pct(pendD1) },
          { label: 'D2', count: pendD2, percentage: pct(pendD2) },
          { label: 'D3', count: pendD3, percentage: pct(pendD3) },
          { label: 'D4/S1', count: pendS1, percentage: pct(pendS1) },
          { label: 'S2', count: pendS2, percentage: pct(pendS2) },
          { label: 'S3', count: pendS3, percentage: pct(pendS3) },
        ],
        pekerjaan: pekerjaanData.map(p => ({
          label: p.pekerjaan || 'Tidak diisi',
          count: p._count,
          percentage: total > 0 ? Math.round((p._count / total) * 1000) / 10 : 0,
        })),
        statusPerkawinan: {
          'Belum Kawin': { count: belumKawin, percentage: pct(belumKawin) },
          'Kawin Tercatat': { count: kawinTercatat, percentage: pct(kawinTercatat) },
          'Kawin Tidak Tercatat': { count: kawinTidakTercatat, percentage: pct(kawinTidakTercatat) },
          'Cerai Hidup Tercatat': { count: ceraiHidupTercatat, percentage: pct(ceraiHidupTercatat) },
          'Cerai Hidup Tidak Tercatat': { count: ceraiHidupTidakTercatat, percentage: pct(ceraiHidupTidakTercatat) },
          'Cerai Mati': { count: ceraiMati, percentage: pct(ceraiMati) },
        },
        hubunganKeluarga: [
          { label: 'Kepala Keluarga', count: hkKepala, percentage: pct(hkKepala) },
          { label: 'Istri', count: hkIstri, percentage: pct(hkIstri) },
          { label: 'Suami', count: hkSuami, percentage: pct(hkSuami) },
          { label: 'Anak', count: hkAnak, percentage: pct(hkAnak) },
          { label: 'Anak Tiri', count: hkAnakTiri, percentage: pct(hkAnakTiri) },
          { label: 'Anak Angkat', count: hkAnakAngkat, percentage: pct(hkAnakAngkat) },
          { label: 'Cucu', count: hkCucu, percentage: pct(hkCucu) },
          { label: 'Kakek', count: hkKakek, percentage: pct(hkKakek) },
          { label: 'Nenek', count: hkNenek, percentage: pct(hkNenek) },
          { label: 'Orang Tua', count: hkOrangTua, percentage: pct(hkOrangTua) },
          { label: 'Mertua', count: hkMertua, percentage: pct(hkMertua) },
          { label: 'Menantu', count: hkMenantu, percentage: pct(hkMenantu) },
          { label: 'Famili Lain', count: hkFamiliLain, percentage: pct(hkFamiliLain) },
          { label: 'Pembantu', count: hkPembantu, percentage: pct(hkPembantu) },
          { label: 'Lainnya', count: hkLainnya, percentage: pct(hkLainnya) },
        ],
        agama: {
          'Islam': { count: agamaIslam, percentage: pct(agamaIslam) },
          'Kristen': { count: agamaKristen, percentage: pct(agamaKristen) },
          'Katolik': { count: agamaKatolik, percentage: pct(agamaKatolik) },
          'Hindu': { count: agamaHindu, percentage: pct(agamaHindu) },
          'Buddha': { count: agamaBuddha, percentage: pct(agamaBuddha) },
          'Konghucu': { count: agamaKonghucu, percentage: pct(agamaKonghucu) },
          'Lainnya': { count: agamaLainnya, percentage: pct(agamaLainnya) },
        },
        golonganDarah: [
          ...golDarahData.map(g => ({
            label: g.golonganDarah || 'Tidak diisi',
            count: g._count,
            percentage: total > 0 ? Math.round((g._count / total) * 1000) / 10 : 0,
          })),
          { label: 'Tidak Tahu', count: golDarahTidakTahu, percentage: pct(golDarahTidakTahu) },
        ],
        kewarganegaraan: {
          'WNI': wni,
          'WNA': wna,
          wnaNegaraAsal: wnaNegaraAsalData.map(d => ({
            negara: d.negaraAsal || 'Tidak diketahui',
            count: d._count,
          })),
        },
        statusPenduduk: {
          'Tetap': statusTetap,
          'Pendatang': statusPendatang,
          'Pindah': statusPindah,
          'Meninggal': statusMeninggal,
        },
        // NEW: disabilitas breakdown by type
        disabilitas: disabilitasBreakdownRaw.map(d => ({
          label: d.jenisDisabilitas.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
          count: d._count,
          percentage: disabilitas > 0 ? Math.round((d._count / disabilitas) * 1000) / 10 : 0,
        })),
        // NEW: umur produktif breakdown
        umurProduktif: umurProduktifRaw.map(d => ({
          label: d.label,
          count: d.count,
          percentage: totalPenduduk > 0 ? Math.round((d.count / totalPenduduk) * 1000) / 10 : 0,
        })),
        // NEW: mutasi trend (last 12 months)
        mutasiTrend: buildMutasiTrend(mutasiTrendRaw),
        // Status KTP
        statusKTP: [
          { label: 'Belum Buat', count: statusKTPBelumBuat, percentage: pct(statusKTPBelumBuat) },
          { label: 'Sudah Buat', count: statusKTPSudahBuat, percentage: pct(statusKTPSudahBuat) },
          { label: 'Hilang', count: statusKTPHilang, percentage: pct(statusKTPHilang) },
          { label: 'Dalam Proses', count: statusKTPDalamProses, percentage: pct(statusKTPDalamProses) },
        ],
        // Piramida Penduduk (age × gender)
        piramidaPenduduk: piramidaPendudukRaw,
        // Status Anak (Yatim/Piatu)
        statusAnak: [
          { label: 'Bukan Yatim Piatu', count: statusAnakBukanYatimPiatu, percentage: pct(statusAnakBukanYatimPiatu) },
          { label: 'Yatim', count: statusAnakYatim, percentage: pct(statusAnakYatim) },
          { label: 'Piatu', count: statusAnakPiatu, percentage: pct(statusAnakPiatu) },
          { label: 'Yatim Piatu', count: statusAnakYatimPiatu, percentage: pct(statusAnakYatimPiatu) },
        ],
      },
    });
  } catch (error) {
    console.error('Error fetching statistik:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data statistik' },
      { status: 500 }
    );
  }
}

// Build mutasi trend data: pivot bulan × jenisPeristiwa
function buildMutasiTrend(
  rows: { bulan: string; jenisPeristiwa: string; count: number }[]
): { bulan: string; kelahiran: number; kematian: number; pindahMasuk: number; pindahKeluar: number; perkawinan: number; perceraian: number; pengadopsian: number; mutasiKK: number }[] {
  // Generate last 12 months
  const months: { bulan: string; kelahiran: number; kematian: number; pindahMasuk: number; pindahKeluar: number; perkawinan: number; perceraian: number; pengadopsian: number; mutasiKK: number }[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const bulan = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ bulan, kelahiran: 0, kematian: 0, pindahMasuk: 0, pindahKeluar: 0, perkawinan: 0, perceraian: 0, pengadopsian: 0, mutasiKK: 0 });
  }
  // Fill from raw rows
  const map = new Map(rows.map(r => [`${r.bulan}::${r.jenisPeristiwa}`, r.count]));
  for (const m of months) {
    m.kelahiran = map.get(`${m.bulan}::KELAHIRAN`) || 0;
    m.kematian = map.get(`${m.bulan}::KEMATIAN`) || 0;
    m.pindahMasuk = map.get(`${m.bulan}::PINDAH_MASUK`) || 0;
    m.pindahKeluar = map.get(`${m.bulan}::PINDAH_KELUAR`) || 0;
    m.perkawinan = map.get(`${m.bulan}::PERKAWINAN`) || 0;
    m.perceraian = map.get(`${m.bulan}::PERCERAIAN`) || 0;
    m.pengadopsian = map.get(`${m.bulan}::PENGADOPSIAN`) || 0;
    m.mutasiKK = map.get(`${m.bulan}::MUTASI_KK`) || 0;
  }
  return months;
}

// Build SQL WHERE clause from Prisma where object
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}
function buildBaseWhere(where: Record<string, unknown>): string {
  const conditions: string[] = [];

  if (where.desaId) {
    conditions.push(`desaId = '${sanitizeId(where.desaId as string)}'`);
  }
  if (where.kkId) {
    if (typeof where.kkId === 'object' && 'in' in (where.kkId as object)) {
      const ids = ((where.kkId as { in: string[] }).in).map(id => `'${sanitizeId(id)}'`).join(',');
      if (ids) conditions.push(`kkId IN (${ids})`);
      else conditions.push('0=1');
    } else {
      conditions.push(`kkId = '${sanitizeId(where.kkId as string)}'`);
    }
  }

  return conditions.length > 0 ? conditions.join(' AND ') : '1=1';
}
