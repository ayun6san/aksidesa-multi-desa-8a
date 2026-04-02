/**
 * Desa Context Helper - Untuk isolasi data multi-desa
 * 
 * File ini berisi helper functions untuk:
 * - Mendapatkan desaId dari user yang login
 * - Memvalidasi akses user ke desa tertentu
 * - Filter query berdasarkan desa
 */

import { db } from './db';
import { UserRole } from '@prisma/client';

// Tipe untuk user dengan desa info
export interface UserWithDesa {
  id: string;
  username: string;
  email: string;
  namaLengkap: string;
  role: UserRole;
  desaId: string | null;
  desa?: {
    id: string;
    namaDesa: string;
    slug: string;
    kodeDesa: string;
  } | null;
}

// Result dari validasi akses desa
export interface DesaAccessResult {
  allowed: boolean;
  desaId: string | null;
  isSuperAdmin: boolean;
  error?: string;
  desa?: {
    id: string;
    namaDesa: string;
    slug: string;
    kodeDesa: string;
  };
}

/**
 * Mendapatkan user dari session token dengan info desa
 */
export async function getUserFromSession(token: string): Promise<UserWithDesa | null> {
  if (!token) return null;

  const session = await db.session.findFirst({
    where: {
      token,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          desa: {
            select: {
              id: true,
              namaDesa: true,
              slug: true,
              kodeDesa: true,
            },
          },
        },
      },
    },
  });

  if (!session) return null;

  // Cek status user - tolak jika nonaktif/disuspended
  if (session.user.status !== 'ACTIVE') {
    // Nonaktifkan session ini
    await db.session.update({
      where: { id: session.id },
      data: { isActive: false },
    });
    return null;
  }

  // Update last activity
  await db.session.update({
    where: { id: session.id },
    data: { lastActivityAt: new Date() },
  });

  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    namaLengkap: session.user.namaLengkap,
    role: session.user.role,
    desaId: session.user.desaId,
    desa: session.user.desa,
  };
}

/**
 * Validasi akses user ke desa tertentu
 * 
 * Rules:
 * - SUPER_ADMIN bisa akses semua desa
 * - Role lain hanya bisa akses desa sendiri
 */
export async function validateDesaAccess(
  user: UserWithDesa,
  targetDesaId?: string
): Promise<DesaAccessResult> {
  // Super Admin bisa akses semua desa
  if (user.role === 'SUPER_ADMIN') {
    // Jika target desa dispecified, validasi desa tersebut ada
    if (targetDesaId) {
      const desa = await db.desa.findUnique({
        where: { id: targetDesaId },
        select: { id: true, namaDesa: true, slug: true, kodeDesa: true },
      });

      if (!desa) {
        return {
          allowed: false,
          desaId: null,
          isSuperAdmin: true,
          error: 'Desa tidak ditemukan',
        };
      }

      return {
        allowed: true,
        desaId: targetDesaId,
        isSuperAdmin: true,
        desa,
      };
    }

    // Super admin tanpa target desa spesifik
    return {
      allowed: true,
      desaId: null,
      isSuperAdmin: true,
    };
  }

  // Role lain harus punya desaId
  if (!user.desaId) {
    return {
      allowed: false,
      desaId: null,
      isSuperAdmin: false,
      error: 'User tidak terikat ke desa manapun',
    };
  }

  // Jika target desa dispecified, harus sama dengan desa user
  if (targetDesaId && targetDesaId !== user.desaId) {
    return {
      allowed: false,
      desaId: user.desaId,
      isSuperAdmin: false,
      error: 'Akses ditolak - Anda tidak memiliki akses ke desa ini',
    };
  }

  return {
    allowed: true,
    desaId: user.desaId,
    isSuperAdmin: false,
    desa: user.desa || undefined,
  };
}

/**
 * Generate slug dari nama desa
 * Contoh: "Suka Maju" -> "suka-maju"
 */
export function generateDesaSlug(namaDesa: string): string {
  return namaDesa
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Hapus karakter special
    .replace(/\s+/g, '-')         // Ganti spasi dengan dash
    .replace(/-+/g, '-')          // Ganti multiple dash dengan single dash
    .replace(/^-|-$/g, '')        // Hapus dash di awal/akhir
    .trim();
}

/**
 * Generate unique slug untuk desa baru
 * Jika slug sudah ada, tambahkan suffix
 */
export async function generateUniqueDesaSlug(namaDesa: string): Promise<string> {
  const baseSlug = generateDesaSlug(namaDesa);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db.desa.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Helper untuk menambahkan filter desa ke query Prisma
 */
export function withDesaFilter(
  user: UserWithDesa,
  targetDesaId?: string
): { desaId?: string } {
  // Super admin tanpa filter (bisa akses semua)
  if (user.role === 'SUPER_ADMIN' && !targetDesaId) {
    return {};
  }

  // Gunakan targetDesaId jika dispecified (untuk super admin)
  // atau gunakan desaId user untuk role lain
  const desaId = targetDesaId || user.desaId;

  if (!desaId) {
    return {};
  }

  return { desaId };
}

/**
 * Get semua desa yang bisa diakses user
 * - Super Admin: semua desa
 * - Role lain: hanya desa sendiri
 */
export async function getAccessibleDesa(user: UserWithDesa) {
  if (user.role === 'SUPER_ADMIN') {
    return db.desa.findMany({
      where: { isActive: true },
      select: {
        id: true,
        namaDesa: true,
        slug: true,
        kodeDesa: true,
        kecamatan: true,
        kabupaten: true,
        provinsi: true,
        paket: true,
        isActive: true,
      },
      orderBy: { namaDesa: 'asc' },
    });
  }

  if (!user.desaId) {
    return [];
  }

  const desa = await db.desa.findUnique({
    where: { id: user.desaId },
    select: {
      id: true,
      namaDesa: true,
      slug: true,
      kodeDesa: true,
      kecamatan: true,
      kabupaten: true,
      provinsi: true,
      paket: true,
      isActive: true,
    },
  });

  return desa ? [desa] : [];
}

/**
 * Cek apakah user adalah Super Admin
 */
export function isSuperAdmin(user: UserWithDesa | null): boolean {
  return user?.role === 'SUPER_ADMIN';
}

/**
 * Cek apakah user adalah Admin Desa atau lebih tinggi
 */
export function isAtLeastAdminDesa(user: UserWithDesa | null): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN_DESA';
}

/**
 * Cek apakah user adalah Operator atau lebih tinggi
 */
export function isAtLeastOperator(user: UserWithDesa | null): boolean {
  if (!user) return false;
  return ['SUPER_ADMIN', 'ADMIN_DESA', 'OPERATOR'].includes(user.role);
}
