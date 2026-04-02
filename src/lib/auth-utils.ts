import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { db } from './db';
import { getUserFromSession, UserWithDesa } from './desa-context';

const SALT_ROUNDS = 12;

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Generate secure token
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

// Generate session token
export function generateSessionToken(): string {
  return generateToken(32);
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate username (alphanumeric, underscore, min 3 chars)
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_]{3,}$/;
  return usernameRegex.test(username);
}

// Validate phone number (Indonesian format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
  return phoneRegex.test(phone.replace(/\s|-/g, ''));
}

// Validate password strength (min 6 chars)
export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

// Get client IP from request
export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return 'unknown';
}

// Get user agent from request
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

// Check if account is locked
export function isAccountLocked(lockedUntil: Date | null): boolean {
  if (!lockedUntil) return false;
  return new Date() < lockedUntil;
}

// Calculate lockout time (exponential backoff)
export function calculateLockoutTime(attempts: number): Date {
  const baseMinutes = 5;
  const multiplier = Math.min(attempts - 3, 5); // Max 5x multiplier
  const lockoutMinutes = baseMinutes * Math.pow(2, multiplier);
  return new Date(Date.now() + lockoutMinutes * 60 * 1000);
}

// ==================== MULTI-DESA AUTH FUNCTIONS ====================

/**
 * Get current user dari cookie session (server-side)
 * Digunakan di server components dan API routes
 */
export async function getCurrentUser(): Promise<UserWithDesa | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    if (!sessionToken) return null;

    return getUserFromSession(sessionToken);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication - return user atau throw error
 * Digunakan di API routes yang memerlukan auth
 */
export async function requireAuth(): Promise<UserWithDesa> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized - Silakan login terlebih dahulu');
  }

  return user;
}

/**
 * Require Super Admin role
 */
export async function requireSuperAdmin(): Promise<UserWithDesa> {
  const user = await requireAuth();

  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Forbidden - Hanya Super Admin yang bisa mengakses');
  }

  return user;
}

/**
 * Require minimal Admin Desa role
 */
export async function requireAdminDesa(): Promise<UserWithDesa> {
  const user = await requireAuth();

  if (!['SUPER_ADMIN', 'ADMIN_DESA'].includes(user.role)) {
    throw new Error('Forbidden - Hanya Admin Desa yang bisa mengakses');
  }

  return user;
}

/**
 * Require minimal Operator role
 */
export async function requireOperator(): Promise<UserWithDesa> {
  const user = await requireAuth();

  if (!['SUPER_ADMIN', 'ADMIN_DESA', 'OPERATOR'].includes(user.role)) {
    throw new Error('Forbidden - Hanya Operator yang bisa mengakses');
  }

  return user;
}

/**
 * Cek apakah sistem sudah diinisialisasi
 * (sudah ada super admin)
 */
export async function isSystemInitialized(): Promise<boolean> {
  const superAdmin = await db.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true },
  });

  return !!superAdmin;
}

/**
 * Cek apakah sudah ada desa yang terdaftar
 */
export async function hasDesa(): Promise<boolean> {
  const desa = await db.desa.findFirst({
    select: { id: true },
  });

  return !!desa;
}

/**
 * Get statistik ringkas untuk dashboard
 */
export async function getDashboardStats(desaId?: string) {
  const whereClause = desaId ? { desaId } : {};

  const [totalPenduduk, totalKK, totalDusun, totalRW, totalRT] = await Promise.all([
    // Total penduduk (melalui KK -> Dusun -> Desa)
    db.penduduk.count({
      where: { isActive: true, ...whereClause },
    }),
    // Total KK
    db.kK.count({
      where: { isActive: true, ...whereClause },
    }),
    // Total Dusun
    db.dusun.count({
      where: whereClause,
    }),
    // Total RW
    db.rW.count({
      where: {
        dusun: whereClause,
      },
    }),
    // Total RT
    db.rT.count({
      where: {
        rw: {
          dusun: whereClause,
        },
      },
    }),
  ]);

  return {
    totalPenduduk,
    totalKK,
    totalDusun,
    totalRW,
    totalRT,
  };
}
