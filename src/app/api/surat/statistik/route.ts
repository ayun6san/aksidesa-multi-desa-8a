import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET /api/surat/statistik - Get surat statistics for dashboard
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

    const { searchParams } = new URL(request.url);
    const desaId = searchParams.get('desaId');
    const periode = searchParams.get('periode') || 'bulan'; // 'bulan', 'tahun', 'total'

    // Determine desa filter
    const targetDesaId = user.role === 'SUPER_ADMIN' && desaId ? desaId : desaAccess.desaId;

    // Build base where clause
    const baseWhere: Record<string, unknown> = {};
    if (targetDesaId) {
      baseWhere.desaId = targetDesaId;
    }

    // Date filter based on periode
    const now = new Date();
    if (periode === 'bulan') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      baseWhere.createdAt = { gte: startOfMonth };
    } else if (periode === 'tahun') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      baseWhere.createdAt = { gte: startOfYear };
    }

    // Get status counts
    const statusCounts = await db.surat.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {
      DRAFT: 0,
      DIAJUKAN: 0,
      DIVERIFIKASI: 0,
      DIPROSES: 0,
      DICETAK: 0,
      DITANDATANGANI: 0,
      DITOLAK: 0,
      SELESAI: 0,
      DIBATALKAN: 0,
    };

    for (const sc of statusCounts) {
      statusMap[sc.status] = sc._count.id;
    }

    const totalSurat = Object.values(statusMap).reduce((a, b) => a + b, 0);

    // Get kategori counts
    const kategoriCounts = await db.surat.groupBy({
      by: ['jenisSuratId'],
      where: baseWhere,
      _count: { id: true },
    });

    const kategoriMap: Record<string, number> = {};
    for (const kc of kategoriCounts) {
      const jenis = await db.suratJenis.findUnique({
        where: { id: kc.jenisSuratId },
        select: { kategori: true, nama: true },
      });
      if (jenis) {
        const cat = jenis.kategori;
        kategoriMap[cat] = (kategoriMap[cat] || 0) + kc._count.id;
      }
    }

    // Get monthly trend (last 12 months)
    const monthlyTrend: { bulan: string; bulanNum: number; tahun: number; total: number; selesai: number; ditolak: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59);

      const monthWhere: Record<string, unknown> = { ...baseWhere };
      monthWhere.createdAt = { gte: startDate, lte: endDate };

      const monthStats = await db.surat.groupBy({
        by: ['status'],
        where: monthWhere,
        _count: { id: true },
      });

      let total = 0;
      let selesai = 0;
      let ditolak = 0;
      for (const ms of monthStats) {
        total += ms._count.id;
        if (ms.status === 'SELESAI' || ms.status === 'DITANDATANGANI') selesai += ms._count.id;
        if (ms.status === 'DITOLAK') ditolak += ms._count.id;
      }

      const bulanNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
      ];

      monthlyTrend.push({
        bulan: bulanNames[month],
        bulanNum: month + 1,
        tahun: year,
        total,
        selesai,
        ditolak,
      });
    }

    // Get top 5 most requested surat jenis
    const topJenis = await db.surat.groupBy({
      by: ['jenisSuratId'],
      where: baseWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topJenisData = await Promise.all(
      topJenis.map(async (tj) => {
        const jenis = await db.suratJenis.findUnique({
          where: { id: tj.jenisSuratId },
          select: { id: true, nama: true, kategori: true },
        });
        return {
          id: tj.jenisSuratId,
          nama: jenis?.nama || 'Unknown',
          kategori: jenis?.kategori || null,
          total: tj._count.id,
        };
      })
    );

    // Get recent surat (last 5)
    const recentSurat = await db.surat.findMany({
      where: baseWhere,
      include: {
        jenisSurat: {
          select: { id: true, nama: true, kategori: true },
        },
        pemohon: {
          select: { id: true, namaLengkap: true, nik: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Calculate performance metrics
    const avgProcessingDays = await getAverageProcessingDays(baseWhere);

    return NextResponse.json({
      success: true,
      data: {
        totalSurat,
        statusCounts: statusMap,
        kategoriCounts: kategoriMap,
        monthlyTrend,
        topJenis: topJenisData,
        recentSurat,
        metrics: {
          avgProcessingDays,
          completionRate: totalSurat > 0
            ? Math.round(((statusMap.SELESAI + statusMap.DITANDATANGANI) / totalSurat) * 100)
            : 0,
          rejectionRate: totalSurat > 0
            ? Math.round((statusMap.DITOLAK / totalSurat) * 100)
            : 0,
          pendingCount: statusMap.DIAJUKAN + statusMap.DIVERIFIKASI + statusMap.DIPROSES,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching surat statistik:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil statistik surat' },
      { status: 500 }
    );
  }
}

/**
 * Calculate average processing days (from submission to completion)
 */
async function getAverageProcessingDays(where: Record<string, unknown>): Promise<number> {
  const completedSurat = await db.surat.findMany({
    where: {
      ...where,
      status: { in: ['SELESAI', 'DITANDATANGANI'] },
      tanggalAjukan: { not: null },
      tanggalSelesai: { not: null },
    },
    select: {
      tanggalAjukan: true,
      tanggalSelesai: true,
    },
    take: 100,
  });

  if (completedSurat.length === 0) return 0;

  const totalDays = completedSurat.reduce((sum, s) => {
    if (s.tanggalAjukan && s.tanggalSelesai) {
      const diffMs = s.tanggalSelesai.getTime() - s.tanggalAjukan.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return sum + diffDays;
    }
    return sum;
  }, 0);

  return Math.round((totalDays / completedSurat.length) * 10) / 10;
}
