import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    // Get desa filter based on user role
    const desaAccess = await validateDesaAccess(user);
    
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak' },
        { status: 403 }
      );
    }

    // Build where clause - Super Admin sees aggregate stats across all desa
    const desaId = desaAccess.desaId;
    const wherePenduduk = desaId ? { desaId, isActive: true } : { isActive: true };
    const whereKK = desaId ? { desaId, isActive: true } : { isActive: true };
    const wherePendatang = desaId ? { desaId, isActive: true } : { isActive: true };
    const wherePeristiwa = desaId
      ? { desaId, tanggalPeristiwa: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }
      : { tanggalPeristiwa: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } };
    
    const [totalPenduduk, totalKK, pendatangAktif, totalYatimPiatu] = await Promise.all([
      // Total penduduk
      db.penduduk.count({
        where: wherePenduduk,
      }),
      // Total KK
      db.kK.count({
        where: whereKK,
      }),
      // Total pendatang aktif
      db.pendatang.count({
        where: wherePendatang,
      }),
      // Total Yatim Piatu (statusAnak NOT BUKAN_YATIM_PIATU)
      db.penduduk.count({
        where: { ...wherePenduduk, statusAnak: { not: 'BUKAN_YATIM_PIATU' } },
      }),
    ]);

    // Get peristiwa statistics for current month
    const peristiwa = await db.peristiwaKependudukan.findMany({
      where: wherePeristiwa,
      select: {
        jenisPeristiwa: true,
      },
    });

    const kematian = peristiwa.filter(p => p.jenisPeristiwa === 'KEMATIAN').length;
    const kelahiran = peristiwa.filter(p => p.jenisPeristiwa === 'KELAHIRAN').length;
    const pindahMasuk = peristiwa.filter(p => p.jenisPeristiwa === 'PINDAH_MASUK').length;
    const pindahKeluar = peristiwa.filter(p => p.jenisPeristiwa === 'PINDAH_KELUAR').length;

    return NextResponse.json({
      totalPenduduk,
      totalKK,
      pendatang: pendatangAktif,
      kematian,
      kelahiran,
      pindah: pindahMasuk + pindahKeluar,
      totalYatimPiatu,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data statistik' },
      { status: 500 }
    );
  }
}
