import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JenisTempatTinggal } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - List all KK with pagination, search, and filter
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const dusunId = searchParams.get('dusunId') || '';
    const rtId = searchParams.get('rtId') || '';
    const status = searchParams.get('status') || '';
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    // Filter by desa directly (now using desaId)
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }
    
    if (search) {
      where.OR = [
        { nomorKK: { not: null, contains: search } },
        {
          anggota: {
            some: {
              hubunganKeluarga: { in: ['KEPALA_KELUARGA'] },
              namaLengkap: { contains: search }
            }
          }
        }
      ];
    }

    // Filter by Dusun
    if (dusunId) {
      where.dusunId = dusunId;
    }

    // Filter by RT
    if (rtId) {
      where.rtId = rtId;
    }

    // Filter by status
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Get KK with anggota count
    const [kkList, total] = await Promise.all([
      db.kK.findMany({
        where,
        include: {
          anggota: {
            where: { hubunganKeluarga: { in: ['KEPALA_KELUARGA'] } },
            select: {
              id: true,
              namaLengkap: true,
              tanggalLahir: true,
            }
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
          },
          _count: {
            select: { anggota: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.kK.count({ where }),
    ]);

    // Transform data
    const transformedData = kkList.map(kk => ({
      id: kk.id,
      nomorKK: kk.nomorKK,
      kepalaKeluarga: kk.anggota[0]?.namaLengkap || '-',
      kepalaKeluargaTanggalLahir: kk.anggota[0]?.tanggalLahir?.toISOString() || null,
      alamat: kk.alamat,
      rt: kk.rt?.nomor || '-',
      rw: kk.rt?.rw?.nomor || '-',
      dusun: kk.dusun?.nama || kk.rt?.rw?.dusun?.nama || '-',
      desa: kk.dusun?.desa?.namaDesa || kk.rt?.rw?.dusun?.desa?.namaDesa || '-',
      rtId: kk.rtId,
      dusunId: kk.dusunId,
      tanggalTerbit: kk.tanggalTerbit,
      jenisTempatTinggal: kk.jenisTempatTinggal,
      latitude: kk.latitude,
      longitude: kk.longitude,
      scanKK: kk.scanKK,
      fotoRumah: kk.fotoRumah,
      jumlahAnggota: kk._count.anggota,
      isActive: kk.isActive,
      createdAt: kk.createdAt,
    }));

    // Get statistics (filtered by desa)
    const statsWhere: Record<string, unknown> = {};
    if (desaAccess.desaId) {
      statsWhere.desaId = desaAccess.desaId;
    }

    const [totalKK, totalAnggota, kkAktif, kkNonaktif, kkBulanIni] = await Promise.all([
      db.kK.count({ where: statsWhere }),
      db.penduduk.count({ 
        where: statsWhere
      }),
      db.kK.count({ where: { ...statsWhere, isActive: true } }),
      db.kK.count({ where: { ...statsWhere, isActive: false } }),
      db.kK.count({
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
        totalKK,
        totalAnggota,
        kkAktif,
        kkNonaktif,
        kkBulanIni,
        rataRataAnggota: totalKK > 0 ? (totalAnggota / totalKK).toFixed(1) : '0',
      },
    });
  } catch (error) {
    console.error('Error fetching KK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data KK' },
      { status: 500 }
    );
  }
}

// POST - Create new KK
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
    const { 
      nomorKK, 
      tanggalTerbit,
      jenisTempatTinggal,
      alamat, 
      rtId, 
      dusunId,
      latitude,
      longitude,
      scanKK,
      fotoRumah
    } = body;

    // Validasi Nomor KK jika diisi (opsional — KK baru mungkin belum punya nomor)
    if (nomorKK) {
      if (!/^\d{16}$/.test(nomorKK)) {
        return NextResponse.json(
          { success: false, error: 'Nomor KK harus 16 digit angka' },
          { status: 400 }
        );
      }

      // Cek nomor KK sudah ada
      const existingKK = await db.kK.findUnique({
        where: { nomorKK },
      });

      if (existingKK) {
        return NextResponse.json(
          { success: false, error: 'Nomor KK sudah terdaftar' },
          { status: 400 }
        );
      }
    }

    // Validasi alamat wajib
    if (!alamat || !alamat.trim()) {
      return NextResponse.json(
        { success: false, error: 'Alamat wajib diisi' },
        { status: 400 }
      );
    }

    // Validasi jenis tempat tinggal
    const jenisTT = jenisTempatTinggal || 'MILIK_SENDIRI';
    if (!Object.values(JenisTempatTinggal).includes(jenisTT as JenisTempatTinggal)) {
      return NextResponse.json(
        { success: false, error: 'Jenis tempat tinggal tidak valid' },
        { status: 400 }
      );
    }

    // Verify dusun belongs to user's desa (if provided and not super admin)
    let finalDusunId = dusunId || null;
    if (finalDusunId && desaAccess.desaId) {
      const dusun = await db.dusun.findFirst({
        where: {
          id: finalDusunId,
          desaId: desaAccess.desaId,
        },
      });

      if (!dusun) {
        return NextResponse.json(
          { success: false, error: 'Dusun tidak ditemukan di desa Anda' },
          { status: 404 }
        );
      }
    }

    // Verify RT belongs to user's desa (if provided)
    if (rtId && desaAccess.desaId) {
      const rt = await db.rT.findFirst({
        where: {
          id: rtId,
          rw: {
            dusun: { desaId: desaAccess.desaId }
          }
        },
        include: { rw: true },
      });

      if (!rt) {
        return NextResponse.json(
          { success: false, error: 'RT tidak ditemukan di desa Anda' },
          { status: 404 }
        );
      }

      // Set dusunId from RT if not provided
      if (!finalDusunId) {
        finalDusunId = rt.rw.dusunId;
      }
    }

    // Determine desaId for the KK
    let kkDesaId = desaAccess.desaId;
    if (finalDusunId) {
      const dusun = await db.dusun.findUnique({
        where: { id: finalDusunId },
        select: { desaId: true },
      });
      if (dusun) {
        kkDesaId = dusun.desaId;
      }
    }

    if (!kkDesaId) {
      return NextResponse.json(
        { success: false, error: 'Tidak dapat menentukan desa untuk KK' },
        { status: 400 }
      );
    }

    // Buat KK baru
    const kk = await db.kK.create({
      data: {
        nomorKK,
        tanggalTerbit: tanggalTerbit ? new Date(tanggalTerbit) : null,
        jenisTempatTinggal: jenisTT as JenisTempatTinggal,
        alamat: alamat || '',
        rtId: rtId || null,
        dusunId: finalDusunId,
        desaId: kkDesaId,
        latitude: latitude || null,
        longitude: longitude || null,
        scanKK: scanKK || null,
        fotoRumah: fotoRumah || null,
      },
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
        },
      }
    });

    // Catat log aktivitas dengan detail
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'CREATE',
        modul: 'KK',
        deskripsi: `Menambahkan KK baru${nomorKK ? `: ${nomorKK}` : ' (belum punya Nomor KK)'}`,
        dataRef: JSON.stringify({ 
          kkId: kk.id, 
          nomorKK,
          alamat,
          rtId,
          dusunId: finalDusunId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: kk,
      message: 'KK berhasil ditambahkan',
    });
  } catch (error) {
    console.error('Error creating KK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan KK' },
      { status: 500 }
    );
  }
}
