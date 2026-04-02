import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JenisPeristiwa, JenisKelamin, Agama, StatusPenduduk, StatusPerkawinan, StatusKTP, JenisDisabilitas, Kewarganegaraan } from '@prisma/client';
import { getCurrentUser, requireOperator } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - List all Peristiwa with pagination
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

    // Validate desa access
    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const jenisPeristiwa = searchParams.get('jenisPeristiwa') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause with desaId filter
    const where: Record<string, unknown> = {
      // Filter by desaId for multi-tenant
      ...(desaAccess.desaId ? { desaId: desaAccess.desaId } : {}),
    };
    
    if (search) {
      where.OR = [
        { penduduk: { namaLengkap: { contains: search } } },
        { namaBayi: { contains: search } },
        { keterangan: { contains: search } },
      ];
    }
    
    if (jenisPeristiwa) {
      where.jenisPeristiwa = jenisPeristiwa as JenisPeristiwa;
    }

    // Get peristiwa
    const [peristiwaList, total] = await Promise.all([
      db.peristiwaKependudukan.findMany({
        where,
        include: {
          penduduk: {
            select: {
              id: true,
              nik: true,
              namaLengkap: true,
              jenisKelamin: true,
            }
          },
          kk: {
            select: {
              id: true,
              nomorKK: true,
            }
          }
        },
        orderBy: { tanggalPeristiwa: 'desc' },
        skip,
        take: limit,
      }),
      db.peristiwaKependudukan.count({ where }),
    ]);

    // Transform data
    const transformedData = peristiwaList.map(p => ({
      id: p.id,
      jenisPeristiwa: p.jenisPeristiwa,
      pendudukId: p.pendudukId,
      penduduk: p.penduduk,
      kkId: p.kkId,
      kk: p.kk,
      tanggalPeristiwa: p.tanggalPeristiwa?.toISOString() || null,
      tempat: p.tempat,
      keterangan: p.keterangan,
      alamatAsal: p.alamatAsal,
      alamatTujuan: p.alamatTujuan,
      penyebabKematian: p.penyebabKematian,
      namaBayi: p.namaBayi,
      jenisKelaminBayi: p.jenisKelaminBayi,
      beratBayi: p.beratBayi,
      panjangBayi: p.panjangBayi,
      isProcessed: p.isProcessed,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching Peristiwa:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Peristiwa' },
      { status: 500 }
    );
  }
}

// POST - Create new Peristiwa with automatic data processing
export async function POST(request: NextRequest) {
  try {
    // Auth check - require operator or higher
    const user = await requireOperator();

    // Validate desa access
    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed || !desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak - User tidak terikat ke desa manapun' },
        { status: 403 }
      );
    }

    const desaId = desaAccess.desaId;

    // Fetch desa to get kodeKecamatan for NIK/KK generation
    const desa = await db.desa.findUnique({
      where: { id: desaId },
      select: { kodeDesa: true },
    });
    const kodeKecamatan = desa ? extractKodeKecamatan(desa.kodeDesa) : '320117';

    const body = await request.json();
    const {
      jenisPeristiwa,
      pendudukId,
      kkId,
      tanggalPeristiwa,
      tempat,
      keterangan,
      alamatAsal,
      alamatTujuan,
      penyebabKematian,
      namaBayi,
      jenisKelaminBayi,
      beratBayi,
      panjangBayi,
      // Additional fields
      namaAyah,
      nikAyah,
      namaIbu,
      nikIbu,
      // For Pindah Masuk
      pendudukBaru,
      rtIdTujuan,
      dusunIdTujuan,
      // For Pindah Keluar
      alamatPindah,
      pindahKeluarIds, // Array pendudukId yang ikut pindah (multi-anggota)
      gantiKepalaPindahId, // Pengganti kepala KK saat pindah keluar
      // For Perkawinan
      tanggalPerkawinan,
      aktaPerkawinan,
      // For Perkawinan - new fields
      statusPerkawinanTarget, // 'KAWIN_TERCATAT' | 'KAWIN_TIDAK_TERCATAT'
      pasanganId, // optional - ID of spouse in the system
      opsiKKPerkawinan, // 'PINDAH_KE_KK_PENDUDUK' | 'BUAT_KK_BARU' | 'TETAP_DI_KK_MASING2'
      hubunganPasanganDiKK, // 'SUAMI' | 'ISTRI'
      // For Perkawinan - KK succession
      gantiKepalaPerkawinanPendudukId, // Replacement for penduduk's KK if penduduk is kepala
      gantiKepalaPerkawinanPasanganId, // Replacement for pasangan's KK if pasangan is kepala
      // For Perceraian
      tanggalPerceraian,
      aktaPerceraian,
      buatKKBaru,
      alamatKKBaru,
      rtIdKKBaru,
      dusunIdKKBaru,
      opsiKKPerceraian, // 'TETAP_GANTI_KEPALA' | 'BUAT_KK_BARU' | 'PINDAH_KK_LAIN'
      gantiKepalaPerceraianId, // Pengganti kepala KK saat perceraian
      hubunganKepalaLamaPerceraian, // Hubungan kepala lama setelah bukan kepala lagi
      pindahKKTujuanId, // KK tujuan jika pindah ke KK lain
      // For Kematian - Ganti Kepala Keluarga
      gantiKepalaKeluargaId,
      hubunganKepalaLama,
    } = body;

    // Validasi field wajib
    if (!jenisPeristiwa || !tanggalPeristiwa) {
      return NextResponse.json(
        { success: false, error: 'Jenis peristiwa dan tanggal wajib diisi' },
        { status: 400 }
      );
    }

    let createdPendudukId: string | null = null;
    let createdKKId: string | null = kkId || null;
    let processedData: Record<string, unknown> = {};

    // Wrap all DB operations in a transaction to prevent partial data corruption
    const result = await db.$transaction(async (tx) => {
      const txDb = tx;

    // Process based on event type
    switch (jenisPeristiwa) {
      case 'KELAHIRAN': {
        // Create new penduduk for kelahiran
        if (!namaBayi) {
          return NextResponse.json(
            { success: false, error: 'Nama bayi wajib diisi untuk kelahiran' },
            { status: 400 }
          );
        }
        if (!kkId) {
          return NextResponse.json(
            { success: false, error: 'Kartu Keluarga wajib dipilih untuk kelahiran' },
            { status: 400 }
          );
        }
        if (!tanggalPeristiwa) {
          return NextResponse.json(
            { success: false, error: 'Tanggal kelahiran wajib diisi' },
            { status: 400 }
          );
        }
        const tglLahir = new Date(tanggalPeristiwa);
        if (tglLahir > new Date()) {
          return NextResponse.json(
            { success: false, error: 'Tanggal kelahiran tidak boleh lebih dari hari ini' },
            { status: 400 }
          );
        }

        // Validate KK exists and belongs to desa
        const kkKelahiran = await txDb.kK.findFirst({
          where: { id: kkId, desaId },
          select: { id: true },
        });
        if (!kkKelahiran) {
          return NextResponse.json(
            { success: false, error: 'KK tidak ditemukan atau bukan dari desa Anda' },
            { status: 404 }
          );
        }

        // Calculate urutanDalamKK based on existing members
        const maxUrutan = await txDb.penduduk.aggregate({
          where: { kkId, isActive: true },
          _max: { urutanDalamKK: true },
        });
        const urutanBaru = (maxUrutan._max.urutanDalamKK || 0) + 1;

        // Auto-set ayahId/ibuId — find SUAMI/ISTRI/KEPALA_KELUARGA in same KK
        // KEPALA_KELUARGA is fallback: if jenisKelamin=LAKI_LAKI → ayah, if PEREMPUAN → ibu
        const ortuBayi = await txDb.penduduk.findMany({
          where: {
            kkId,
            hubunganKeluarga: { in: ['SUAMI', 'ISTRI', 'KEPALA_KELUARGA'] },
            isActive: true,
            status: { not: 'MENINGGAL' },
          },
          select: { id: true, hubunganKeluarga: true, jenisKelamin: true },
        });
        const suamiBayi = ortuBayi.find(p => p.hubunganKeluarga === 'SUAMI');
        const istriBayi = ortuBayi.find(p => p.hubunganKeluarga === 'ISTRI');
        const kepalaBayi = ortuBayi.find(p => p.hubunganKeluarga === 'KEPALA_KELUARGA');

        // Create new penduduk (NIK dikosongkan, bisa diisi nanti via edit penduduk)
        const newPenduduk = await txDb.penduduk.create({
          data: {
            desaId,
            namaLengkap: namaBayi,
            tempatLahir: pendudukBaru?.tempatLahir || tempat || null,
            tanggalLahir: pendudukBaru?.tanggalLahir ? new Date(pendudukBaru.tanggalLahir) : new Date(tanggalPeristiwa),
            jenisKelamin: (jenisKelaminBayi || 'LAKI_LAKI') as JenisKelamin,
            agama: (pendudukBaru?.agama || 'ISLAM') as Agama,
            statusPerkawinan: 'BELUM_KAWIN' as StatusPerkawinan,
            status: 'TETAP' as StatusPenduduk,
            statusKTP: 'BELUM_BUAT' as StatusKTP,
            kewarganegaraan: 'WNI' as Kewarganegaraan,
            jenisDisabilitas: 'TIDAK_ADA' as JenisDisabilitas,
            kkId: kkId,
            hubunganKeluarga: 'ANAK',
            urutanDalamKK: urutanBaru,
            noAktaKelahiran: pendudukBaru?.noAktaKelahiran || null,
            namaAyah: namaAyah || null,
            nikAyah: nikAyah || null,
            namaIbu: namaIbu || null,
            nikIbu: nikIbu || null,
            ayahId: suamiBayi?.id || (kepalaBayi?.jenisKelamin === 'LAKI_LAKI' ? kepalaBayi.id : null),
            ibuId: istriBayi?.id || (kepalaBayi?.jenisKelamin === 'PEREMPUAN' ? kepalaBayi.id : null),
          }
        });

        createdPendudukId = newPenduduk.id;
        processedData = {
          pendudukBaru: {
            id: newPenduduk.id,
            nik: newPenduduk.nik,
            namaLengkap: newPenduduk.namaLengkap,
          }
        };
        break;
      }

      case 'KEMATIAN': {
        if (!pendudukId) {
          return NextResponse.json(
            { success: false, error: 'Penduduk wajib dipilih untuk kematian' },
            { status: 400 }
          );
        }

        // Check if penduduk exists and belongs to user's desa
        const existingPenduduk = await txDb.penduduk.findFirst({ 
          where: { 
            id: pendudukId,
            desaId // Filter by desaId
          },
          select: {
            id: true,
            nik: true,
            namaLengkap: true,
            hubunganKeluarga: true,
            kkId: true,
            pasanganId: true,
            status: true,
            isActive: true,
          }
        });
        if (!existingPenduduk) {
          return NextResponse.json(
            { success: false, error: 'Penduduk tidak ditemukan atau bukan dari desa Anda' },
            { status: 404 }
          );
        }

        // Validasi: penduduk masih aktif
        if (!existingPenduduk.isActive || existingPenduduk.status === 'MENINGGAL') {
          return NextResponse.json(
            { success: false, error: `Penduduk sudah tidak aktif (status: ${existingPenduduk.status}). Tidak dapat mencatat kematian dua kali.` },
            { status: 400 }
          );
        }

        // Validasi: tanggal kematian tidak boleh di masa depan
        if (tanggalPeristiwa && new Date(tanggalPeristiwa) > new Date()) {
          return NextResponse.json(
            { success: false, error: 'Tanggal kematian tidak boleh lebih dari hari ini' },
            { status: 400 }
          );
        }

        // Update status to MENINGGAL and clear pasangan link
        await txDb.penduduk.update({
          where: { id: pendudukId },
          data: {
            status: 'MENINGGAL' as StatusPenduduk,
            isActive: false,
            pasanganId: null,
          }
        });

        // === AUTO-UPDATE STATUS ANAK (YATIM/PIATU) ===
        // Find all active children linked to the deceased
        const children = await txDb.penduduk.findMany({
          where: {
            OR: [
              { ayahId: pendudukId },
              { ibuId: pendudukId }
            ],
            isActive: true
          },
          select: { id: true, ayahId: true, ibuId: true, statusAnak: true }
        });

        if (children.length > 0) {
          // Collect all unique parent IDs to check
          const parentIds = [...new Set(children.flatMap(c => [c.ayahId, c.ibuId].filter(Boolean) as string[]))];
          
          // Batch fetch all parents' status
          const parents = await txDb.penduduk.findMany({
            where: { id: { in: parentIds } },
            select: { id: true, isActive: true, status: true }
          });
          const parentMap = new Map(parents.map(p => [p.id, p]));
          
          for (const child of children) {
            const ayahAlive = child.ayahId ? (() => { const p = parentMap.get(child.ayahId!); return !!(p && p.isActive && p.status !== 'MENINGGAL'); })() : false;
            const ibuAlive = child.ibuId ? (() => { const p = parentMap.get(child.ibuId!); return !!(p && p.isActive && p.status !== 'MENINGGAL'); })() : false;
            
            let newStatus: 'BUKAN_YATIM_PIATU' | 'YATIM' | 'PIATU' | 'YATIM_PIATU' = 'BUKAN_YATIM_PIATU';
            if (!ayahAlive && !ibuAlive) newStatus = 'YATIM_PIATU';
            else if (!ayahAlive) newStatus = 'YATIM';
            else if (!ibuAlive) newStatus = 'PIATU';
            
            if (newStatus !== child.statusAnak) {
              await txDb.penduduk.update({
                where: { id: child.id },
                data: { statusAnak: newStatus }
              });
            }
          }
        }

        // Clear pasanganId on spouse if penduduk had a linked spouse
        if (existingPenduduk.pasanganId) {
          await txDb.penduduk.update({
            where: { id: existingPenduduk.pasanganId },
            data: { pasanganId: null },
          });
        }

        // Handle ganti kepala keluarga jika penduduk yang meninggal adalah kepala KK
        if (existingPenduduk.hubunganKeluarga === 'KEPALA_KELUARGA' && existingPenduduk.kkId) {
          if (gantiKepalaKeluargaId) {
            // Opsi 1: Ada pengganti — ganti kepala KK
            const VALID_HUBUNGAN = ['SUAMI','ISTRI','ANAK','ANAK_TIRI','ANAK_ANGKAT','MENANTU','CUCU','ORANG_TUA','MERTUA','FAMILI_LAIN','PEMBANTU','LAINNYA'];
            const selectedHubungan = hubunganKepalaLama || 'ORANG_TUA';

            // Validasi kepala baru ada di KK yang sama
            const kepalaBaru = await txDb.penduduk.findFirst({
              where: { id: gantiKepalaKeluargaId, kkId: existingPenduduk.kkId },
            });
            if (!kepalaBaru) {
              return NextResponse.json(
                { success: false, error: 'Calon kepala keluarga baru tidak ditemukan dalam KK ini' },
                { status: 400 }
              );
            }

            // Validasi kepala baru tidak meninggal/nonaktif
            if (kepalaBaru.status === 'MENINGGAL' || !kepalaBaru.isActive) {
              return NextResponse.json(
                { success: false, error: 'Calon kepala keluarga baru sudah tidak aktif atau meninggal' },
                { status: 400 }
              );
            }

            // Validasi hubungan valid
            if (!VALID_HUBUNGAN.includes(selectedHubungan as typeof VALID_HUBUNGAN[number])) {
              return NextResponse.json(
                { success: false, error: 'Hubungan keluarga tidak valid' },
                { status: 400 }
              );
            }

            // Update kepala yang meninggal: ubah hubungan keluarga
            await txDb.penduduk.update({
              where: { id: pendudukId },
              data: { hubunganKeluarga: selectedHubungan },
            });

            // Update kepala baru: jadi KEPALA_KELUARGA
            await txDb.penduduk.update({
              where: { id: gantiKepalaKeluargaId },
              data: { hubunganKeluarga: 'KEPALA_KELUARGA' },
            });

            // Update KK: kepalaKeluargaId
            await txDb.kK.update({
              where: { id: existingPenduduk.kkId },
              data: { kepalaKeluargaId: gantiKepalaKeluargaId },
            });

            processedData = {
              pendudukDiupdate: {
                id: pendudukId,
                nik: existingPenduduk.nik,
                namaLengkap: existingPenduduk.namaLengkap,
                statusBaru: 'MENINGGAL'
              },
              gantiKepala: {
                kkId: existingPenduduk.kkId,
                kepalaLama: existingPenduduk.namaLengkap,
                kepalaBaru: kepalaBaru.namaLengkap,
                hubunganKepalaLama: selectedHubungan,
              }
            };
          } else {
            // Opsi 2: Tidak ada pengganti — nonaktifkan KK
            await txDb.kK.update({
              where: { id: existingPenduduk.kkId },
              data: { isActive: false },
            });

            processedData = {
              pendudukDiupdate: {
                id: pendudukId,
                nik: existingPenduduk.nik,
                namaLengkap: existingPenduduk.namaLengkap,
                statusBaru: 'MENINGGAL'
              },
              kkDinonaktifkan: {
                kkId: existingPenduduk.kkId,
                alasan: 'Tidak ada pengganti kepala keluarga',
              }
            };
          }
        } else {
          processedData = {
            pendudukDiupdate: {
              id: pendudukId,
              nik: existingPenduduk.nik,
              namaLengkap: existingPenduduk.namaLengkap,
              statusBaru: 'MENINGGAL'
            }
          };
        }
        break;
      }

      case 'PINDAH_MASUK': {
        // Create new penduduk for pindah masuk
        if (!pendudukBaru?.namaLengkap) {
          return NextResponse.json(
            { success: false, error: 'Nama lengkap wajib diisi untuk pindah masuk' },
            { status: 400 }
          );
        }
        if (!kkId) {
          return NextResponse.json(
            { success: false, error: 'KK tujuan wajib dipilih untuk pindah masuk' },
            { status: 400 }
          );
        }
        if (!pendudukBaru?.nik || pendudukBaru.nik.length !== 16) {
          return NextResponse.json(
            { success: false, error: 'NIK wajib diisi 16 digit untuk pindah masuk' },
            { status: 400 }
          );
        }
        if (!pendudukBaru?.tanggalLahir) {
          return NextResponse.json(
            { success: false, error: 'Tanggal lahir wajib diisi' },
            { status: 400 }
          );
        }
        if (new Date(pendudukBaru.tanggalLahir) > new Date()) {
          return NextResponse.json(
            { success: false, error: 'Tanggal lahir tidak boleh lebih dari hari ini' },
            { status: 400 }
          );
        }

        // Check if NIK already exists
        const nikPendatang = pendudukBaru.nik;
        const existingNIK = await txDb.penduduk.findUnique({ where: { nik: nikPendatang } });
        if (existingNIK) {
          return NextResponse.json(
            { success: false, error: 'NIK sudah terdaftar di sistem. Pastikan bukan data duplikat.' },
            { status: 400 }
          );
        }

        // Validate KK exists and belongs to desa
        const kkMasuk = await txDb.kK.findFirst({
          where: { id: kkId, desaId },
          select: { id: true },
        });
        if (!kkMasuk) {
          return NextResponse.json(
            { success: false, error: 'KK tidak ditemukan atau bukan dari desa Anda' },
            { status: 404 }
          );
        }

        // Calculate urutanDalamKK
        const maxUrutanMasuk = await txDb.penduduk.aggregate({
          where: { kkId, isActive: true },
          _max: { urutanDalamKK: true },
        });
        const urutanBaruMasuk = (maxUrutanMasuk._max.urutanDalamKK || 0) + 1;

        // Auto-set ayahId/ibuId for pindah masuk with child hubungan
        const CHILD_HUBUNGAN = ['ANAK', 'ANAK_TIRI', 'ANAK_ANGKAT'];
        const hubMasuk = pendudukBaru.hubunganKeluarga || null;
        let autoAyahIdMasuk: string | null = null;
        let autoIbuIdMasuk: string | null = null;
        if (hubMasuk && CHILD_HUBUNGAN.includes(hubMasuk)) {
          const ortuMasuk = await txDb.penduduk.findMany({
            where: {
              kkId,
              hubunganKeluarga: { in: ['SUAMI', 'ISTRI', 'KEPALA_KELUARGA'] },
              isActive: true,
              status: { not: 'MENINGGAL' },
            },
            select: { id: true, hubunganKeluarga: true, jenisKelamin: true },
          });
          const suamiMasuk = ortuMasuk.find(p => p.hubunganKeluarga === 'SUAMI');
          const istriMasuk = ortuMasuk.find(p => p.hubunganKeluarga === 'ISTRI');
          const kepalaMasuk = ortuMasuk.find(p => p.hubunganKeluarga === 'KEPALA_KELUARGA');
          autoAyahIdMasuk = suamiMasuk?.id || (kepalaMasuk?.jenisKelamin === 'LAKI_LAKI' ? kepalaMasuk.id : null);
          autoIbuIdMasuk = istriMasuk?.id || (kepalaMasuk?.jenisKelamin === 'PEREMPUAN' ? kepalaMasuk.id : null);
        }

        // Create new penduduk with status TETAP
        const newPenduduk = await txDb.penduduk.create({
          data: {
            desaId,
            nik: nikPendatang,
            namaLengkap: pendudukBaru.namaLengkap,
            tempatLahir: pendudukBaru.tempatLahir || null,
            tanggalLahir: pendudukBaru.tanggalLahir ? new Date(pendudukBaru.tanggalLahir) : null,
            jenisKelamin: (pendudukBaru.jenisKelamin || 'LAKI_LAKI') as JenisKelamin,
            agama: (pendudukBaru.agama || 'ISLAM') as Agama,
            pekerjaan: pendudukBaru.pekerjaan || null,
            pendidikan: pendudukBaru.pendidikan || null,
            statusPerkawinan: (pendudukBaru.statusPerkawinan || 'BELUM_KAWIN') as StatusPerkawinan,
            status: 'TETAP' as StatusPenduduk,
            statusKTP: 'SUDAH_BUAT' as StatusKTP,
            kewarganegaraan: 'WNI' as Kewarganegaraan,
            jenisDisabilitas: 'TIDAK_ADA' as JenisDisabilitas,
            kkId: kkId,
            hubunganKeluarga: pendudukBaru.hubunganKeluarga || null,
            urutanDalamKK: urutanBaruMasuk,
            ayahId: autoAyahIdMasuk,
            ibuId: autoIbuIdMasuk,
          }
        });

        createdPendudukId = newPenduduk.id;
        processedData = {
          pendudukBaru: {
            id: newPenduduk.id,
            nik: newPenduduk.nik,
            namaLengkap: newPenduduk.namaLengkap,
            status: 'TETAP'
          }
        };
        break;
      }

      case 'PINDAH_KELUAR': {
        // Validasi tanggal pindah tidak di masa depan
        if (tanggalPeristiwa && new Date(tanggalPeristiwa) > new Date()) {
          return NextResponse.json(
            { success: false, error: 'Tanggal pindah tidak boleh lebih dari hari ini' },
            { status: 400 }
          );
        }

        // Validasi alamat tujuan wajib diisi
        if (!alamatTujuan || alamatTujuan.trim() === '') {
          return NextResponse.json(
            { success: false, error: 'Alamat tujuan pindah wajib diisi' },
            { status: 400 }
          );
        }

        // Support multi-anggota: pindahKeluarIds (array) atau pendudukId (single/legacy)
        const pindahIds: string[] = Array.isArray(pindahKeluarIds) && pindahKeluarIds.length > 0
          ? pindahKeluarIds
          : pendudukId
            ? [pendudukId]
            : [];

        if (pindahIds.length === 0) {
          return NextResponse.json(
            { success: false, error: 'Pilih minimal 1 penduduk yang pindah keluar' },
            { status: 400 }
          );
        }

        // Validasi semua penduduk ada dan milik desa
        const daftarPindah = await txDb.penduduk.findMany({
          where: { id: { in: pindahIds }, desaId },
          select: {
            id: true,
            nik: true,
            namaLengkap: true,
            hubunganKeluarga: true,
            kkId: true,
            status: true,
            isActive: true,
            pasanganId: true,
          },
        });

        if (daftarPindah.length !== pindahIds.length) {
          return NextResponse.json(
            { success: false, error: 'Beberapa penduduk tidak ditemukan atau bukan dari desa Anda' },
            { status: 404 }
          );
        }

        // Validasi tidak ada penduduk yang sudah tidak aktif (sudah pindah/meninggal)
        const sudahTidakAktif = daftarPindah.filter(p => !p.isActive || p.status === 'PINDAH' || p.status === 'MENINGGAL');
        if (sudahTidakAktif.length > 0) {
          return NextResponse.json(
            { success: false, error: `${sudahTidakAktif.map(p => p.namaLengkap).join(', ')} sudah tidak aktif (status: ${sudahTidakAktif[0].status}). Tidak dapat dipindahkan.` },
            { status: 400 }
          );
        }

        // Update semua penduduk: status PINDAH, isActive false, kkId null, clear pasanganId
        await txDb.penduduk.updateMany({
          where: { id: { in: pindahIds } },
          data: {
            status: 'PINDAH' as StatusPenduduk,
            isActive: false,
            kkId: null, // Keluar dari KK
            pasanganId: null, // Putus link pasangan saat pindah
          },
        });

        // Recompute statusAnak for children left behind whose parent(s) are leaving
        const childrenLeftBehind = await txDb.penduduk.findMany({
          where: {
            OR: [
              { ayahId: { in: pindahIds } },
              { ibuId: { in: pindahIds } },
            ],
            isActive: true,
          },
          select: { id: true, ayahId: true, ibuId: true, statusAnak: true },
        });

        if (childrenLeftBehind.length > 0) {
          const parentIdsAll = [...new Set(childrenLeftBehind.flatMap(c => [c.ayahId, c.ibuId].filter(Boolean) as string[]))];
          const parentsAll = await txDb.penduduk.findMany({
            where: { id: { in: parentIdsAll } },
            select: { id: true, isActive: true, status: true },
          });
          const parentMap = new Map(parentsAll.map(p => [p.id, p]));

          for (const child of childrenLeftBehind) {
            const ayahAlive = child.ayahId ? (() => { const p = parentMap.get(child.ayahId!); return !!(p && p.isActive && p.status !== 'MENINGGAL'); })() : false;
            const ibuAlive = child.ibuId ? (() => { const p = parentMap.get(child.ibuId!); return !!(p && p.isActive && p.status !== 'MENINGGAL'); })() : false;

            let newStatus: 'BUKAN_YATIM_PIATU' | 'YATIM' | 'PIATU' | 'YATIM_PIATU' = 'BUKAN_YATIM_PIATU';
            if (!ayahAlive && !ibuAlive) newStatus = 'YATIM_PIATU';
            else if (!ayahAlive) newStatus = 'YATIM';
            else if (!ibuAlive) newStatus = 'PIATU';

            if (newStatus !== child.statusAnak) {
              await txDb.penduduk.update({
                where: { id: child.id },
                data: { statusAnak: newStatus },
              });
            }
          }
        }

        // Clear pasanganId on spouses who are left behind
        // (the departing penduduk's pasangan still has a link to them)
        const pasanganIds = daftarPindah
          .map(p => p.pasanganId)
          .filter((id): id is string => !!id && !pindahIds.includes(id));
        if (pasanganIds.length > 0) {
          await txDb.penduduk.updateMany({
            where: { id: { in: pasanganIds } },
            data: { pasanganId: null },
          });
        }

        processedData = {
          jumlahPindah: pindahIds.length,
          daftarPindah: daftarPindah.map(p => ({
            id: p.id,
            nik: p.nik,
            namaLengkap: p.namaLengkap,
          })),
        };

        // Cek apakah ada kepala KK yang pindah
        const kepalaKkPindah = daftarPindah.find(p => p.hubunganKeluarga === 'KEPALA_KELUARGA' && p.kkId);
        if (kepalaKkPindah) {
          const kkIdPindah = kepalaKkPindah.kkId!;

          // Cek anggota KK yang TIDAK ikut pindah (kkId belum di-null-kan oleh updateMany di atas 
          // karena kita sudah update kkId null untuk semua pindahIds, 
          // jadi cari anggota yang id-nya TIDAK ada di pindahIds)
          const sisaAnggota = await txDb.penduduk.findMany({
            where: {
              kkId: kkIdPindah,
              id: { notIn: pindahIds },
              status: { not: 'MENINGGAL' },
              isActive: true,
            },
            select: {
              id: true,
              nik: true,
              namaLengkap: true,
              hubunganKeluarga: true,
            },
          });

          if (sisaAnggota.length > 0 && gantiKepalaPindahId) {
            // Opsi A: Ada pengganti kepala KK
            const isValid = sisaAnggota.some(a => a.id === gantiKepalaPindahId);
            if (!isValid) {
              return NextResponse.json(
                { success: false, error: 'Pengganti kepala keluarga harus dari anggota KK yang tidak ikut pindah' },
                { status: 400 }
              );
            }

            // Update kepala baru
            await txDb.penduduk.update({
              where: { id: gantiKepalaPindahId },
              data: { hubunganKeluarga: 'KEPALA_KELUARGA' },
            });

            // Update KK
            await txDb.kK.update({
              where: { id: kkIdPindah },
              data: { kepalaKeluargaId: gantiKepalaPindahId ?? undefined },
            });

            processedData.gantiKepala = {
              kkId: kkIdPindah,
              kepalaLama: kepalaKkPindah.namaLengkap,
              kepalaBaru: sisaAnggota.find(a => a.id === gantiKepalaPindahId)?.namaLengkap,
            };
          } else if (sisaAnggota.length === 0 || !gantiKepalaPindahId) {
            // Opsi B: KK bubar (semua ikut pindah atau tidak ada pengganti)
            if (sisaAnggota.length === 0) {
              // Semua anggota ikut pindah → nonaktifkan KK
              await txDb.kK.update({
                where: { id: kkIdPindah },
                data: { isActive: false },
              });
              processedData.kkDinonaktifkan = {
                kkId: kkIdPindah,
                alasan: 'Seluruh anggota KK pindah keluar',
              };
            } else if (!gantiKepalaPindahId) {
              // Ada sisa anggota tapi tidak pilih pengganti → nonaktifkan KK
              await txDb.kK.update({
                where: { id: kkIdPindah },
                data: { isActive: false },
              });
              processedData.kkDinonaktifkan = {
                kkId: kkIdPindah,
                alasan: 'Tidak ada pengganti kepala keluarga yang dipilih',
              };
            }
          }
        }

        break;
      }

      case 'PERKAWINAN': {
        if (!pendudukId) {
          return NextResponse.json(
            { success: false, error: 'Penduduk wajib dipilih untuk perkawinan' },
            { status: 400 }
          );
        }

        // Check if penduduk exists and belongs to user's desa
        const existingPenduduk = await txDb.penduduk.findFirst({ 
          where: { 
            id: pendudukId,
            desaId
          },
          select: {
            id: true,
            nik: true,
            namaLengkap: true,
            jenisKelamin: true,
            tanggalLahir: true,
            hubunganKeluarga: true,
            kkId: true,
            status: true,
            isActive: true,
            statusPerkawinan: true,
            pasanganId: true,
          }
        });
        if (!existingPenduduk) {
          return NextResponse.json(
            { success: false, error: 'Penduduk tidak ditemukan atau bukan dari desa Anda' },
            { status: 404 }
          );
        }

        // Validasi: penduduk masih aktif
        if (!existingPenduduk.isActive || existingPenduduk.status === 'MENINGGAL' || existingPenduduk.status === 'PINDAH') {
          return NextResponse.json(
            { success: false, error: `Penduduk sudah tidak aktif (status: ${existingPenduduk.status}). Tidak dapat mencatat perkawinan.` },
            { status: 400 }
          );
        }

        // Validasi: status perkawinan saat ini harus BELUM_KAWIN atau CERAI
        const statusSekarang = existingPenduduk.statusPerkawinan;
        if (statusSekarang !== 'BELUM_KAWIN' && !statusSekarang?.startsWith('CERAI')) {
          return NextResponse.json(
            { success: false, error: `Penduduk sudah berstatus ${statusSekarang}. Tidak dapat mencatat perkawinan.` },
            { status: 400 }
          );
        }

        // Validasi: usia minimal perkawinan (19 tahun berdasarkan UU No. 16 Tahun 2019)
        if (existingPenduduk.tanggalLahir) {
          const usia = Math.floor((new Date(tanggalPeristiwa).getTime() - existingPenduduk.tanggalLahir.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          if (usia < 19) {
            return NextResponse.json(
              { success: false, error: `Usia penduduk ${usia} tahun, belum memenuhi usia minimal perkawinan (19 tahun).` },
              { status: 400 }
            );
          }
        }

        // Determine status perkawinan: tercatat or tidak tercatat
        const validStatusTarget = ['KAWIN_TERCATAT', 'KAWIN_TIDAK_TERCATAT'].includes(statusPerkawinanTarget)
          ? statusPerkawinanTarget
          : (aktaPerkawinan ? 'KAWIN_TERCATAT' : 'KAWIN_TIDAK_TERCATAT');

        // Update status perkawinan penduduk utama
        await txDb.penduduk.update({
          where: { id: pendudukId },
          data: {
            statusPerkawinan: validStatusTarget as StatusPerkawinan,
            tanggalPerkawinan: tanggalPerkawinan ? new Date(tanggalPerkawinan) : new Date(tanggalPeristiwa),
            aktaPerkawinan: aktaPerkawinan || null,
            // Set pasangan link
            ...(pasanganId ? { pasanganId } : {}),
          }
        });

        processedData = {
          pendudukDiupdate: {
            id: pendudukId,
            nik: existingPenduduk.nik,
            namaLengkap: existingPenduduk.namaLengkap,
            statusPerkawinanLama: statusSekarang,
            statusPerkawinanBaru: validStatusTarget,
          }
        };

        // Handle pasangan jika ada
        if (pasanganId) {
          const existingPasangan = await txDb.penduduk.findFirst({
            where: { id: pasanganId, desaId },
            select: {
              id: true,
              nik: true,
              namaLengkap: true,
              jenisKelamin: true,
              tanggalLahir: true,
              hubunganKeluarga: true,
              kkId: true,
              status: true,
              isActive: true,
              statusPerkawinan: true,
            }
          });

          if (!existingPasangan) {
            return NextResponse.json(
              { success: false, error: 'Pasangan tidak ditemukan atau bukan dari desa Anda' },
              { status: 404 }
            );
          }

          // Validasi: pasangan tidak boleh sama dengan penduduk utama
          if (pasanganId === pendudukId) {
            return NextResponse.json(
              { success: false, error: 'Pasangan tidak boleh sama dengan penduduk yang dipilih' },
              { status: 400 }
            );
          }

          // Validasi: jenis kelamin harus berbeda (syarat perkawinan di Indonesia)
          if (existingPenduduk.jenisKelamin === existingPasangan.jenisKelamin) {
            const jkLabel = existingPenduduk.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan';
            return NextResponse.json(
              { success: false, error: `Penduduk dan pasangan memiliki jenis kelamin yang sama (${jkLabel}). Perkawinan memerlukan jenis kelamin yang berbeda.` },
              { status: 400 }
            );
          }

          // Validasi pasangan aktif
          if (!existingPasangan.isActive || existingPasangan.status === 'MENINGGAL' || existingPasangan.status === 'PINDAH') {
            return NextResponse.json(
              { success: false, error: `Pasangan sudah tidak aktif (status: ${existingPasangan.status}).` },
              { status: 400 }
            );
          }

          // Validasi status pasangan
          const statusPasangan = existingPasangan.statusPerkawinan;
          if (statusPasangan !== 'BELUM_KAWIN' && !statusPasangan?.startsWith('CERAI')) {
            return NextResponse.json(
              { success: false, error: `Pasangan sudah berstatus ${statusPasangan}.` },
              { status: 400 }
            );
          }

          // Validasi usia pasangan
          if (existingPasangan.tanggalLahir) {
            const usiaPasangan = Math.floor((new Date(tanggalPeristiwa).getTime() - existingPasangan.tanggalLahir.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
            if (usiaPasangan < 19) {
              return NextResponse.json(
                { success: false, error: `Usia pasangan ${usiaPasangan} tahun, belum memenuhi usia minimal perkawinan (19 tahun).` },
                { status: 400 }
              );
            }
          }

          // Update status perkawinan pasangan + set reciprocal pasanganId
          await txDb.penduduk.update({
            where: { id: pasanganId },
            data: {
              statusPerkawinan: validStatusTarget as StatusPerkawinan,
              tanggalPerkawinan: tanggalPerkawinan ? new Date(tanggalPerkawinan) : new Date(tanggalPeristiwa),
              aktaPerkawinan: aktaPerkawinan || null,
              pasanganId: pendudukId,
            }
          });

          processedData.pasanganDiupdate = {
            id: pasanganId,
            nik: existingPasangan.nik,
            namaLengkap: existingPasangan.namaLengkap,
            statusPerkawinanLama: statusPasangan,
            statusPerkawinanBaru: validStatusTarget,
          };

          // Handle KK jika pasangan dari KK berbeda
          const kkIdPenduduk = existingPenduduk.kkId;
          const kkIdPasangan = existingPasangan.kkId;

          if (kkIdPenduduk && kkIdPasangan && kkIdPenduduk !== kkIdPasangan && opsiKKPerkawinan !== 'TETAP_DI_KK_MASING2') {
            if (opsiKKPerkawinan === 'PINDAH_KE_KK_PENDUDUK') {
              // Pasangan pindah ke KK penduduk utama
              const validHubungan = existingPenduduk.jenisKelamin === 'LAKI_LAKI' ? 'ISTRI' : 'SUAMI';
              const finalHubungan = hubunganPasanganDiKK || validHubungan;

              // Jika pasangan kepala KK, perlu ganti kepala
              if (existingPasangan.hubunganKeluarga === 'KEPALA_KELUARGA') {
                const sisaAnggotaPasangan = await txDb.penduduk.findMany({
                  where: { kkId: kkIdPasangan, id: { not: pasanganId }, status: { not: 'MENINGGAL' }, isActive: true },
                  select: { id: true, namaLengkap: true },
                });
                if (sisaAnggotaPasangan.length > 0 && gantiKepalaPerkawinanPasanganId) {
                  const isValid = sisaAnggotaPasangan.some(a => a.id === gantiKepalaPerkawinanPasanganId);
                  if (!isValid) {
                    return NextResponse.json(
                      { success: false, error: 'Pengganti kepala keluarga pasangan harus dari anggota KK yang tersisa' },
                      { status: 400 }
                    );
                  }
                  const kepalaBaru = sisaAnggotaPasangan.find(a => a.id === gantiKepalaPerkawinanPasanganId);
                  await txDb.penduduk.update({ where: { id: gantiKepalaPerkawinanPasanganId }, data: { hubunganKeluarga: 'KEPALA_KELUARGA' } });
                  await txDb.kK.update({ where: { id: kkIdPasangan }, data: { kepalaKeluargaId: gantiKepalaPerkawinanPasanganId } });
                  processedData.gantiKepalaKKPasangan = { kkId: kkIdPasangan, kepalaLama: existingPasangan.namaLengkap, kepalaBaru: kepalaBaru?.namaLengkap };
                } else if (sisaAnggotaPasangan.length > 0 && !gantiKepalaPerkawinanPasanganId) {
                  // Ada sisa anggota tapi admin tidak pilih pengganti → nonaktifkan KK
                  await txDb.kK.update({ where: { id: kkIdPasangan }, data: { isActive: false } });
                  processedData.kkPasanganDinonaktifkan = { kkId: kkIdPasangan, alasan: 'Tidak ada pengganti kepala keluarga yang dipilih' };
                } else {
                  // Tidak ada sisa anggota → nonaktifkan KK
                  await txDb.kK.update({ where: { id: kkIdPasangan }, data: { isActive: false } });
                  processedData.kkPasanganDinonaktifkan = { kkId: kkIdPasangan, alasan: 'Seluruh anggota KK ikut menikah' };
                }
              }

              await txDb.penduduk.update({ where: { id: pasanganId }, data: { kkId: kkIdPenduduk, hubunganKeluarga: finalHubungan } });
              processedData.pindahPasanganKeKK = { kkId: kkIdPenduduk, hubungan: finalHubungan };

            } else if (opsiKKPerkawinan === 'BUAT_KK_BARU') {
              const alamatKKBaruPerkawinan = body.alamatKKBaru;
              if (!alamatKKBaruPerkawinan) {
                return NextResponse.json({ success: false, error: 'Alamat KK baru wajib diisi' }, { status: 400 });
              }

              const kepalaBaruId = existingPenduduk.jenisKelamin === 'LAKI_LAKI' ? pendudukId : pasanganId;
              const anggotaId = existingPenduduk.jenisKelamin === 'LAKI_LAKI' ? pasanganId : pendudukId;
              const hubunganAnggota = existingPenduduk.jenisKelamin === 'LAKI_LAKI' ? 'ISTRI' : 'SUAMI';

              // Handle kepala KK lama penduduk utama
              if (existingPenduduk.hubunganKeluarga === 'KEPALA_KELUARGA' && kkIdPenduduk) {
                const sisaAnggota = await txDb.penduduk.findMany({
                  where: { kkId: kkIdPenduduk, id: { not: pendudukId }, status: { not: 'MENINGGAL' }, isActive: true },
                  select: { id: true, namaLengkap: true },
                });
                if (sisaAnggota.length > 0 && gantiKepalaPerkawinanPendudukId) {
                  const isValid = sisaAnggota.some(a => a.id === gantiKepalaPerkawinanPendudukId);
                  if (!isValid) {
                    return NextResponse.json(
                      { success: false, error: 'Pengganti kepala keluarga penduduk harus dari anggota KK yang tersisa' },
                      { status: 400 }
                    );
                  }
                  const kepalaBaru = sisaAnggota.find(a => a.id === gantiKepalaPerkawinanPendudukId);
                  await txDb.penduduk.update({ where: { id: gantiKepalaPerkawinanPendudukId }, data: { hubunganKeluarga: 'KEPALA_KELUARGA' } });
                  await txDb.kK.update({ where: { id: kkIdPenduduk }, data: { kepalaKeluargaId: gantiKepalaPerkawinanPendudukId } });
                  processedData.gantiKepalaKKPenduduk = { kkId: kkIdPenduduk, kepalaLama: existingPenduduk.namaLengkap, kepalaBaru: kepalaBaru?.namaLengkap };
                } else if (sisaAnggota.length > 0 && !gantiKepalaPerkawinanPendudukId) {
                  await txDb.kK.update({ where: { id: kkIdPenduduk }, data: { isActive: false } });
                  processedData.kkPendudukDinonaktifkan = { kkId: kkIdPenduduk, alasan: 'Tidak ada pengganti kepala keluarga yang dipilih' };
                } else {
                  await txDb.kK.update({ where: { id: kkIdPenduduk }, data: { isActive: false } });
                  processedData.kkPendudukDinonaktifkan = { kkId: kkIdPenduduk, alasan: 'Seluruh anggota KK ikut menikah' };
                }
              }

              // Handle kepala KK lama pasangan
              if (existingPasangan.hubunganKeluarga === 'KEPALA_KELUARGA' && kkIdPasangan) {
                const sisaAnggotaP = await txDb.penduduk.findMany({
                  where: { kkId: kkIdPasangan, id: { not: pasanganId }, status: { not: 'MENINGGAL' }, isActive: true },
                  select: { id: true, namaLengkap: true },
                });
                if (sisaAnggotaP.length > 0 && gantiKepalaPerkawinanPasanganId) {
                  const isValid = sisaAnggotaP.some(a => a.id === gantiKepalaPerkawinanPasanganId);
                  if (!isValid) {
                    return NextResponse.json(
                      { success: false, error: 'Pengganti kepala keluarga pasangan harus dari anggota KK yang tersisa' },
                      { status: 400 }
                    );
                  }
                  const kepalaBaru = sisaAnggotaP.find(a => a.id === gantiKepalaPerkawinanPasanganId);
                  await txDb.penduduk.update({ where: { id: gantiKepalaPerkawinanPasanganId }, data: { hubunganKeluarga: 'KEPALA_KELUARGA' } });
                  await txDb.kK.update({ where: { id: kkIdPasangan }, data: { kepalaKeluargaId: gantiKepalaPerkawinanPasanganId } });
                  processedData.gantiKepalaKKPasangan = { kkId: kkIdPasangan, kepalaLama: existingPasangan.namaLengkap, kepalaBaru: kepalaBaru?.namaLengkap };
                } else if (sisaAnggotaP.length > 0 && !gantiKepalaPerkawinanPasanganId) {
                  await txDb.kK.update({ where: { id: kkIdPasangan }, data: { isActive: false } });
                  processedData.kkPasanganDinonaktifkan = { kkId: kkIdPasangan, alasan: 'Tidak ada pengganti kepala keluarga yang dipilih' };
                } else {
                  await txDb.kK.update({ where: { id: kkIdPasangan }, data: { isActive: false } });
                  processedData.kkPasanganDinonaktifkan = { kkId: kkIdPasangan, alasan: 'Seluruh anggota KK ikut menikah' };
                }
              }

              // Buat KK baru
              const nomorKKBaru = generateKKNumber(kodeKecamatan);
              const newKK = await txDb.kK.create({
                data: {
                  nomorKK: nomorKKBaru,
                  alamat: alamatKKBaruPerkawinan,
                  rtId: body.rtIdKKBaru || null,
                  dusunId: body.dusunIdKKBaru || null,
                  jenisTempatTinggal: 'MILIK_SENDIRI',
                  kepalaKeluargaId: kepalaBaruId,
                  desaId,
                }
              });
              await txDb.penduduk.update({ where: { id: kepalaBaruId }, data: { kkId: newKK.id, hubunganKeluarga: 'KEPALA_KELUARGA' } });
              await txDb.penduduk.update({ where: { id: anggotaId }, data: { kkId: newKK.id, hubunganKeluarga: hubunganAnggota } });

              createdKKId = newKK.id;
              processedData.kkBaru = { id: newKK.id, nomorKK: newKK.nomorKK };
            }
          }
        }

        break;
      }

      case 'PERCERAIAN': {
        if (!pendudukId) {
          return NextResponse.json(
            { success: false, error: 'Penduduk wajib dipilih untuk perceraian' },
            { status: 400 }
          );
        }

        // Check if penduduk exists and belongs to user's desa
        const existingPenduduk = await txDb.penduduk.findFirst({ 
          where: { 
            id: pendudukId,
            desaId
          },
          select: {
            id: true,
            nik: true,
            namaLengkap: true,
            hubunganKeluarga: true,
            kkId: true,
            status: true,
            isActive: true,
            statusPerkawinan: true,
            pasanganId: true,
          }
        });
        if (!existingPenduduk) {
          return NextResponse.json(
            { success: false, error: 'Penduduk tidak ditemukan atau bukan dari desa Anda' },
            { status: 404 }
          );
        }

        // Validasi: penduduk masih aktif
        if (!existingPenduduk.isActive || existingPenduduk.status === 'MENINGGAL' || existingPenduduk.status === 'PINDAH') {
          return NextResponse.json(
            { success: false, error: `Penduduk sudah tidak aktif (status: ${existingPenduduk.status}). Tidak dapat mencatat perceraian.` },
            { status: 400 }
          );
        }

        // Validasi: tanggal perceraian tidak boleh di masa depan
        const tglCerai = tanggalPerceraian ? new Date(tanggalPerceraian) : new Date(tanggalPeristiwa);
        if (tglCerai > new Date()) {
          return NextResponse.json(
            { success: false, error: 'Tanggal perceraian tidak boleh lebih dari hari ini' },
            { status: 400 }
          );
        }

        // Validasi: penduduk sudah menikah
        if (existingPenduduk.statusPerkawinan !== 'KAWIN_TERCATAT' && existingPenduduk.statusPerkawinan !== 'KAWIN_TIDAK_TERCATAT') {
          return NextResponse.json(
            { success: false, error: `Penduduk belum menikah (status: ${existingPenduduk.statusPerkawinan}). Tidak dapat mencatat perceraian.` },
            { status: 400 }
          );
        }

        // Validasi: tidak sudah cerai
        if (existingPenduduk.statusPerkawinan?.startsWith('CERAI')) {
          return NextResponse.json(
            { success: false, error: 'Penduduk sudah tercatat cerai sebelumnya.' },
            { status: 400 }
          );
        }

        // Determine status perceraian: use explicit statusPerceraianTarget if provided, otherwise auto-detect from akta
        const statusPerceraianValue = (
          ['CERAI_HIDUP_TERCATAT', 'CERAI_HIDUP_TIDAK_TERCATAT', 'CERAI_MATI'].includes(statusPerkawinanTarget as string)
            ? statusPerkawinanTarget
            : aktaPerceraian
              ? 'CERAI_HIDUP_TERCATAT'
              : 'CERAI_HIDUP_TIDAK_TERCATAT'
        ) as StatusPerkawinan;

        // Update status perkawinan + clear pasangan link
        await txDb.penduduk.update({
          where: { id: pendudukId },
          data: {
            statusPerkawinan: statusPerceraianValue,
            tanggalPerceraian: tglCerai,
            aktaPerceraian: statusPerceraianValue === 'CERAI_HIDUP_TERCATAT' ? (aktaPerceraian || null) : null,
            pasanganId: null,
          }
        });

        // Update pasangan: also change status to CERAI + clear pasanganId
        if (existingPenduduk.pasanganId) {
          const pasangan = await txDb.penduduk.findFirst({
            where: { id: existingPenduduk.pasanganId },
            select: { id: true, namaLengkap: true, nik: true, statusPerkawinan: true },
          });
          if (pasangan && (pasangan.statusPerkawinan === 'KAWIN_TERCATAT' || pasangan.statusPerkawinan === 'KAWIN_TIDAK_TERCATAT')) {
            await txDb.penduduk.update({
              where: { id: existingPenduduk.pasanganId },
              data: {
                statusPerkawinan: statusPerceraianValue,
                tanggalPerceraian: tglCerai,
                aktaPerceraian: statusPerceraianValue === 'CERAI_HIDUP_TERCATAT' ? (aktaPerceraian || null) : null,
                pasanganId: null,
              },
            });
            processedData.pasanganDiupdate = {
              id: pasangan.id,
              namaLengkap: pasangan.namaLengkap,
              nik: pasangan.nik,
              statusPerkawinanBaru: statusPerceraianValue,
            };
          } else {
            // Pasangan not found or not KAWIN — just clear pasanganId
            if (pasangan) {
              await txDb.penduduk.update({
                where: { id: existingPenduduk.pasanganId },
                data: { pasanganId: null },
              });
            }
            processedData.pasanganDilepas = { id: existingPenduduk.pasanganId };
          }
        }

        // FIX: Gunakan spread agar pasanganDiupdate (jika sudah diset) tidak hilang
        processedData = {
          ...processedData,
          pendudukDiupdate: {
            id: pendudukId,
            nik: existingPenduduk.nik,
            namaLengkap: existingPenduduk.namaLengkap,
            statusPerkawinanBaru: statusPerceraianValue
          }
        };

        // Check if penduduk is kepala KK
        const isKepalaKK = existingPenduduk.hubunganKeluarga === 'KEPALA_KELUARGA' && existingPenduduk.kkId;

        if (isKepalaKK) {
          const kkIdLama = existingPenduduk.kkId!;
          const VALID_HUBUNGAN = ['SUAMI', 'ISTRI', 'ANAK', 'ANAK_TIRI', 'ANAK_ANGKAT', 'MENANTU', 'CUCU', 'ORANG_TUA', 'MERTUA', 'FAMILI_LAIN', 'PEMBANTU', 'LAINNYA'];

          // Get sisa anggota KK
          const sisaAnggota = await txDb.penduduk.findMany({
            where: {
              kkId: kkIdLama,
              id: { not: pendudukId },
              status: { not: 'MENINGGAL' },
              isActive: true,
            },
            select: {
              id: true,
              namaLengkap: true,
              nik: true,
              hubunganKeluarga: true,
            },
          });

          if (opsiKKPerceraian === 'BUAT_KK_BARU') {
            // Opsi B: Buat KK baru, kepala lama pindah ke KK baru
            if (!alamatKKBaru) {
              return NextResponse.json(
                { success: false, error: 'Alamat KK baru wajib diisi' },
                { status: 400 }
              );
            }

            // 1. Ganti kepala di KK lama jika ada sisa anggota
            if (sisaAnggota.length > 0 && gantiKepalaPerceraianId) {
              const isValid = sisaAnggota.some(a => a.id === gantiKepalaPerceraianId);
              if (!isValid) {
                return NextResponse.json(
                  { success: false, error: 'Pengganti kepala keluarga harus dari anggota KK yang tersisa' },
                  { status: 400 }
                );
              }
              const selectedHubungan = hubunganKepalaLamaPerceraian || 'ORANG_TUA';
              if (!VALID_HUBUNGAN.includes(selectedHubungan)) {
                return NextResponse.json(
                  { success: false, error: 'Hubungan keluarga tidak valid' },
                  { status: 400 }
                );
              }

              // Update kepala lama: ubah hubungan
              await txDb.penduduk.update({
                where: { id: pendudukId },
                data: { hubunganKeluarga: selectedHubungan },
              });
              // Update kepala baru
              await txDb.penduduk.update({
                where: { id: gantiKepalaPerceraianId },
                data: { hubunganKeluarga: 'KEPALA_KELUARGA' },
              });
              // Update KK lama
              await txDb.kK.update({
                where: { id: kkIdLama },
                data: { kepalaKeluargaId: gantiKepalaPerceraianId ?? undefined },
              });
              processedData.gantiKepala = {
                kkId: kkIdLama,
                kepalaLama: existingPenduduk.namaLengkap,
                kepalaBaru: sisaAnggota.find(a => a.id === gantiKepalaPerceraianId)?.namaLengkap,
                hubunganKepalaLama: selectedHubungan,
              };
            } else if (sisaAnggota.length > 0 && !gantiKepalaPerceraianId) {
              // Ada sisa anggota tapi tidak pilih pengganti → nonaktifkan KK
              await txDb.kK.update({
                where: { id: kkIdLama },
                data: { isActive: false },
              });
              processedData.kkDinonaktifkan = {
                kkId: kkIdLama,
                alasan: 'Tidak ada pengganti kepala keluarga yang dipilih',
              };
            } else if (sisaAnggota.length === 0) {
              // Tidak ada sisa → nonaktifkan KK lama
              await txDb.kK.update({
                where: { id: kkIdLama },
                data: { isActive: false },
              });
              processedData.kkDinonaktifkan = {
                kkId: kkIdLama,
                alasan: 'Seluruh anggota KK bercerai dan pindah ke KK baru',
              };
            }

            // 2. Buat KK baru
            const nomorKKBaru = generateKKNumber(kodeKecamatan);
            const newKK = await txDb.kK.create({
              data: {
                nomorKK: nomorKKBaru,
                alamat: alamatKKBaru,
                rtId: rtIdKKBaru || null,
                dusunId: dusunIdKKBaru || null,
                jenisTempatTinggal: 'MILIK_SENDIRI',
                kepalaKeluargaId: pendudukId,
                desaId,
              }
            });
            // Kepala lama pindah ke KK baru
            await txDb.penduduk.update({
              where: { id: pendudukId },
              data: {
                kkId: newKK.id,
                hubunganKeluarga: 'KEPALA_KELUARGA',
              },
            });
            createdKKId = newKK.id;
            processedData.kkBaru = { id: newKK.id, nomorKK: newKK.nomorKK };

          } else if (opsiKKPerceraian === 'PINDAH_KK_LAIN') {
            // Opsi C: Pindah ke KK lain yang sudah ada
            if (!pindahKKTujuanId) {
              return NextResponse.json(
                { success: false, error: 'Pilih KK tujuan' },
                { status: 400 }
              );
            }
            // Validasi KK tujuan ada dan bukan KK yang sama
            const kkTujuan = await txDb.kK.findFirst({
              where: { id: pindahKKTujuanId, desaId },
            });
            if (!kkTujuan) {
              return NextResponse.json(
                { success: false, error: 'KK tujuan tidak ditemukan atau bukan dari desa Anda' },
                { status: 404 }
              );
            }
            if (pindahKKTujuanId === kkIdLama) {
              return NextResponse.json(
                { success: false, error: 'Tidak dapat pindah ke KK yang sama' },
                { status: 400 }
              );
            }

            // 1. Ganti kepala di KK lama jika ada sisa anggota
            if (sisaAnggota.length > 0 && gantiKepalaPerceraianId) {
              const isValid = sisaAnggota.some(a => a.id === gantiKepalaPerceraianId);
              if (!isValid) {
                return NextResponse.json(
                  { success: false, error: 'Pengganti kepala keluarga harus dari anggota KK yang tersisa' },
                  { status: 400 }
                );
              }
              const selectedHubungan = hubunganKepalaLamaPerceraian || 'ORANG_TUA';
              if (!VALID_HUBUNGAN.includes(selectedHubungan)) {
                return NextResponse.json(
                  { success: false, error: 'Hubungan keluarga tidak valid' },
                  { status: 400 }
                );
              }
              await txDb.penduduk.update({
                where: { id: pendudukId },
                data: { hubunganKeluarga: selectedHubungan },
              });
              await txDb.penduduk.update({
                where: { id: gantiKepalaPerceraianId },
                data: { hubunganKeluarga: 'KEPALA_KELUARGA' },
              });
              await txDb.kK.update({
                where: { id: kkIdLama },
                data: { kepalaKeluargaId: gantiKepalaPerceraianId ?? undefined },
              });
              processedData.gantiKepala = {
                kkId: kkIdLama,
                kepalaLama: existingPenduduk.namaLengkap,
                kepalaBaru: sisaAnggota.find(a => a.id === gantiKepalaPerceraianId)?.namaLengkap,
                hubunganKepalaLama: selectedHubungan,
              };
            } else if (sisaAnggota.length > 0 && !gantiKepalaPerceraianId) {
              // Ada sisa anggota tapi tidak pilih pengganti → nonaktifkan KK
              await txDb.kK.update({
                where: { id: kkIdLama },
                data: { isActive: false },
              });
              processedData.kkDinonaktifkan = {
                kkId: kkIdLama,
                alasan: 'Tidak ada pengganti kepala keluarga yang dipilih',
              };
            } else if (sisaAnggota.length === 0) {
              await txDb.kK.update({
                where: { id: kkIdLama },
                data: { isActive: false },
              });
              processedData.kkDinonaktifkan = {
                kkId: kkIdLama,
                alasan: 'Seluruh anggota KK pindah',
              };
            }

            // 2. Pindah ke KK tujuan (sebagai anggota, bukan kepala)
            const hubunganDiKKTujuan = hubunganKepalaLamaPerceraian || 'FAMILI_LAIN';
            await txDb.penduduk.update({
              where: { id: pendudukId },
              data: {
                kkId: pindahKKTujuanId,
                hubunganKeluarga: hubunganDiKKTujuan,
              },
            });
            processedData.pindahKeKK = {
              kkId: pindahKKTujuanId,
              nomorKK: kkTujuan.nomorKK,
            };

          } else {
            // Opsi A (default / TETAP_GANTI_KEPALA): Tetap di KK, ganti kepala saja
            if (sisaAnggota.length > 0 && gantiKepalaPerceraianId) {
              const isValid = sisaAnggota.some(a => a.id === gantiKepalaPerceraianId);
              if (!isValid) {
                return NextResponse.json(
                  { success: false, error: 'Pengganti kepala keluarga harus dari anggota KK yang tersisa' },
                  { status: 400 }
                );
              }
              const selectedHubungan = hubunganKepalaLamaPerceraian || 'ORANG_TUA';
              if (!VALID_HUBUNGAN.includes(selectedHubungan)) {
                return NextResponse.json(
                  { success: false, error: 'Hubungan keluarga tidak valid' },
                  { status: 400 }
                );
              }
              await txDb.penduduk.update({
                where: { id: pendudukId },
                data: { hubunganKeluarga: selectedHubungan },
              });
              await txDb.penduduk.update({
                where: { id: gantiKepalaPerceraianId },
                data: { hubunganKeluarga: 'KEPALA_KELUARGA' },
              });
              await txDb.kK.update({
                where: { id: kkIdLama },
                data: { kepalaKeluargaId: gantiKepalaPerceraianId ?? undefined },
              });
              processedData.gantiKepala = {
                kkId: kkIdLama,
                kepalaLama: existingPenduduk.namaLengkap,
                kepalaBaru: sisaAnggota.find(a => a.id === gantiKepalaPerceraianId)?.namaLengkap,
                hubunganKepalaLama: selectedHubungan,
              };
            } else {
              // Tidak ada sisa → nonaktifkan KK
              await txDb.kK.update({
                where: { id: kkIdLama },
                data: { isActive: false },
              });
              processedData.kkDinonaktifkan = {
                kkId: kkIdLama,
                alasan: 'Tidak ada pengganti kepala keluarga',
              };
            }
          }

          // Kirim kkId untuk audit trail:
          // - Opsi B: kkId = KK baru (supaya peristiwa terkait KK yang dibuat)
          // - Opsi A & C: kkId = KK lama
          // createdKKId sudah di-set oleh masing-masing opsi (BUAT_KK_BARU set newKK.id)
          // Untuk opsi A & C, set ke kkIdLama jika belum di-set oleh opsi B
          if (opsiKKPerceraian !== 'BUAT_KK_BARU') {
            createdKKId = kkIdLama;
          }
          // Jika opsi B, createdKKId sudah = newKK.id dari line 800

        } else {
          // BUKAN kepala KK — hanya ubah status perkawinan, tidak ada efek KK
          // (opsi buat KK baru telah dihapus karena fitur perceraian difokuskan untuk kepala KK)
        }

        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Jenis peristiwa tidak valid' },
          { status: 400 }
        );
    }

    // Buat peristiwa baru dengan desaId
    const peristiwa = await txDb.peristiwaKependudukan.create({
      data: {
        desaId, // Add desaId for multi-tenant
        jenisPeristiwa: jenisPeristiwa as JenisPeristiwa,
        pendudukId: createdPendudukId || pendudukId || null,
        kkId: createdKKId || null,
        tanggalPeristiwa: tanggalPeristiwa ? new Date(tanggalPeristiwa) : new Date(),
        tempat: tempat || null,
        keterangan: keterangan || null,
        alamatAsal: alamatAsal || alamatPindah || null,
        alamatTujuan: alamatTujuan || null,
        penyebabKematian: penyebabKematian || null,
        namaBayi: namaBayi || null,
        jenisKelaminBayi: jenisKelaminBayi as JenisKelamin || null,
        beratBayi: beratBayi || null,
        panjangBayi: panjangBayi || null,
        isProcessed: true, // Auto processed
      },
      include: {
        penduduk: {
          select: {
            id: true,
            nik: true,
            namaLengkap: true,
            jenisKelamin: true,
          }
        },
        kk: {
          select: {
            id: true,
            nomorKK: true,
          }
        }
      }
    });

    // Catat log aktivitas
    const logDescriptions: Record<string, string> = {
      KELAHIRAN: `Kelahiran: ${namaBayi} (${(processedData.pendudukBaru as { nik?: string })?.nik})`,
      KEMATIAN: `Kematian: ${(processedData.pendudukDiupdate as { namaLengkap?: string })?.namaLengkap} (${(processedData.pendudukDiupdate as { nik?: string })?.nik})`,
      PINDAH_MASUK: `Pindah Masuk: ${(processedData.pendudukBaru as { namaLengkap?: string })?.namaLengkap} (${(processedData.pendudukBaru as { nik?: string })?.nik})`,
      PINDAH_KELUAR: `Pindah Keluar: ${processedData.jumlahPindah} penduduk${(processedData.daftarPindah as Array<{ namaLengkap?: string }>)?.map((p: any) => p.namaLengkap).join(', ') || ''}`,
      PERKAWINAN: `Perkawinan: ${(processedData.pendudukDiupdate as { namaLengkap?: string })?.namaLengkap}${(processedData.pasanganDiupdate as { namaLengkap?: string })?.namaLengkap ? ` + ${((processedData.pasanganDiupdate as { namaLengkap?: string })?.namaLengkap)}` : ''}`,
      PERCERAIAN: `Perceraian: ${(processedData.pendudukDiupdate as { namaLengkap?: string })?.namaLengkap}${processedData.gantiKepala ? ` — Ganti KK: ${((processedData.gantiKepala as any)?.kepalaBaru || '')}` : ''}${processedData.kkBaru ? ' — KK baru dibuat' : ''}${processedData.kkDinonaktifkan ? ' — KK lama dinonaktifkan' : ''}${processedData.pindahKeKK ? ` — Pindah ke KK ${((processedData.pindahKeKK as any)?.nomorKK || '')}` : ''}`,
    };

    await txDb.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.namaLengkap,
        aksi: 'CREATE',
        modul: 'PENDUDUK',
        deskripsi: logDescriptions[jenisPeristiwa] || `Peristiwa ${jenisPeristiwa}`,
        dataRef: JSON.stringify({
          peristiwaId: peristiwa.id,
          jenisPeristiwa,
          ...processedData
        }),
      },
    });

    return peristiwa;
    }); // end transaction

    // Note: the transaction returns peristiwa directly (or NextResponse for errors)
    // Lines below are unreachable but kept for type safety
    if (result instanceof NextResponse) return result;
    const peristiwa = result;

    return NextResponse.json({
      success: true,
      data: {
        ...peristiwa,
        tanggalPeristiwa: peristiwa.tanggalPeristiwa?.toISOString() || null,
        processedData,
      },
      message: 'Peristiwa berhasil ditambahkan dan data telah diproses',
    });
  } catch (error) {
    console.error('Error creating Peristiwa:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal menambahkan Peristiwa';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// Helper function to extract kode kecamatan from desa kodeDesa (first 6 digits)
function extractKodeKecamatan(kodeDesa: string): string {
  return kodeDesa.replace(/[^0-9]/g, '').slice(0, 6);
}

// Helper function to generate NIK
function generateNIK(kodeKecamatan: string, tanggalPeristiwa: string, jenisKelamin: string): string {
  const tanggal = new Date(tanggalPeristiwa);
  const tgl = tanggal.getDate();
  const bln = (tanggal.getMonth() + 1).toString().padStart(2, '0');
  const thn = tanggal.getFullYear().toString().slice(-2);
  
  // Female: tanggal + 40
  const tglLahir = jenisKelamin === 'PEREMPUAN' 
    ? (tgl + 40).toString().padStart(2, '0')
    : tgl.toString().padStart(2, '0');
  
  const kodeUnik = Math.floor(Math.random() * 9000) + 1000;
  
  return `${kodeKecamatan}${tglLahir}${bln}${thn}${kodeUnik}`;
}

// Helper function to generate KK number
function generateKKNumber(kodeKecamatan: string): string {
  const base = `${kodeKecamatan}010101`;
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${base}${random}0001`;
}
