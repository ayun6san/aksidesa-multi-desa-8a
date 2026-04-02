import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Check if any SUPER_ADMIN exists
    const superAdmin = await db.user.findFirst({
      where: {
        role: 'SUPER_ADMIN',
      },
    });

    // Check if desa data exists
    const desa = await db.desa.findFirst();

    return NextResponse.json({
      initialized: !!superAdmin,
      hasDesa: !!desa,
    });
  } catch (error) {
    console.error('Check init error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
