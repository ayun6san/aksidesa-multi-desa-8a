import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - Generate unique Nomor KK (cek DB + auto-retry jika duplikat)
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    // Ambil kodeDesa (6 digit pertama)
    let kodeKecamatan = '320117'; // fallback
    if (desaAccess.desaId) {
      const desa = await db.desa.findUnique({
        where: { id: desaAccess.desaId },
        select: { kodeDesa: true },
      });
      if (desa?.kodeDesa) {
        kodeKecamatan = desa.kodeDesa.replace(/[^0-9]/g, '').slice(0, 6);
      }
    }

    const kelurahan = '01';
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const nomorUrut = String(Math.floor(Math.random() * 99999999) + 1).padStart(8, '0');
      const nomorKK = `${kodeKecamatan}${kelurahan}${nomorUrut}`;

      // Cek ke DB apakah nomor KK sudah ada
      const existing = await db.kK.findUnique({
        where: { nomorKK },
      });

      if (!existing) {
        return NextResponse.json({
          success: true,
          data: { nomorKK },
        });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Gagal menghasilkan Nomor KK unik setelah beberapa percobaan. Silakan coba lagi.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error generating KK number:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghasilkan Nomor KK' },
      { status: 500 }
    );
  }
}
