import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserStatus, UserRole } from '@prisma/client';
import { getCurrentUser, requireAdminDesa, hashPassword } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// User Management API - v2 with Multi-Desa Support
// GET - List users with search, filter, pagination
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
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause with desaId filter
    const where: Record<string, unknown> = {
      // Filter by desaId - SUPER_ADMIN can see all, others only their desa
      ...(desaAccess.desaId ? { desaId: desaAccess.desaId } : {}),
    };
    
    if (search) {
      where.OR = [
        { namaLengkap: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }
    
    if (role) {
      where.role = role as UserRole;
    }
    
    if (status) {
      where.status = status as UserStatus;
    }

    // Get users and count
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
          isFirstChild: true,
          lastLoginAt: true,
          createdAt: true,
          desa: {
            select: {
              id: true,
              namaDesa: true,
            }
          },
          sessions: {
            where: { isActive: true },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    // Transform users data
    const transformedUsers = users.map(u => ({
      id: u.id,
      namaLengkap: u.namaLengkap,
      username: u.username,
      email: u.email,
      noHp: u.noHp,
      role: u.role,
      status: u.status,
      isFirstChild: u.isFirstChild,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      isOnline: u.sessions.length > 0,
      desa: u.desa,
    }));

    return NextResponse.json({
      success: true,
      data: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data user' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    // Auth check - require admin desa or higher
    const user = await requireAdminDesa();

    // Validate desa access
    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      namaLengkap,
      username,
      email,
      noHp,
      password,
      role,
      status,
      desaId: targetDesaId,
    } = body;

    // Validasi field wajib
    if (!namaLengkap || !username || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'Semua field wajib harus diisi' },
        { status: 400 }
      );
    }

    // Validasi password minimal 6 karakter
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Cek username sudah ada
    const existingUsername = await db.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'Username sudah digunakan' },
        { status: 400 }
      );
    }

    // Cek email sudah ada
    const existingEmail = await db.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Email sudah digunakan' },
        { status: 400 }
      );
    }

    // Determine desaId for new user
    // SUPER_ADMIN can specify any desaId, others can only create users in their own desa
    let userDesaId: string | null = null;
    if (role !== 'SUPER_ADMIN') {
      if (desaAccess.isSuperAdmin && targetDesaId) {
        // Super admin can specify desa
        const targetDesa = await db.desa.findUnique({ where: { id: targetDesaId } });
        if (!targetDesa) {
          return NextResponse.json(
            { success: false, error: 'Desa tidak ditemukan' },
            { status: 400 }
          );
        }
        userDesaId = targetDesaId;
      } else if (desaAccess.desaId) {
        // Non-super admin can only create in their own desa
        userDesaId = desaAccess.desaId;
      } else {
        return NextResponse.json(
          { success: false, error: 'User harus terikat ke desa' },
          { status: 400 }
        );
      }
    }

    // Non-super admin tidak bisa membuat SUPER_ADMIN
    if (!desaAccess.isSuperAdmin && role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang bisa membuat akun Super Admin' },
        { status: 403 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Buat user baru
    const newUser = await db.user.create({
      data: {
        namaLengkap,
        username,
        email,
        noHp: noHp || null,
        password: hashedPassword,
        role: role as UserRole,
        status: (status || 'ACTIVE') as UserStatus,
        desaId: userDesaId,
      },
      select: {
        id: true,
        namaLengkap: true,
        username: true,
        email: true,
        noHp: true,
        role: true,
        status: true,
        desaId: true,
        createdAt: true,
      },
    });

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.namaLengkap,
        aksi: 'CREATE',
        modul: 'USER',
        deskripsi: `Menambahkan user baru: ${newUser.namaLengkap} (${newUser.username})`,
        dataRef: JSON.stringify({ userId: newUser.id }),
      },
    });

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User berhasil ditambahkan',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal menambahkan user';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
