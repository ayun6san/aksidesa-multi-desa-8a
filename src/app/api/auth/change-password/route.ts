/**
 * API untuk mengganti password sendiri
 * POST: Ganti password (setelah login, terutama saat wajibGantiPassword = true)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  getCurrentUser,
  verifyPassword,
  hashPassword,
  isValidPassword,
} from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Tidak terautentikasi' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { oldPassword, newPassword } = body;

    // Validasi input
    if (!oldPassword) {
      return NextResponse.json(
        { error: 'Password lama wajib diisi' },
        { status: 400 }
      );
    }

    if (!newPassword || !isValidPassword(newPassword)) {
      return NextResponse.json(
        { error: 'Password baru minimal 6 karakter' },
        { status: 400 }
      );
    }

    // Ambil password hash dari database
    const targetUser = await db.user.findUnique({
      where: { id: user.id },
      select: { password: true, wajibGantiPassword: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verifikasi password lama
    const isOldPasswordValid = await verifyPassword(oldPassword, targetUser.password);
    if (!isOldPasswordValid) {
      return NextResponse.json(
        { error: 'Password lama salah' },
        { status: 400 }
      );
    }

    // Hash password baru
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password dan reset wajibGantiPassword
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        wajibGantiPassword: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Password berhasil diubah',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
