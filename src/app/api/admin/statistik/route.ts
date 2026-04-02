/**
 * API untuk statistik nasional (Dashboard Super Admin)
 * Menampilkan ringkasan semua desa
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Hanya Super Admin yang bisa mengakses' },
        { status: 403 }
      );
    }

    // Get basic counts
    const [
      totalDesa,
      activeDesa,
      totalUsers,
      totalAdminDesa,
      totalOperator,
      totalWarga,
    ] = await Promise.all([
      db.desa.count(),
      db.desa.count({ where: { isActive: true } }),
      db.user.count(),
      db.user.count({ where: { role: 'ADMIN_DESA' } }),
      db.user.count({ where: { role: 'OPERATOR' } }),
      db.user.count({ where: { role: 'WARGA' } }),
    ]);

    // Get desa with nested dusun/rw/rt for counting
    const desaList = await db.desa.findMany({
      where: { isActive: true },
      include: {
        dusun: {
          include: {
            rw: {
              include: {
                rt: true,
              },
            },
          },
        },
      },
    });

    // Calculate dusun/rw/rt counts from the already-fetched nested data (no extra queries)
    let totalDusun = 0;
    let totalRW = 0;
    let totalRT = 0;

    // Build a mapping of dusunId -> desaId from the fetched data
    const dusunToDesa: Record<string, string> = {};
    const allDusunIds: string[] = [];

    for (const desa of desaList) {
      totalDusun += desa.dusun.length;

      for (const dusun of desa.dusun) {
        totalRW += dusun.rw.length;
        dusunToDesa[dusun.id] = desa.id;
        allDusunIds.push(dusun.id);

        for (const rw of dusun.rw) {
          totalRT += rw.rt.length;
        }
      }
    }

    // Get all active desa IDs
    const activeDesaIds = desaList.map(d => d.id);

    // FIX: Use direct desaId from KK and Penduduk models (not through Dusun chain)
    // KK and Penduduk both have a direct desaId field - using it is more accurate
    // and includes KK/Penduduk without a dusunId
    const [totalKK, totalPenduduk] = await Promise.all([
      db.kK.count({
        where: {
          desaId: { in: activeDesaIds },
          isActive: true,
        },
      }),
      db.penduduk.count({
        where: {
          desaId: { in: activeDesaIds },
          isActive: true,
        },
      }),
    ]);

    // Count KK per desa for per-desa breakdown
    const kkPerDesa = await db.kK.groupBy({
      by: ['desaId'],
      where: {
        desaId: { in: activeDesaIds },
        isActive: true,
      },
      _count: { id: true },
    });
    const kkCountByDesa: Record<string, number> = {};
    for (const item of kkPerDesa) {
      kkCountByDesa[item.desaId] = item._count.id;
    }

    // Count Penduduk per desa for per-desa breakdown
    const pendudukPerDesa = await db.penduduk.groupBy({
      by: ['desaId'],
      where: {
        desaId: { in: activeDesaIds },
        isActive: true,
      },
      _count: { id: true },
    });
    const pendudukCountByDesa: Record<string, number> = {};
    for (const item of pendudukPerDesa) {
      pendudukCountByDesa[item.desaId] = item._count.id;
    }

    // Get recent activities
    const recentActivities = await db.logAktivitas.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            namaLengkap: true,
            username: true,
            role: true,
            desa: {
              select: {
                namaDesa: true,
              },
            },
          },
        },
      },
    });

    // Get desa by paket
    const desaByPaket = await db.desa.groupBy({
      by: ['paket'],
      _count: true,
    });

    // Get recent desa registrations
    const recentDesa = await db.desa.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        namaDesa: true,
        slug: true,
        kecamatan: true,
        kabupaten: true,
        paket: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            dusun: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalDesa,
          activeDesa,
          inactiveDesa: totalDesa - activeDesa,
          totalUsers,
          totalAdminDesa,
          totalOperator,
          totalWarga,
          totalDusun,
          totalRW,
          totalRT,
          totalKK,
          totalPenduduk,
        },
        desaByPaket: desaByPaket.map(item => ({
          paket: item.paket,
          count: item._count,
        })),
        recentDesa,
        recentActivities: recentActivities.map(activity => ({
          id: activity.id,
          aksi: activity.aksi,
          modul: activity.modul,
          deskripsi: activity.deskripsi,
          createdAt: activity.createdAt,
          user: activity.user ? {
            namaLengkap: activity.user.namaLengkap,
            username: activity.user.username,
            role: activity.user.role,
            desa: activity.user.desa?.namaDesa || null,
          } : null,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting statistik:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
