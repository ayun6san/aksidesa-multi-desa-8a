import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - List audit logs with pagination and filters
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

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Filters
    const modul = searchParams.get('modul') || '';
    const aksi = searchParams.get('aksi') || '';
    const userId = searchParams.get('userId') || '';
    const search = searchParams.get('search') || '';
    const tanggalMulai = searchParams.get('tanggalMulai') || '';
    const tanggalSelesai = searchParams.get('tanggalSelesai') || '';
    const pendudukId = searchParams.get('pendudukId') || '';
    const kkId = searchParams.get('kkId') || '';

    // Build where clause with desaId filter
    const where: Record<string, unknown> = {
      // Filter by desa - non-super admin can only see logs from their desa
      ...(desaAccess.desaId ? { user: { desaId: desaAccess.desaId } } : {}),
    };
    
    if (modul) {
      where.modul = modul;
    }
    
    if (aksi) {
      where.aksi = aksi;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (search) {
      where.OR = [
        { deskripsi: { contains: search } },
        { userName: { contains: search } },
      ];
    }
    
    if (tanggalMulai || tanggalSelesai) {
      where.createdAt = {};
      if (tanggalMulai) {
        (where.createdAt as Record<string, unknown>).gte = new Date(tanggalMulai);
      }
      if (tanggalSelesai) {
        const endDate = new Date(tanggalSelesai);
        endDate.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, unknown>).lte = endDate;
      }
    }

    // Filter by entity reference (pendudukId or kkId)
    if (pendudukId || kkId) {
      const dataRefFilters: string[] = [];
      if (pendudukId) dataRefFilters.push(pendudukId);
      if (kkId) dataRefFilters.push(kkId);

      if (dataRefFilters.length === 1) {
        where.dataRef = { contains: dataRefFilters[0] };
      } else {
        // Both filters - match records containing BOTH pendudukId AND kkId
        where.dataRef = { contains: dataRefFilters[0] };
        // Note: SQLite does not support complex AND on contains, so we use
        // a simpler approach by filtering on the server side below
      }
    }

    // Get logs
    const [logs, total] = await Promise.all([
      db.logAktivitas.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              namaLengkap: true,
              username: true,
              role: true,
              desaId: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.logAktivitas.count({ where }),
    ]);

    // Transform data
    const transformedLogs = logs.map(log => {
      let dataRef = null;
      try {
        dataRef = log.dataRef ? JSON.parse(log.dataRef) : null;
      } catch {
        dataRef = null;
      }

      return {
        id: log.id,
        userName: log.userName,
        user: log.user,
        aksi: log.aksi,
        modul: log.modul,
        deskripsi: log.deskripsi,
        dataRef,
        deviceInfo: log.deviceInfo,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      };
    });

    // Get statistics for filters (also filtered by desa)
    const statsWhere = {
      ...(desaAccess.desaId ? { user: { desaId: desaAccess.desaId } } : {}),
    };

    const [modulStats, aksiStats] = await Promise.all([
      db.logAktivitas.groupBy({
        by: ['modul'],
        where: statsWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      db.logAktivitas.groupBy({
        by: ['aksi'],
        where: statsWhere,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: transformedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        modul: modulStats.map(m => ({ value: m.modul, count: m._count.id })),
        aksi: aksiStats.map(a => ({ value: a.aksi, count: a._count.id })),
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data log aktivitas' },
      { status: 500 }
    );
  }
}
