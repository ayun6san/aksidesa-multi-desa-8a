import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - Fetch activity logs
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const modul = searchParams.get('modul');
    const userId = searchParams.get('userId');

    // Build where clause with desaId filter
    // For non-SUPER_ADMIN, only show logs from users in their desa
    const where: Record<string, unknown> = {};
    
    if (modul) where.modul = modul;
    if (userId) where.userId = userId;

    // Filter by desa - non-super admin can only see logs from their desa
    if (desaAccess.desaId) {
      where.user = { desaId: desaAccess.desaId };
    }

    const logs = await db.logAktivitas.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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
      }
    });

    const total = await db.logAktivitas.count({ where });

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// POST - Create activity log
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Silakan login terlebih dahulu' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const log = await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.namaLengkap,
        aksi: body.aksi,
        modul: body.modul,
        deskripsi: body.deskripsi,
        dataRef: body.dataRef ? JSON.stringify(body.dataRef) : null,
        deviceInfo: body.deviceInfo || null,
        ipAddress: body.ipAddress || null,
        userAgent: body.userAgent || null,
      },
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error) {
    console.error('Error creating activity log:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
