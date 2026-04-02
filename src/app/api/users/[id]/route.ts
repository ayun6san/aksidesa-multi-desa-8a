import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserStatus, UserRole } from '@prisma/client';
import { getCurrentUser, requireAdminDesa, hashPassword } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - Get single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Silakan login terlebih dahulu' },
        { status: 401 }
      );
    }

    const { id } = await params;
    
    const targetUser = await db.user.findUnique({
      where: { id },
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
        updatedAt: true,
        desaId: true,
        desa: {
          select: {
            id: true,
            namaDesa: true,
          }
        },
        sessions: {
          where: { isActive: true },
          select: {
            id: true,
            deviceInfo: true,
            lastActivityAt: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate desa access - user can only see users from same desa (except SUPER_ADMIN)
    const desaAccess = await validateDesaAccess(user, targetUser.desaId || undefined);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak - Anda tidak dapat mengakses user dari desa lain' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: targetUser,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data user' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check - require admin desa or higher
    const user = await requireAdminDesa();

    const { id } = await params;
    const body = await request.json();
    const {
      namaLengkap,
      email,
      noHp,
      role,
      status,
      password,
    } = body;

    // Cek user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate desa access
    const desaAccess = await validateDesaAccess(user, existingUser.desaId || undefined);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak - Anda tidak dapat mengubah user dari desa lain' },
        { status: 403 }
      );
    }

    // Cek apakah user adalah Super Admin
    if (existingUser.isFirstChild && role && role !== existingUser.role) {
      return NextResponse.json(
        { success: false, error: 'Role Super Admin tidak dapat diubah' },
        { status: 400 }
      );
    }

    // Non-super admin tidak bisa mengubah SUPER_ADMIN
    if (!desaAccess.isSuperAdmin && existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat mengubah akun Super Admin' },
        { status: 403 }
      );
    }

    // Non-super admin tidak bisa mengubah role menjadi SUPER_ADMIN
    if (!desaAccess.isSuperAdmin && role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat menetapkan role Super Admin' },
        { status: 403 }
      );
    }

    // Cek email duplikat
    if (email && email !== existingUser.email) {
      const emailExists = await db.user.findUnique({
        where: { email },
      });
      if (emailExists) {
        return NextResponse.json(
          { success: false, error: 'Email sudah digunakan' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    
    if (namaLengkap) updateData.namaLengkap = namaLengkap;
    if (email) updateData.email = email;
    if (noHp !== undefined) updateData.noHp = noHp || null;
    if (role && !existingUser.isFirstChild) updateData.role = role as UserRole;
    if (status && !existingUser.isFirstChild) updateData.status = status as UserStatus;
    // Hash password baru jika ada
    if (password && password.length >= 6) {
      updateData.password = await hashPassword(password);
    }

    // Update user
    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
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
        updatedAt: true,
      },
    });

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.namaLengkap,
        aksi: 'UPDATE',
        modul: 'USER',
        deskripsi: `Mengupdate user: ${updatedUser.namaLengkap} (${updatedUser.username})`,
        dataRef: JSON.stringify({ userId: updatedUser.id, changes: Object.keys(updateData) }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User berhasil diupdate',
    });
  } catch (error) {
    console.error('Error updating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengupdate user';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// DELETE - Delete user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check - require admin desa or higher
    const user = await requireAdminDesa();

    const { id } = await params;
    
    // Cek user exists
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate desa access
    const desaAccess = await validateDesaAccess(user, existingUser.desaId || undefined);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak - Anda tidak dapat menghapus user dari desa lain' },
        { status: 403 }
      );
    }

    // Cek apakah user adalah Super Admin
    if (existingUser.isFirstChild) {
      return NextResponse.json(
        { success: false, error: 'Super Admin tidak dapat dihapus' },
        { status: 400 }
      );
    }

    // Non-super admin tidak bisa menghapus SUPER_ADMIN
    if (!desaAccess.isSuperAdmin && existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat menghapus akun Super Admin' },
        { status: 403 }
      );
    }

    // Hapus user
    await db.user.delete({
      where: { id },
    });

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.namaLengkap,
        aksi: 'DELETE',
        modul: 'USER',
        deskripsi: `Menghapus user: ${existingUser.namaLengkap} (${existingUser.username})`,
        dataRef: JSON.stringify({ deletedUser: { id, username: existingUser.username } }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus user';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
