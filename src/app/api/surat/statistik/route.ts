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

    // Status map sesuai Prisma enum SuratStatus
    const statusMap: Record<string, number> = {
      DRAFT: 0,
      MENUNGGU_PROSES: 0,
      DALAM_PROSES: 0,
      MENUNGGU_APPROVAL: 0,
      DITOLAK_OPERATOR: 0,
      DITOLAK_KADES: 0,
      DISETUJUI: 0,
      DICETAK: 0,
      DIBATALKAN: 0,
      DIARSIPKAN: 0,
    };

    for (const sc of statusCounts) {
      statusMap[sc.status] = sc._count.id;
    }

    const totalSurat = Object.values(statusMap).reduce((a, b) => a + b, 0);

    // Batch-load ALL suratJenis records upfront to avoid N+1 queries
    const allJenisRecords = await db.suratJenis.findMany({
      select: { id: true, kategori: true, nama: true },
    });
    const jenisMap = new Map(allJenisRecords.map((j) => [j.id, j]));

    // Get kategori counts (no N+1 - using batch-loaded jenisMap)
    const kategoriCounts = await db.surat.groupBy({
      by: ['jenisSuratId'],
      where: baseWhere,
      _count: { id: true },
    });

    const kategoriMap: Record<string, number> = {};
    for (const kc of kategoriCounts) {
      const jenis = jenisMap.get(kc.jenisSuratId);
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
        // Selesai = DISETUJUI atau DICETAK atau DIARSIPKAN
        if (ms.status === 'DISETUJUI' || ms.status === 'DICETAK' || ms.status === 'DIARSIPKAN') {
          selesai += ms._count.id;
        }
        // Ditolak = DITOLAK_KADES atau DITOLAK_OPERATOR
        if (ms.status === 'DITOLAK_KADES' || ms.status === 'DITOLAK_OPERATOR') {
          ditolak += ms._count.id;
        }
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

    // Get top 5 most requested surat jenis (using batch-loaded jenisMap - no N+1)
    const topJenis = await db.surat.groupBy({
      by: ['jenisSuratId'],
      where: baseWhere,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const topJenisData = topJenis.map((tj) => {
      const jenis = jenisMap.get(tj.jenisSuratId);
      return {
        id: tj.jenisSuratId,
        nama: jenis?.nama || 'Unknown',
        kategori: jenis?.kategori || null,
        total: tj._count.id,
      };
    });

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

    // Hitung total ditolak (DITOLAK_KADES + DITOLAK_OPERATOR)
    const totalDitolak = statusMap.DITOLAK_KADES + statusMap.DITOLAK_OPERATOR;
    // Hitung total selesai (DISETUJUI + DICETAK + DIARSIPKAN)
    const totalSelesai = statusMap.DISETUJUI + statusMap.DICETAK + statusMap.DIARSIPKAN;
    // Pending = MENUNGGU_PROSES + DALAM_PROSES + MENUNGGU_APPROVAL
    const totalPending = statusMap.MENUNGGU_PROSES + statusMap.DALAM_PROSES + statusMap.MENUNGGU_APPROVAL;

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
            ? Math.round((totalSelesai / totalSurat) * 100)
            : 0,
          rejectionRate: totalSurat > 0
            ? Math.round((totalDitolak / totalSurat) * 100)
            : 0,
          pendingCount: totalPending,
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
 * Selesai = DISETUJUI, DICETAK, DIARSIPKAN
 */
async function getAverageProcessingDays(where: Record<string, unknown>): Promise<number> {
  const completedSurat = await db.surat.findMany({
    where: {
      ...where,
      status: { in: ['DISETUJUI', 'DICETAK', 'DIARSIPKAN'] },
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
