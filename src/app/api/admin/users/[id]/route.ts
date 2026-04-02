/**
 * API untuk manajemen user individual oleh Super Admin
 * GET: Detail user
 * PUT: Update user
 * DELETE: Hapus user
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, hashPassword, isValidPassword } from '@/lib/auth-utils';
import { UserRole, UserStatus } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Detail user
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Hanya Super Admin yang bisa mengakses' },
        { status: 403 }
      );
    }

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
        avatar: true,
        isFirstChild: true,
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
            kodeDesa: true,
          },
        },
        sessions: {
          where: { isActive: true },
          select: {
            id: true,
            deviceInfo: true,
            ipAddress: true,
            userAgent: true,
            lastActivityAt: true,
            expiresAt: true,
            createdAt: true,
          },
          orderBy: { lastActivityAt: 'desc' },
          take: 5,
        },
        logAktivitas: {
          select: {
            id: true,
            aksi: true,
            modul: true,
            deskripsi: true,
            createdAt: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: targetUser,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const {
      namaLengkap,
      email,
      noHp,
      role,
      status,
      desaId,
      password,
    } = body;

    // Cek apakah user ada
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Lindungi super admin pertama (isFirstChild)
    if (existingUser.isFirstChild) {
      return NextResponse.json(
        { error: 'Super Admin utama tidak dapat diubah' },
        { status: 400 }
      );
    }

    // Validasi
    const errors: string[] = [];

    if (password && !isValidPassword(password)) {
      errors.push('Password minimal 6 karakter');
    }

    if (role && !Object.values(UserRole).includes(role as UserRole)) {
      errors.push('Role tidak valid');
    }

    if (status && !Object.values(UserStatus).includes(status as UserStatus)) {
      errors.push('Status tidak valid');
    }

    // Cek duplikasi email jika diubah
    if (email && email !== existingUser.email) {
      const duplicate = await db.user.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          NOT: { id },
        },
      });
      if (duplicate) errors.push('Email sudah digunakan');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join(', ') },
        { status: 400 }
      );
    }

    // Update user
    const updateData: Record<string, unknown> = {};

    if (namaLengkap) updateData.namaLengkap = namaLengkap.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (noHp !== undefined) updateData.noHp = noHp?.trim() || null;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    if (desaId !== undefined) updateData.desaId = desaId || null;
    if (password) updateData.password = await hashPassword(password);

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
        avatar: true,
        isFirstChild: true,
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
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User berhasil diperbarui',
      data: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// DELETE - Hapus user
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Hanya Super Admin yang bisa mengakses' },
        { status: 403 }
      );
    }

    // Cek apakah user ada
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    // Jangan hapus diri sendiri
    if (existingUser.id === user.id) {
      return NextResponse.json(
        { error: 'Tidak bisa menghapus akun sendiri' },
        { status: 400 }
      );
    }

    // Lindungi super admin pertama (isFirstChild)
    if (existingUser.isFirstChild) {
      return NextResponse.json(
        { error: 'Super Admin utama tidak dapat dihapus' },
        { status: 400 }
      );
    }

    // Hapus user
    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'User berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
