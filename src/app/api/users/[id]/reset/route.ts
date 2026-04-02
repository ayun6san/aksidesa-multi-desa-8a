import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdminDesa } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// POST - Reset user (force logout)
export async function POST(
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
      include: {
        sessions: {
          where: { isActive: true },
        },
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate desa access - user can only reset users from same desa
    const desaAccess = await validateDesaAccess(user, existingUser.desaId || undefined);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak - Anda tidak dapat mereset user dari desa lain' },
        { status: 403 }
      );
    }

    // Non-super admin tidak bisa mereset SUPER_ADMIN
    if (!desaAccess.isSuperAdmin && existingUser.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Hanya Super Admin yang dapat mereset akun Super Admin' },
        { status: 403 }
      );
    }

    // Hapus semua session aktif user
    const deletedSessions = await db.session.updateMany({
      where: {
        userId: id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.namaLengkap,
        aksi: 'RESET',
        modul: 'USER',
        deskripsi: `Reset user: ${existingUser.namaLengkap} - ${deletedSessions.count} session dihapus`,
        dataRef: JSON.stringify({ targetUserId: id, sessionsDeleted: deletedSessions.count }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `User berhasil direset. ${deletedSessions.count} session dihapus.`,
      data: {
        sessionsDeleted: deletedSessions.count,
      },
    });
  } catch (error) {
    console.error('Error resetting user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal mereset user';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
