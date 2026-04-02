import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UserStatus } from '@prisma/client';
import { requireAdminDesa } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// PATCH - Toggle user status (active/inactive)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check - require admin desa or higher
    const user = await requireAdminDesa();

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

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

    // Validate desa access - user can only modify users from same desa
    const desaAccess = await validateDesaAccess(user, existingUser.desaId || undefined);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak - Anda tidak dapat mengubah status user dari desa lain' },
        { status: 403 }
      );
    }

    // Cek apakah user adalah Super Admin
    if (existingUser.isFirstChild && status === 'INACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Super Admin tidak dapat dinonaktifkan' },
        { status: 400 }
      );
    }

    // Non-super admin tidak bisa mengubah status SUPER_ADMIN
    if (!desaAccess.isSuperAdmin && existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat mengubah status akun Super Admin' },
        { status: 403 }
      );
    }

    // Toggle status jika tidak ada status yang diberikan
    const newStatus = status || (existingUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');

    // Update status user
    const updatedUser = await db.user.update({
      where: { id },
      data: {
        status: newStatus as UserStatus,
      },
      select: {
        id: true,
        namaLengkap: true,
        username: true,
        status: true,
      },
    });

    // Jika dinonaktifkan, hapus semua session aktif
    if (newStatus === 'INACTIVE') {
      await db.session.updateMany({
        where: {
          userId: id,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    }

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.namaLengkap,
        aksi: newStatus === 'ACTIVE' ? 'ACTIVATE' : 'DEACTIVATE',
        modul: 'USER',
        deskripsi: `${newStatus === 'ACTIVE' ? 'Mengaktifkan' : 'Menonaktifkan'} user: ${updatedUser.namaLengkap}`,
        dataRef: JSON.stringify({ userId: id, newStatus }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: `User berhasil ${newStatus === 'ACTIVE' ? 'diaktifkan' : 'dinonaktifkan'}`,
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengubah status user';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
