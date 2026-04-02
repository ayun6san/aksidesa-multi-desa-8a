/**
 * API untuk reset password user oleh Super Admin
 * POST: Reset password + force logout + wajib ganti password
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hashPassword, isValidPassword } from '@/lib/auth-utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Hanya Super Admin yang bisa mengakses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password || !isValidPassword(password)) {
      return NextResponse.json(
        { error: 'Password minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Cek apakah target user ada
    const targetUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        namaLengkap: true,
        username: true,
        isFirstChild: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Lindungi super admin pertama (isFirstChild)
    if (targetUser.isFirstChild) {
      return NextResponse.json(
        { error: 'Super Admin utama tidak dapat direset password-nya' },
        { status: 400 }
      );
    }

    // Hash password baru
    const hashedPassword = await hashPassword(password);

    // Update password, set wajibGantiPassword, reset login attempts
    await db.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        wajibGantiPassword: true,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Force logout semua session
    await db.session.updateMany({
      where: { userId: id },
      data: { isActive: false },
    });

    // Log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: id,
        userName: targetUser.username,
        aksi: 'RESET_PASSWORD',
        modul: 'USER',
        deskripsi: `Password direset oleh Super Admin ${user.namaLengkap}`,
        deviceInfo: null,
        ipAddress: null,
        userAgent: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password user ${targetUser.namaLengkap} berhasil direset. User wajib ganti password saat login berikutnya.`,
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
