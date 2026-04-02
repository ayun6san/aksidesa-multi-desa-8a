import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';

// GET - Check if Nomor KK already exists, returns kepala keluarga name if found
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
    const nomorKK = searchParams.get('nomorKK') || '';
    const excludeId = searchParams.get('excludeId') || '';

    if (!nomorKK || nomorKK.length !== 16 || !/^\d{16}$/.test(nomorKK)) {
      return NextResponse.json({
        success: true,
        exists: false,
      });
    }

    // Build where clause
    const where: Record<string, unknown> = { nomorKK };

    // If editing, exclude the current KK's ID
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existingKK = await db.kK.findFirst({
      where,
      select: {
        id: true,
        nomorKK: true,
        isActive: true,
        anggota: {
          where: { hubunganKeluarga: { in: ['KEPALA_KELUARGA'] } },
          select: { namaLengkap: true },
          take: 1,
        },
      },
    });

    if (existingKK) {
      return NextResponse.json({
        success: true,
        exists: true,
        kk: {
          id: existingKK.id,
          nomorKK: existingKK.nomorKK,
          kepalaKeluarga: existingKK.anggota[0]?.namaLengkap || 'Belum ada kepala keluarga',
          isActive: existingKK.isActive,
        },
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
    });
  } catch (error) {
    console.error('Error checking Nomor KK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengecek Nomor KK' },
      { status: 500 }
    );
  }
}
