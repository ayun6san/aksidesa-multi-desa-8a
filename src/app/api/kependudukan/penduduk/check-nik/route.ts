import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';

// GET - Check if NIK already exists, returns owner name if found
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const nik = searchParams.get('nik') || '';
    const excludeId = searchParams.get('excludeId') || '';

    if (!nik || nik.length !== 16 || !/^\d{16}$/.test(nik)) {
      return NextResponse.json({
        success: true,
        exists: false,
      });
    }

    // Build where clause
    const where: Record<string, unknown> = { nik };

    // If editing, exclude the current penduduk's ID
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await db.penduduk.findFirst({
      where,
      select: {
        id: true,
        namaLengkap: true,
        nik: true,
        status: true,
        isActive: true,
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        exists: true,
        penduduk: {
          id: existing.id,
          namaLengkap: existing.namaLengkap,
          nik: existing.nik,
          status: existing.status,
          isActive: existing.isActive,
        },
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
    });
  } catch (error) {
    console.error('Error checking NIK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengecek NIK' },
      { status: 500 }
    );
  }
}
