import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET /api/surat/register - List surat with register data for a specific year
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const tahunParam = searchParams.get('tahun');
    const tahun = tahunParam ? parseInt(tahunParam, 10) : new Date().getFullYear();
    const search = searchParams.get('search') || '';
    const kategori = searchParams.get('kategori') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Build desa filter
    const desaId = desaAccess.desaId;

    // Build where clause
    const where: Record<string, unknown> = {
      desaId,
    };

    // Filter by year - based on createdAt
    const yearStart = new Date(tahun, 0, 1); // Jan 1
    const yearEnd = new Date(tahun, 11, 31, 23, 59, 59, 999); // Dec 31
    where.createdAt = {
      gte: yearStart,
      lte: yearEnd,
    };

    // Search filter: nomorRegister, nomorSurat, pemohonNama, jenis surat nama
    if (search) {
      const searchNum = parseInt(search, 10);
      const searchConditions: Record<string, unknown>[] = [
        { pemohonNama: { contains: search } },
        { pemohonNIK: { contains: search } },
        { nomorSurat: { contains: search } },
        { nomorRegisterFmt: { contains: search } },
      ];

      // Search by nomorRegister as integer if search is a number
      if (!isNaN(searchNum)) {
        searchConditions.push({ nomorRegister: searchNum });
      }

      // Search by jenis surat nama
      searchConditions.push({
        jenisSurat: {
          nama: { contains: search },
        },
      });

      where.OR = searchConditions;
    }

    // Kategori filter
    if (kategori) {
      where.jenisSurat = {
        ...(typeof where.jenisSurat === 'object' ? where.jenisSurat : {}),
        kategori: kategori,
      };
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // Fetch surat data with relations
    const [data, total] = await Promise.all([
      db.surat.findMany({
        where,
        include: {
          jenisSurat: {
            select: {
              id: true,
              kode: true,
              nama: true,
              kategori: true,
            },
          },
          pemohon: {
            select: {
              id: true,
              nik: true,
              namaLengkap: true,
            },
          },
        },
        orderBy: { nomorRegister: 'asc' },
        skip: offset,
        take: limit,
      }),
      db.surat.count({ where }),
    ]);

    // Get NomorRegister info for the desa and year
    const nomorRegisterInfo = await db.nomorRegister.findUnique({
      where: {
        desaId_tahun: {
          desaId: desaId!,
          tahun,
        },
      },
      select: {
        nomorTerakhir: true,
      },
    });

    // Get status counts for the year
    const statusCounts = await db.surat.groupBy({
      by: ['status'],
      where: {
        desaId,
        createdAt: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
      _count: { id: true },
    });

    const statusCountMap: Record<string, number> = {};
    for (const sc of statusCounts) {
      statusCountMap[sc.status] = sc._count.id;
    }

    // Get desa info for print header
    const desaInfo = await db.desa.findUnique({
      where: { id: desaId },
      select: {
        namaDesa: true,
        kecamatan: true,
        kabupaten: true,
        provinsi: true,
      },
    });

    // Get surat konfigurasi for register format
    const suratKonfigurasi = await db.suratKonfigurasi.findUnique({
      where: { desaId },
      select: {
        formatNomorRegister: true,
        digitPaddingReg: true,
      },
    });

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        tahun,
        totalSurat: total,
        nomorRegisterTerakhir: nomorRegisterInfo?.nomorTerakhir || 0,
      },
      statusCounts: statusCountMap,
      desaInfo,
      konfigurasi: suratKonfigurasi || null,
    });
  } catch (error) {
    console.error('Error fetching register surat:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data register surat' },
      { status: 500 }
    );
  }
}
