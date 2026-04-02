import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Silakan login terlebih dahulu' },
        { status: 401 }
      );
    }

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak' },
        { status: 403 }
      );
    }

    const where: Record<string, unknown> = {
      ...(desaAccess.desaId ? { desaId: desaAccess.desaId } : {}),
    };

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [stats, thisMonthStats, unprocessedStats] = await Promise.all([
      db.peristiwaKependudukan.groupBy({
        by: ['jenisPeristiwa'],
        where,
        _count: { id: true },
      }),
      db.peristiwaKependudukan.count({
        where: {
          ...where,
          createdAt: { gte: firstOfMonth },
        },
      }),
      db.peristiwaKependudukan.count({
        where: {
          ...where,
          isProcessed: false,
        },
      }),
    ]);

    const perJenis: Record<string, number> = {};
    stats.forEach(s => {
      perJenis[s.jenisPeristiwa] = s._count.id;
    });

    const total = Object.values(perJenis).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      success: true,
      data: {
        total,
        bulanIni: thisMonthStats,
        belumDiproses: unprocessedStats,
        perJenis,
      },
    });
  } catch (error) {
    console.error('Error fetching peristiwa stats:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil statistik' },
      { status: 500 }
    );
  }
}
