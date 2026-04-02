import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JenisKelamin } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - List all Pendatang with pagination
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
    const status = searchParams.get('status') || '';
    const rtId = searchParams.get('rtId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    
    // Filter by desa through dusun relation
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }
    
    if (search) {
      where.OR = [
        { nik: { contains: search } },
        { namaLengkap: { contains: search } },
        { alamatAsal: { contains: search } },
      ];
    }
    
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (rtId) {
      where.rtId = rtId;
    }

    // Get pendatang
    const [pendatangList, total] = await Promise.all([
      db.pendatang.findMany({
        where,
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
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.pendatang.count({ where }),
    ]);

    // Transform data
    const transformedData = pendatangList.map(p => ({
      id: p.id,
      nik: p.nik,
      namaLengkap: p.namaLengkap,
      tempatLahir: p.tempatLahir,
      tanggalLahir: p.tanggalLahir?.toISOString() || null,
      jenisKelamin: p.jenisKelamin,
      pekerjaan: p.pekerjaan,
      alamatAsal: p.alamatAsal,
      tujuanKedatangan: p.tujuanKedatangan,
      noTelp: p.noTelp,
      alamat: p.alamat,
      rt: p.rt?.nomor || '-',
      rw: p.rt?.rw?.nomor || '-',
      dusun: p.dusun?.nama || p.rt?.rw?.dusun?.nama || '-',
      desa: p.dusun?.desa?.namaDesa || p.rt?.rw?.dusun?.desa?.namaDesa || '-',
      rtId: p.rtId,
      dusunId: p.dusunId,
      tanggalDatang: p.tanggalDatang?.toISOString() || null,
      tanggalPulang: p.tanggalPulang?.toISOString() || null,
      lamaTinggal: p.lamaTinggal,
      isActive: p.isActive,
      keterangan: p.keterangan,
      foto: p.foto,
      createdAt: p.createdAt,
    }));

    // Get statistics (filtered by desa only, not by search/filter)
    const statsWhere: Record<string, unknown> = {};
    if (desaAccess.desaId) {
      statsWhere.desaId = desaAccess.desaId;
    }

    const [totalPendatang, lakiLaki, perempuan, pendatangAktif, pendatangPulang, pendatangBulanIni] = await Promise.all([
      db.pendatang.count({ where: statsWhere }),
      db.pendatang.count({ where: { ...statsWhere, jenisKelamin: 'LAKI_LAKI' } }),
      db.pendatang.count({ where: { ...statsWhere, jenisKelamin: 'PEREMPUAN' } }),
      db.pendatang.count({ where: { ...statsWhere, isActive: true } }),
      db.pendatang.count({ where: { ...statsWhere, isActive: false } }),
      db.pendatang.count({
        where: {
          ...statsWhere,
          tanggalDatang: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
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
        totalPendatang,
        lakiLaki,
        perempuan,
        pendatangAktif,
        pendatangPulang,
        pendatangBulanIni,
      },
    });
  } catch (error) {
    console.error('Error fetching Pendatang:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Pendatang' },
      { status: 500 }
    );
  }
}

// POST - Create new Pendatang
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

    // Non-super admin must have a desa
    if (!desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak terikat ke desa manapun' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      nik,
      namaLengkap,
      tempatLahir,
      tanggalLahir,
      jenisKelamin,
      pekerjaan,
      alamatAsal,
      tujuanKedatangan,
      noTelp,
      alamat,
      rtId,
      dusunId,
      tanggalDatang,
      tanggalPulang,
      lamaTinggal,
      keterangan,
      foto,
    } = body;

    // Validasi field wajib
    if (!namaLengkap || !alamatAsal || !tujuanKedatangan || !jenisKelamin) {
      return NextResponse.json(
        { success: false, error: 'Nama, alamat asal, tujuan kedatangan, dan jenis kelamin wajib diisi' },
        { status: 400 }
      );
    }

    // Validasi format NIK jika diisi
    if (nik && !/^\d{16}$/.test(nik)) {
      return NextResponse.json(
        { success: false, error: 'NIK harus 16 digit angka' },
        { status: 400 }
      );
    }

    // Determine which desa to create pendatang for
    let finalDusunId = dusunId || null;
    let pendatangDesaId = desaAccess.desaId;
    
    // Verify dusun belongs to user's desa and get desaId
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
      pendatangDesaId = dusun.desaId;
    }

    // Verify RT belongs to user's desa if provided
    if (rtId && desaAccess.desaId) {
      const rt = await db.rT.findFirst({
        where: {
          id: rtId,
          rw: {
            dusun: { desaId: desaAccess.desaId }
          }
        },
        include: {
          rw: {
            select: { dusunId: true }
          }
        }
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

    // Buat pendatang baru
    const pendatang = await db.pendatang.create({
      data: {
        desaId: pendatangDesaId,
        nik: nik || null,
        namaLengkap,
        tempatLahir: tempatLahir || null,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
        jenisKelamin: jenisKelamin as JenisKelamin,
        pekerjaan: pekerjaan || null,
        alamatAsal,
        tujuanKedatangan,
        noTelp: noTelp || null,
        alamat: alamat || null,
        rtId: rtId || null,
        dusunId: finalDusunId,
        tanggalDatang: tanggalDatang ? new Date(tanggalDatang) : new Date(),
        tanggalPulang: tanggalPulang ? new Date(tanggalPulang) : null,
        lamaTinggal: lamaTinggal || null,
        keterangan: keterangan || null,
        foto: foto || null,
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

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'CREATE',
        modul: 'KEPENDUDUKAN',
        deskripsi: `Menambahkan pendatang baru: ${namaLengkap}`,
        dataRef: JSON.stringify({ pendatangId: pendatang.id }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...pendatang,
        tanggalLahir: pendatang.tanggalLahir?.toISOString() || null,
        tanggalDatang: pendatang.tanggalDatang?.toISOString() || null,
        tanggalPulang: pendatang.tanggalPulang?.toISOString() || null,
      },
      message: 'Pendatang berhasil ditambahkan',
    });
  } catch (error) {
    console.error('Error creating Pendatang:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan Pendatang' },
      { status: 500 }
    );
  }
}
