import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// Hubungan keluarga valid (selain KEPALA_KELUARGA)
const VALID_HUBUNGAN = [
  'SUAMI',
  'ISTRI',
  'ANAK',
  'ANAK_TIRI',
  'ANAK_ANGKAT',
  'MENANTU',
  'CUCU',
  'ORANG_TUA',
  'MERTUA',
  'FAMILI_LAIN',
  'PEMBANTU',
  'LAINNYA',
] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Ganti Kepala Keluarga (Koreksi Data)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

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

    const body = await request.json();
    const { kepalaBaruId, hubunganKepalaLama, catatan } = body;

    // Validasi input wajib
    if (!kepalaBaruId) {
      return NextResponse.json(
        { success: false, error: 'Pilih anggota yang akan menjadi kepala keluarga baru' },
        { status: 400 }
      );
    }

    if (!hubunganKepalaLama) {
      return NextResponse.json(
        { success: false, error: 'Pilih hubungan keluarga untuk kepala keluarga lama' },
        { status: 400 }
      );
    }

    if (!VALID_HUBUNGAN.includes(hubunganKepalaLama)) {
      return NextResponse.json(
        { success: false, error: 'Hubungan keluarga tidak valid' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    // 1. Cek KK ada dan user punya akses
    const kk = await db.kK.findFirst({
      where,
    });

    if (!kk) {
      return NextResponse.json(
        { success: false, error: 'KK tidak ditemukan' },
        { status: 404 }
      );
    }

    // 2. Ambil semua anggota KK
    const anggota = await db.penduduk.findMany({
      where: { kkId: id },
      select: {
        id: true,
        namaLengkap: true,
        nik: true,
        hubunganKeluarga: true,
      },
    });

    if (anggota.length <= 1) {
      return NextResponse.json(
        { success: false, error: 'Tidak bisa ganti kepala KK karena hanya ada 1 anggota' },
        { status: 400 }
      );
    }

    // 3. Cari kepala KK saat ini
    const kepalaLama = anggota.find(a => a.hubunganKeluarga === 'KEPALA_KELUARGA');
    if (!kepalaLama) {
      return NextResponse.json(
        { success: false, error: 'KK ini tidak memiliki kepala keluarga' },
        { status: 400 }
      );
    }

    // 4. Cari kepala baru (harus anggota KK yang sama, bukan kepala)
    const kepalaBaru = anggota.find(a => a.id === kepalaBaruId);
    if (!kepalaBaru) {
      return NextResponse.json(
        { success: false, error: 'Anggota yang dipilih tidak ditemukan dalam KK ini' },
        { status: 400 }
      );
    }

    if (kepalaBaru.id === kepalaLama.id) {
      return NextResponse.json(
        { success: false, error: 'Kepala baru tidak boleh sama dengan kepala lama' },
        { status: 400 }
      );
    }

    // 5. Proses ganti kepala dalam transaction
    await db.$transaction([
      // Update kepala lama → ubah hubungan keluarga
      db.penduduk.update({
        where: { id: kepalaLama.id },
        data: { hubunganKeluarga: hubunganKepalaLama },
      }),
      // Update kepala baru → jadi KEPALA_KELUARGA
      db.penduduk.update({
        where: { id: kepalaBaruId },
        data: { hubunganKeluarga: 'KEPALA_KELUARGA' },
      }),
      // Update kepalaKeluargaId di KK
      db.kK.update({
        where: { id },
        data: { kepalaKeluargaId: kepalaBaruId },
      }),
    ]);

    // 6. Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'GANTI_KEPALA',
        modul: 'KK',
        deskripsi: `Ganti kepala KK ${kk.nomorKK}: ${kepalaLama.namaLengkap} → ${kepalaBaru.namaLengkap}`,
        dataRef: JSON.stringify({
          kkId: kk.id,
          nomorKK: kk.nomorKK,
          kepalaLamaId: kepalaLama.id,
          kepalaLamaNama: kepalaLama.namaLengkap,
          kepalaLamaNIK: kepalaLama.nik,
          kepalaBaruId: kepalaBaru.id,
          kepalaBaruNama: kepalaBaru.namaLengkap,
          kepalaBaruNIK: kepalaBaru.nik,
          hubunganKepalaLama,
          catatan: catatan || '-',
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Kepala keluarga berhasil diganti',
      data: {
        kepalaLama: {
          id: kepalaLama.id,
          namaLengkap: kepalaLama.namaLengkap,
          hubunganBaru: hubunganKepalaLama,
        },
        kepalaBaru: {
          id: kepalaBaru.id,
          namaLengkap: kepalaBaru.namaLengkap,
        },
      },
    });
  } catch (error) {
    console.error('Error ganti kepala KK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengganti kepala keluarga' },
      { status: 500 }
    );
  }
}
