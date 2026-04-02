import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, isValidPassword } from '@/lib/auth-utils';

// Step 1: POST /api/auth/forgot-password?action=check → find user, return question
// Step 2: POST /api/auth/forgot-password?action=verify → verify answer
// Step 3: POST /api/auth/forgot-password?action=reset → set new password

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    // --- Step 1: Check user & return security question ---
    if (action === 'check') {
      const { identifier } = body;
      if (!identifier?.trim()) {
        return NextResponse.json({ error: 'Username atau email wajib diisi' }, { status: 400 });
      }

      const user = await db.user.findFirst({
        where: {
          OR: [
            { username: { equals: identifier.trim().toLowerCase() } },
            { email: { equals: identifier.trim().toLowerCase() } },
          ],
        },
        select: {
          id: true,
          namaLengkap: true,
          username: true,
          role: true,
          pertanyaanKeamanan: true,
          status: true,
        },
      });

      if (!user) {
        return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
      }

      if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Fitur ini hanya untuk Super Admin. Silakan hubungi Super Admin untuk reset password.' }, { status: 400 });
      }

      if (user.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Akun tidak aktif' }, { status: 400 });
      }

      if (!user.pertanyaanKeamanan) {
        return NextResponse.json({ error: 'Akun belum memiliki pertanyaan keamanan. Hubungi developer.' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data: {
          userId: user.id,
          namaLengkap: user.namaLengkap,
          username: user.username,
          pertanyaan: user.pertanyaanKeamanan,
        },
      });
    }

    // --- Step 2: Verify security answer ---
    if (action === 'verify') {
      const { userId, jawaban } = body;
      if (!userId || !jawaban?.trim()) {
        return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, jawabanKeamanan: true, status: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
      }

      if (!user.jawabanKeamanan) {
        return NextResponse.json({ error: 'Pertanyaan keamanan belum diatur' }, { status: 400 });
      }

      const isCorrect = await verifyPassword(jawaban.trim(), user.jawabanKeamanan);
      if (!isCorrect) {
        return NextResponse.json({ error: 'Jawaban keamanan salah' }, { status: 400 });
      }

      // Generate a temporary token (valid for 5 minutes)
      const token = Buffer.from(`${userId}:${Date.now()}`).toString('base64url');

      return NextResponse.json({
        success: true,
        data: { token },
      });
    }

    // --- Step 3: Reset password ---
    if (action === 'reset') {
      const { token, password } = body;
      if (!token || !password) {
        return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
      }

      if (!isValidPassword(password)) {
        return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 });
      }

      // Decode token (simple: userId:timestamp)
      let decoded: string;
      try {
        decoded = Buffer.from(token, 'base64url').toString('utf-8');
      } catch {
        return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
      }

      const [userId, timestamp] = decoded.split(':');
      if (!userId || !timestamp) {
        return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
      }

      // Check token expiry (5 minutes)
      const tokenAge = Date.now() - parseInt(timestamp, 10);
      if (tokenAge > 5 * 60 * 1000) {
        return NextResponse.json({ error: 'Token sudah kadaluarsa. Silakan ulangi dari awal.' }, { status: 400 });
      }

      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, status: true },
      });

      if (!user) {
        return NextResponse.json({ error: 'Akun tidak ditemukan' }, { status: 404 });
      }

      // Update password and reset failed login count
      const hashedPassword = await hashPassword(password);
      await db.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });

      // Deactivate all sessions
      await db.session.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      return NextResponse.json({
        success: true,
        message: 'Password berhasil diubah. Silakan login dengan password baru.',
      });
    }

    return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
