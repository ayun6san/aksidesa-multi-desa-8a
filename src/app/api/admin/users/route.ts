/**
 * API untuk manajemen user oleh Super Admin
 * GET: List semua user (with pagination)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';

// GET - List semua user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Hanya Super Admin yang bisa mengakses' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const desaId = searchParams.get('desaId');
    const kecamatan = searchParams.get('kecamatan');
    const kabupaten = searchParams.get('kabupaten');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);

    const where: Record<string, unknown> = {};

    if (role) {
      where.role = role;
    }

    // Desa filters (can combine desaId, kecamatan, kabupaten)
    const desaFilter: Record<string, unknown> = {};
    if (desaId) desaFilter.id = desaId;
    if (kecamatan) desaFilter.kecamatan = kecamatan;
    if (kabupaten) desaFilter.kabupaten = kabupaten;
    if (Object.keys(desaFilter).length > 0) {
      where.desa = desaFilter;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { namaLengkap: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          namaLengkap: true,
          username: true,
          email: true,
          noHp: true,
          role: true,
          status: true,
          avatar: true,
          isFirstChild: true,
          wajibGantiPassword: true,
          lastLoginAt: true,
          failedLoginCount: true,
          lockedUntil: true,
          createdAt: true,
          updatedAt: true,
          desaId: true,
          desa: {
            select: {
              id: true,
              namaDesa: true,
              slug: true,
              kecamatan: true,
              kabupaten: true,
            },
          },
          sessions: {
            where: { isActive: true },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    const usersWithOnline = users.map((u) => ({
      ...u,
      isOnline: u.sessions.length > 0,
      sessions: undefined,
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: usersWithOnline,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
