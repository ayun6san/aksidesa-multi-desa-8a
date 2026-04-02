import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JenisKelamin, Agama, StatusPerkawinan, StatusPenduduk, StatusKTP, JenisDisabilitas, Kewarganegaraan } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - List all Penduduk with pagination and search
export async function GET(request: NextRequest) {
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
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const dusunId = searchParams.get('dusunId') || '';
    const rtId = searchParams.get('rtId') || '';
    const status = searchParams.get('status') || '';
    const jenisKelamin = searchParams.get('jenisKelamin') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    // Filter by desa directly (now using desaId)
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }
    
    if (search) {
      where.OR = [
        { nik: { contains: search } },
        { namaLengkap: { contains: search } },
      ];
    }
    
    // Filter by dusunId
    if (dusunId) {
      where.kk = { dusunId };
    }
    
    // Filter by rtId
    if (rtId) {
      where.kk = { 
        ...(where.kk as Record<string, unknown>),
        rtId 
      };
    }
    
    if (status) {
      where.status = status as StatusPenduduk;
    }
    
    if (jenisKelamin) {
      where.jenisKelamin = jenisKelamin as JenisKelamin;
    }

    // Get penduduk
    const [pendudukList, total] = await Promise.all([
      db.penduduk.findMany({
        where,
        include: {
          kk: {
            include: {
              anggota: {
                where: { hubunganKeluarga: { in: ['KEPALA_KELUARGA'] } },
                select: { namaLengkap: true }
              },
              rt: {
                include: {
                  rw: {
                    include: {
                      dusun: {
                        include: {
                          desa: {
                            select: { id: true, namaDesa: true }
                          }
                        }
                      }
                    }
                  }
                }
              },
              dusun: {
                include: {
                  desa: {
                    select: { id: true, namaDesa: true }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { namaLengkap: 'asc' }
        ],
        skip,
        take: limit,
      }),
      db.penduduk.count({ where }),
    ]);

    // Transform data - get alamat/wilayah from KK
    const transformedData = pendudukList.map(p => ({
      id: p.id,
      nik: p.nik,
      namaLengkap: p.namaLengkap,
      tempatLahir: p.tempatLahir,
      tanggalLahir: p.tanggalLahir?.toISOString() || null,
      jenisKelamin: p.jenisKelamin,
      golonganDarah: p.golonganDarah,
      agama: p.agama,
      suku: p.suku,
      statusPerkawinan: p.statusPerkawinan,
      aktaPerkawinan: p.aktaPerkawinan,
      tanggalPerkawinan: p.tanggalPerkawinan?.toISOString() || null,
      aktaPerceraian: p.aktaPerceraian,
      tanggalPerceraian: p.tanggalPerceraian?.toISOString() || null,
      pekerjaan: p.pekerjaan,
      pendidikan: p.pendidikan,
      penghasilan: p.penghasilan,
      kewarganegaraan: p.kewarganegaraan,
      negaraAsal: p.negaraAsal,
      noPaspor: p.noPaspor,
      noKitasKitap: p.noKitasKitap,
      tanggalMasuk: p.tanggalMasuk?.toISOString() || null,
      noAktaKelahiran: p.noAktaKelahiran,
      statusKTP: p.statusKTP,
      noBPJSKesehatan: p.noBPJSKesehatan,
      noBPJSTenagakerja: p.noBPJSTenagakerja,
      npwp: p.npwp,
      namaAyah: p.namaAyah,
      nikAyah: p.nikAyah,
      namaIbu: p.namaIbu,
      nikIbu: p.nikIbu,
      anakKe: p.anakKe,
      jumlahSaudara: p.jumlahSaudara,
      // Alamat dan wilayah dari KK
      alamat: p.kk?.alamat || '-',
      rt: p.kk?.rt?.nomor || '-',
      rw: p.kk?.rt?.rw?.nomor || '-',
      dusun: p.kk?.dusun?.nama || p.kk?.rt?.rw?.dusun?.nama || '-',
      desa: p.kk?.dusun?.desa?.namaDesa || p.kk?.rt?.rw?.dusun?.desa?.namaDesa || '-',
      kkId: p.kkId,
      nomorKK: p.kk?.nomorKK || '-',
      kepalaKeluarga: p.kk?.anggota?.[0]?.namaLengkap || '-',
      hubunganKeluarga: p.hubunganKeluarga,
      urutanDalamKK: p.urutanDalamKK,
      email: p.email,
      noHP: p.noHP,
      jenisDisabilitas: p.jenisDisabilitas,
      keteranganDisabilitas: p.keteranganDisabilitas,
      penyakitKronis: p.penyakitKronis,
      status: p.status,
      statusAnak: p.statusAnak,
      isActive: p.isActive,
      foto: p.foto,
      fotoKTP: p.fotoKTP,
      createdAt: p.createdAt,
    }));

    // Get statistics (filtered by desa only, not by search/filter)
    const statsWhere: Record<string, unknown> = {};
    if (desaAccess.desaId) {
      statsWhere.desaId = desaAccess.desaId;
    }

    const [totalPenduduk, lakiLaki, perempuan, pendudukTetap, pendudukPendatang, pendudukBulanIni] = await Promise.all([
      db.penduduk.count({ where: statsWhere }),
      db.penduduk.count({ where: { ...statsWhere, jenisKelamin: 'LAKI_LAKI' } }),
      db.penduduk.count({ where: { ...statsWhere, jenisKelamin: 'PEREMPUAN' } }),
      db.penduduk.count({ where: { ...statsWhere, status: 'TETAP' } }),
      db.penduduk.count({ where: { ...statsWhere, status: 'PENDATANG' } }),
      db.penduduk.count({
        where: {
          ...statsWhere,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: transformedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: {
        totalPenduduk,
        lakiLaki,
        perempuan,
        pendudukTetap,
        pendudukPendatang,
        pendudukBulanIni,
      },
    });
  } catch (error) {
    console.error('Error fetching Penduduk:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Penduduk' },
      { status: 500 }
    );
  }
}

// POST - Create new Penduduk
export async function POST(request: NextRequest) {
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
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validasi field wajib
    if (!body.namaLengkap || !body.jenisKelamin || !body.tanggalLahir) {
      return NextResponse.json(
        { success: false, error: 'Nama lengkap, jenis kelamin, dan tanggal lahir wajib diisi' },
        { status: 400 }
      );
    }

    // Validasi NIK jika diisi (opsional — penduduk baru mungkin belum punya NIK)
    if (body.nik) {
      if (!/^\d{16}$/.test(body.nik)) {
        return NextResponse.json(
          { success: false, error: 'NIK harus 16 digit angka' },
          { status: 400 }
        );
      }

      // Cek NIK sudah ada
      const existingPenduduk = await db.penduduk.findUnique({
        where: { nik: body.nik },
      });

      if (existingPenduduk) {
        return NextResponse.json(
          { success: false, error: 'NIK sudah terdaftar' },
          { status: 400 }
        );
      }
    }

    // If kkId is provided, verify it belongs to user's desa and get desaId
    let pendudukDesaId = desaAccess.desaId;
    if (body.kkId && desaAccess.desaId) {
      const kk = await db.kK.findFirst({
        where: {
          id: body.kkId,
          desaId: desaAccess.desaId,
        },
      });

      if (!kk) {
        return NextResponse.json(
          { success: false, error: 'KK tidak ditemukan di desa Anda' },
          { status: 404 }
        );
      }
      pendudukDesaId = kk.desaId;
    }

    if (!pendudukDesaId) {
      return NextResponse.json({ error: 'desaId atau kkId wajib diisi untuk Super Admin' }, { status: 400 });
    }

    // Auto-set ayahId/ibuId based on hubunganKeluarga
    const CHILD_HUBUNGAN = ['ANAK', 'ANAK_TIRI', 'ANAK_ANGKAT'];
    const hubunganKeluarga = body.hubunganKeluarga || null;
    let autoAyahId: string | null = null;
    let autoIbuId: string | null = null;

    if (hubunganKeluarga && CHILD_HUBUNGAN.includes(hubunganKeluarga) && body.kkId) {
      // Find SUAMI, ISTRI, and KEPALA_KELUARGA in the same KK
      // KEPALA_KELUARGA is fallback: if jenisKelamin=LAKI_LAKI → ayah, if PEREMPUAN → ibu
      const ortu = await db.penduduk.findMany({
        where: {
          kkId: body.kkId,
          hubunganKeluarga: { in: ['SUAMI', 'ISTRI', 'KEPALA_KELUARGA'] },
          isActive: true,
          status: { not: 'MENINGGAL' },
        },
        select: { id: true, hubunganKeluarga: true, jenisKelamin: true },
      });
      const suami = ortu.find(p => p.hubunganKeluarga === 'SUAMI');
      const istri = ortu.find(p => p.hubunganKeluarga === 'ISTRI');
      const kepala = ortu.find(p => p.hubunganKeluarga === 'KEPALA_KELUARGA');

      // Ayah: SUAMI dulu, fallback KEPALA_KELUARGA laki-laki
      autoAyahId = suami?.id || (kepala?.jenisKelamin === 'LAKI_LAKI' ? kepala.id : null);
      // Ibu: ISTRI dulu, fallback KEPALA_KELUARGA perempuan
      autoIbuId = istri?.id || (kepala?.jenisKelamin === 'PEREMPUAN' ? kepala.id : null);
    }

    // Buat penduduk baru
    const penduduk = await db.penduduk.create({
      data: {
        desaId: pendudukDesaId,
        nik: body.nik,
        namaLengkap: body.namaLengkap,
        tempatLahir: body.tempatLahir || null,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        jenisKelamin: body.jenisKelamin as JenisKelamin,
        golonganDarah: body.golonganDarah || null,
        agama: (body.agama || 'ISLAM') as Agama,
        suku: body.suku || null,
        statusPerkawinan: (body.statusPerkawinan || 'BELUM_KAWIN') as StatusPerkawinan,
        aktaPerkawinan: body.aktaPerkawinan || null,
        tanggalPerkawinan: body.tanggalPerkawinan ? new Date(body.tanggalPerkawinan) : null,
        aktaPerceraian: body.aktaPerceraian || null,
        tanggalPerceraian: body.tanggalPerceraian ? new Date(body.tanggalPerceraian) : null,
        pekerjaan: body.pekerjaan || null,
        pendidikan: body.pendidikan || null,
        penghasilan: body.penghasilan || null,
        kewarganegaraan: (body.kewarganegaraan || 'WNI') as Kewarganegaraan,
        negaraAsal: body.negaraAsal || null,
        noPaspor: body.noPaspor || null,
        noKitasKitap: body.noKitasKitap || null,
        tanggalMasuk: body.tanggalMasuk ? new Date(body.tanggalMasuk) : null,
        noAktaKelahiran: body.noAktaKelahiran || null,
        statusKTP: (body.statusKTP || 'BELUM_BUAT') as StatusKTP,
        noBPJSKesehatan: body.noBPJSKesehatan || null,
        noBPJSTenagakerja: body.noBPJSTenagakerja || null,
        npwp: body.npwp || null,
        namaAyah: body.namaAyah || null,
        nikAyah: body.nikAyah || null,
        namaIbu: body.namaIbu || null,
        nikIbu: body.nikIbu || null,
        anakKe: body.anakKe ? parseInt(body.anakKe) : null,
        jumlahSaudara: body.jumlahSaudara ? parseInt(body.jumlahSaudara) : null,
        kkId: body.kkId || null,
        hubunganKeluarga,
        urutanDalamKK: body.urutanDalamKK || 1,
        email: body.email || null,
        noHP: body.noHP || null,
        jenisDisabilitas: (body.jenisDisabilitas || 'TIDAK_ADA') as JenisDisabilitas,
        keteranganDisabilitas: body.keteranganDisabilitas || null,
        penyakitKronis: body.penyakitKronis || null,
        status: (body.status || 'TETAP') as StatusPenduduk,
        foto: body.foto || null,
        fotoKTP: body.fotoKTP || null,
        ayahId: autoAyahId,
        ibuId: autoIbuId,
      },
      include: {
        kk: {
          include: {
            rt: {
              include: {
                rw: {
                  include: {
                    dusun: {
                      include: {
                        desa: {
                          select: { id: true, namaDesa: true }
                        }
                      }
                    }
                  }
                }
              }
            },
            dusun: {
              include: {
                desa: {
                  select: { id: true, namaDesa: true }
                }
              }
            }
          }
        }
      }
    });

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'CREATE',
        modul: 'KEPENDUDUKAN',
        deskripsi: `Menambahkan penduduk baru: ${body.namaLengkap}${body.nik ? ` (${body.nik})` : ' (belum punya NIK)'}`,
        dataRef: JSON.stringify({ pendudukId: penduduk.id, nik: body.nik }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...penduduk,
        tanggalLahir: penduduk.tanggalLahir?.toISOString() || null,
        tanggalPerkawinan: penduduk.tanggalPerkawinan?.toISOString() || null,
        tanggalPerceraian: penduduk.tanggalPerceraian?.toISOString() || null,
        tanggalMasuk: penduduk.tanggalMasuk?.toISOString() || null,
      },
      message: 'Penduduk berhasil ditambahkan',
    });
  } catch (error) {
    console.error('Error creating Penduduk:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan Penduduk' },
      { status: 500 }
    );
  }
}
