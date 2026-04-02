import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JenisPeristiwa, JenisKelamin, StatusPenduduk } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - Get monitoring data (summary statistics)
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Silakan login terlebih dahulu' },
        { status: 401 }
      );
    }

    // Validate desa access
    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak' },
        { status: 403 }
      );
    }

    // Get desaId filter
    const desaId = desaAccess.desaId;

    const searchParams = request.nextUrl.searchParams;
    const tahun = parseInt(searchParams.get('tahun') || new Date().getFullYear().toString());
    const bulan = parseInt(searchParams.get('bulan') || (new Date().getMonth() + 1).toString());

    // Build base where clause with desaId filter
    const pendudukWhere = {
      status: StatusPenduduk.TETAP,
      isActive: true,
      ...(desaId ? { desaId } : {}),
    };

    const kkWhere = {
      isActive: true,
      ...(desaId ? { desaId } : {}),
    };

    const pendatangWhere = {
      isActive: true,
      ...(desaId ? { desaId } : {}),
    };

    const peristiwaWhere = {
      ...(desaId ? { desaId } : {}),
    };

    const dusunWhere = {
      ...(desaId ? { desaId } : {}),
    };

    // Get current statistics
    const [
      totalPenduduk,
      totalLakiLaki,
      totalPerempuan,
      totalKK,
      pendatangAktif,
    ] = await Promise.all([
      db.penduduk.count({ where: pendudukWhere }),
      db.penduduk.count({
        where: { 
          ...pendudukWhere,
          jenisKelamin: JenisKelamin.LAKI_LAKI 
        }
      }),
      db.penduduk.count({
        where: { 
          ...pendudukWhere,
          jenisKelamin: JenisKelamin.PEREMPUAN 
        }
      }),
      db.kK.count({ where: kkWhere }),
      db.pendatang.count({ where: pendatangWhere }),
    ]);

    // Get peristiwa statistics for the month
    const startOfMonth = new Date(tahun, bulan - 1, 1);
    const endOfMonth = new Date(tahun, bulan, 0, 23, 59, 59);

    const [
      kelahiran,
      kematian,
      pindahMasuk,
      pindahKeluar,
      perkawinan,
      perceraian,
    ] = await Promise.all([
      db.peristiwaKependudukan.count({
        where: {
          ...peristiwaWhere,
          jenisPeristiwa: JenisPeristiwa.KELAHIRAN,
          tanggalPeristiwa: { gte: startOfMonth, lte: endOfMonth }
        }
      }),
      db.peristiwaKependudukan.count({
        where: {
          ...peristiwaWhere,
          jenisPeristiwa: JenisPeristiwa.KEMATIAN,
          tanggalPeristiwa: { gte: startOfMonth, lte: endOfMonth }
        }
      }),
      db.peristiwaKependudukan.count({
        where: {
          ...peristiwaWhere,
          jenisPeristiwa: JenisPeristiwa.PINDAH_MASUK,
          tanggalPeristiwa: { gte: startOfMonth, lte: endOfMonth }
        }
      }),
      db.peristiwaKependudukan.count({
        where: {
          ...peristiwaWhere,
          jenisPeristiwa: JenisPeristiwa.PINDAH_KELUAR,
          tanggalPeristiwa: { gte: startOfMonth, lte: endOfMonth }
        }
      }),
      db.peristiwaKependudukan.count({
        where: {
          ...peristiwaWhere,
          jenisPeristiwa: JenisPeristiwa.PERKAWINAN,
          tanggalPeristiwa: { gte: startOfMonth, lte: endOfMonth }
        }
      }),
      db.peristiwaKependudukan.count({
        where: {
          ...peristiwaWhere,
          jenisPeristiwa: JenisPeristiwa.PERCERAIAN,
          tanggalPeristiwa: { gte: startOfMonth, lte: endOfMonth }
        }
      }),
    ]);

    // Get statistics by dusun
    const dusunStats = await db.dusun.findMany({
      where: dusunWhere,
      include: {
        _count: {
          select: {
            kk: { where: { isActive: true } }
          }
        }
      }
    });

    // Get penduduk count per dusun through KK
    const pendudukPerDusun = await db.penduduk.groupBy({
      by: ['kkId'],
      where: pendudukWhere,
      _count: { id: true }
    });

    // Get KK to Dusun mapping (only from same desa)
    const kkDusunMap = await db.kK.findMany({
      where: { 
        ...kkWhere,
        dusunId: { not: null } 
      },
      select: { id: true, dusunId: true }
    });
    const kkToDusun: Record<string, string> = {};
    kkDusunMap.forEach(kk => {
      if (kk.dusunId) kkToDusun[kk.id] = kk.dusunId;
    });

    // Calculate penduduk count per dusun
    const pendudukCountPerDusun: Record<string, number> = {};
    pendudukPerDusun.forEach(p => {
      if (p.kkId && kkToDusun[p.kkId]) {
        const dusunId = kkToDusun[p.kkId];
        pendudukCountPerDusun[dusunId] = (pendudukCountPerDusun[dusunId] || 0) + p._count.id;
      }
    });

    // Get monthly data for the year (for charts)
    // Single query: fetch all peristiwa for the entire year, then group by month in JS
    const yearStart = new Date(tahun, 0, 1);
    const yearEnd = new Date(tahun, 11, 31, 23, 59, 59);

    const allYearPeristiwa = await db.peristiwaKependudukan.findMany({
      where: {
        ...peristiwaWhere,
        tanggalPeristiwa: { gte: yearStart, lte: yearEnd },
      },
      select: {
        jenisPeristiwa: true,
        tanggalPeristiwa: true,
      },
    });

    // Group by month in JavaScript (0 queries)
    const monthlyCounters: Record<number, {
      kelahiran: number;
      kematian: number;
      pindahMasuk: number;
      pindahKeluar: number;
    }> = {};
    for (let m = 0; m < 12; m++) {
      monthlyCounters[m] = { kelahiran: 0, kematian: 0, pindahMasuk: 0, pindahKeluar: 0 };
    }

    for (const p of allYearPeristiwa) {
      const month = p.tanggalPeristiwa.getMonth(); // 0-indexed
      switch (p.jenisPeristiwa) {
        case JenisPeristiwa.KELAHIRAN:
          monthlyCounters[month].kelahiran++;
          break;
        case JenisPeristiwa.KEMATIAN:
          monthlyCounters[month].kematian++;
          break;
        case JenisPeristiwa.PINDAH_MASUK:
          monthlyCounters[month].pindahMasuk++;
          break;
        case JenisPeristiwa.PINDAH_KELUAR:
          monthlyCounters[month].pindahKeluar++;
          break;
      }
    }

    const monthlyData = Array.from({ length: 12 }, (_, m) => ({
      bulan: m + 1,
      namaBulan: new Date(tahun, m, 1).toLocaleString('id-ID', { month: 'long' }),
      ...monthlyCounters[m],
    }));

    // Get age distribution
    const pendudukWithAge = await db.penduduk.findMany({
      where: pendudukWhere,
      select: { tanggalLahir: true, jenisKelamin: true }
    });

    const now = new Date();
    const ageGroups = {
      '0-5': { lakiLaki: 0, perempuan: 0 },
      '6-12': { lakiLaki: 0, perempuan: 0 },
      '13-17': { lakiLaki: 0, perempuan: 0 },
      '18-25': { lakiLaki: 0, perempuan: 0 },
      '26-40': { lakiLaki: 0, perempuan: 0 },
      '41-60': { lakiLaki: 0, perempuan: 0 },
      '60+': { lakiLaki: 0, perempuan: 0 },
    };

    pendudukWithAge.forEach(p => {
      if (!p.tanggalLahir) return;
      const age = Math.floor((now.getTime() - p.tanggalLahir.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      
      let group: keyof typeof ageGroups;
      if (age <= 5) group = '0-5';
      else if (age <= 12) group = '6-12';
      else if (age <= 17) group = '13-17';
      else if (age <= 25) group = '18-25';
      else if (age <= 40) group = '26-40';
      else if (age <= 60) group = '41-60';
      else group = '60+';

      if (p.jenisKelamin === JenisKelamin.LAKI_LAKI) {
        ageGroups[group].lakiLaki++;
      } else {
        ageGroups[group].perempuan++;
      }
    });

    // Get religion distribution
    const agamaStats = await db.penduduk.groupBy({
      by: ['agama'],
      where: pendudukWhere,
      _count: { id: true }
    });

    // Get pekerjaan distribution
    const pekerjaanStats = await db.penduduk.groupBy({
      by: ['pekerjaan'],
      where: pendudukWhere,
      _count: { id: true }
    });

    // Get pendidikan distribution
    const pendidikanStats = await db.penduduk.groupBy({
      by: ['pendidikan'],
      where: pendudukWhere,
      _count: { id: true }
    });

    // Get status perkawinan distribution
    const statusPerkawinanStats = await db.penduduk.groupBy({
      by: ['statusPerkawinan'],
      where: pendudukWhere,
      _count: { id: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        periode: { tahun, bulan },
        summary: {
          totalPenduduk,
          totalLakiLaki,
          totalPerempuan,
          totalKK,
          pendatangAktif,
        },
        peristiwaBulanIni: {
          kelahiran,
          kematian,
          pindahMasuk,
          pindahKeluar,
          perkawinan,
          perceraian,
        },
        dusunStats: dusunStats.map(d => ({
          id: d.id,
          nama: d.nama,
          jumlahPenduduk: pendudukCountPerDusun[d.id] || 0,
          jumlahKK: d._count.kk,
        })),
        monthlyData,
        ageDistribution: Object.entries(ageGroups).map(([group, counts]) => ({
          group,
          lakiLaki: counts.lakiLaki,
          perempuan: counts.perempuan,
          total: counts.lakiLaki + counts.perempuan,
        })),
        agamaDistribution: agamaStats.map(a => ({
          agama: a.agama,
          jumlah: a._count.id
        })),
        pekerjaanDistribution: pekerjaanStats.map(p => ({
          pekerjaan: p.pekerjaan || 'Tidak Diketahui',
          jumlah: p._count.id
        })),
        pendidikanDistribution: pendidikanStats.map(p => ({
          pendidikan: p.pendidikan || 'Tidak Diketahui',
          jumlah: p._count.id
        })),
        statusPerkawinanDistribution: statusPerkawinanStats.map(s => ({
          status: s.statusPerkawinan,
          jumlah: s._count.id
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching monitoring data:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data monitoring' },
      { status: 500 }
    );
  }
}
