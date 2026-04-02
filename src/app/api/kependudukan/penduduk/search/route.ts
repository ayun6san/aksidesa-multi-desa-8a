import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - Search Penduduk for autocomplete
// Used for NIK search feature to auto-fill form data
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Silakan login terlebih dahulu' },
        { status: 401 }
      );
    }

    // Validate desa access and get desaId filter
    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');
    const excludeIds = searchParams.get('exclude')?.split(',').filter(Boolean) || [];
    const filterJenisKelamin = searchParams.get('jenisKelamin') || '';

    // Minimum 3 characters for search
    if (q.length < 3) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Minimal 3 karakter untuk pencarian'
      });
    }

    // Build where clause with desaId filter for multi-tenant
    // Note: SQLite doesn't support case-insensitive mode, so we use contains only
    const where: Record<string, unknown> = {
      isActive: true,
      // Filter by desaId - SUPER_ADMIN without desaId can see all, others only their desa
      ...(desaAccess.desaId ? { desaId: desaAccess.desaId } : {}),
      OR: [
        { nik: { contains: q } },
        { namaLengkap: { contains: q } },
      ]
    };

    // Exclude specific IDs (e.g., current editing penduduk)
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds };
    }

    // Filter by jenis kelamin (e.g., for spouse search)
    if (filterJenisKelamin && ['LAKI_LAKI', 'PEREMPUAN'].includes(filterJenisKelamin)) {
      where.jenisKelamin = filterJenisKelamin;
    }

    // Search penduduk with minimal data for autocomplete
    const pendudukList = await db.penduduk.findMany({
      where,
      include: {
        kk: {
          include: {
            rt: {
              include: {
                rw: {
                  include: {
                    dusun: true
                  }
                }
              }
            },
            dusun: true
          }
        }
      },
      orderBy: [
        { namaLengkap: 'asc' }
      ],
      take: limit,
    });

    // Transform data for autocomplete response
    const transformedData = pendudukList.map(p => ({
      // Key identifiers
      id: p.id,
      nik: p.nik,
      namaLengkap: p.namaLengkap,
      
      // Display info
      displayText: `${p.nik || 'Belum ada NIK'} - ${p.namaLengkap}`,
      subtitle: p.kk
        ? `${p.hubunganKeluarga || '-'} | ${p.kk.nomorKK || 'Belum ada KK'} | ${p.kk.alamat}`
        : 'Belum terdaftar dalam KK',
      
      // Basic info for auto-fill
      tempatLahir: p.tempatLahir || '',
      tanggalLahir: p.tanggalLahir?.toISOString().split('T')[0] || '',
      jenisKelamin: p.jenisKelamin,
      golonganDarah: p.golonganDarah || '',
      agama: p.agama,
      suku: p.suku || '',
      
      // Status
      statusPerkawinan: p.statusPerkawinan,
      aktaPerkawinan: p.aktaPerkawinan || '',
      tanggalPerkawinan: p.tanggalPerkawinan?.toISOString().split('T')[0] || '',
      aktaPerceraian: p.aktaPerceraian || '',
      tanggalPerceraian: p.tanggalPerceraian?.toISOString().split('T')[0] || '',
      
      // Work & Education
      pekerjaan: p.pekerjaan || '',
      pendidikan: p.pendidikan || '',
      penghasilan: p.penghasilan || '',
      
      // Citizenship
      kewarganegaraan: p.kewarganegaraan,
      negaraAsal: p.negaraAsal || '',
      noPaspor: p.noPaspor || '',
      noKitasKitap: p.noKitasKitap || '',
      tanggalMasuk: p.tanggalMasuk?.toISOString().split('T')[0] || '',
      
      // Documents
      noAktaKelahiran: p.noAktaKelahiran || '',
      statusKTP: p.statusKTP,
      noBPJSKesehatan: p.noBPJSKesehatan || '',
      noBPJSTenagakerja: p.noBPJSTenagakerja || '',
      npwp: p.npwp || '',
      
      // Parents
      namaAyah: p.namaAyah || '',
      nikAyah: p.nikAyah || '',
      namaIbu: p.namaIbu || '',
      nikIbu: p.nikIbu || '',
      anakKe: p.anakKe || '',
      jumlahSaudara: p.jumlahSaudara || '',
      
      // KK Info
      kkId: p.kkId || '',
      nomorKK: p.kk?.nomorKK || '',
      hubunganKeluarga: p.hubunganKeluarga || '',
      urutanDalamKK: p.urutanDalamKK || 1,
      
      // Address from KK
      alamat: p.kk?.alamat || '',
      rt: p.kk?.rt?.nomor || '',
      rw: p.kk?.rt?.rw?.nomor || '',
      dusun: p.kk?.dusun?.nama || p.kk?.rt?.rw?.dusun?.nama || '',
      dusunId: p.kk?.dusunId || p.kk?.rt?.rw?.dusunId || '',
      rtId: p.kk?.rtId || '',
      
      // Contact
      email: p.email || '',
      noHP: p.noHP || '',
      
      // Health
      jenisDisabilitas: p.jenisDisabilitas || 'TIDAK_ADA',
      keteranganDisabilitas: p.keteranganDisabilitas || '',
      penyakitKronis: p.penyakitKronis || '',
      
      // Status
      status: p.status,
      
      // Photos
      foto: p.foto || '',
      fotoKTP: p.fotoKTP || '',
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: transformedData.length,
    });
  } catch (error) {
    console.error('Error searching Penduduk:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mencari data Penduduk' },
      { status: 500 }
    );
  }
}
