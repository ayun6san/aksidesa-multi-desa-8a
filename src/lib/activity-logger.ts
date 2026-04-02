import { db } from '@/lib/db';
import { fieldLabels } from './field-labels';

// Re-export fieldLabels for backward compatibility
export { fieldLabels };

type LogAksi = 'LOGIN' | 'LOGOUT' | 'TAKEOVER' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'PRINT' | 'RESET_PASSWORD' | 'CHANGE_STATUS';
type LogModul = 'AUTH' | 'USER' | 'PENDUDUK' | 'KK' | 'SURAT' | 'DASHBOARD' | 'SETTINGS' | 'LOG' | 'SYSTEM' | 'WILAYAH';

interface DataRef {
  // Entity reference
  pendudukId?: string;
  kkId?: string;
  userId?: string;
  suratId?: string;
  // Entity identifiers
  nik?: string;
  nomorKK?: string;
  nama?: string;
  username?: string;
  // Change tracking
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  changedFields?: string[];
  // Additional context
  [key: string]: unknown;
}

interface LogActivityParams {
  userId?: string;
  userName: string;
  aksi: LogAksi;
  modul: LogModul;
  deskripsi: string;
  dataRef?: DataRef;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity(params: LogActivityParams) {
  try {
    await db.logAktivitas.create({
      data: {
        userId: params.userId || null,
        userName: params.userName,
        aksi: params.aksi,
        modul: params.modul,
        deskripsi: params.deskripsi,
        dataRef: params.dataRef ? JSON.stringify(params.dataRef) : null,
        deviceInfo: params.deviceInfo || null,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Helper to compute changed fields between two objects
export function computeChangedFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>
): { changedFields: string[]; before: Record<string, unknown>; after: Record<string, unknown> } {
  const changedFields: string[] = [];
  const beforeData: Record<string, unknown> = {};
  const afterData: Record<string, unknown> = {};

  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ]);

  // Fields to ignore in change tracking
  const ignoredFields = ['createdAt', 'updatedAt', 'id'];

  for (const key of allKeys) {
    if (ignoredFields.includes(key)) continue;

    const beforeValue = before?.[key];
    const afterValue = after?.[key];

    // Normalize values for comparison
    const normalizeValue = (val: unknown): unknown => {
      if (val === null || val === undefined || val === '') return null;
      if (val instanceof Date) return val.toISOString();
      return val;
    };

    const normalizedBefore = normalizeValue(beforeValue);
    const normalizedAfter = normalizeValue(afterValue);

    if (normalizedBefore !== normalizedAfter) {
      changedFields.push(key);
      beforeData[key] = beforeValue;
      afterData[key] = afterValue;
    }
  }

  return { changedFields, before: beforeData, after: afterData };
}

// Helper function to get client info from request
export function getClientInfo(request: Request) {
  return {
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request),
    deviceInfo: getDeviceInfo(request),
  };
}

function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  return 'unknown';
}

function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}

function getDeviceInfo(request: Request): string {
  const userAgent = getUserAgent(request);
  
  // Simple device detection
  if (userAgent.includes('Mobile')) {
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('Android')) return 'Android Mobile';
    return 'Mobile Device';
  }
  
  if (userAgent.includes('Windows')) return 'Windows Desktop';
  if (userAgent.includes('Macintosh')) return 'Mac Desktop';
  if (userAgent.includes('Linux')) return 'Linux Desktop';
  
  return 'Unknown Device';
}
