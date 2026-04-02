import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET /api/surat - List all surat with filters (jenis, status, tanggal, search)
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
    const jenisSuratId = searchParams.get('jenisSuratId');
    const status = searchParams.get('status');
    const kategori = searchParams.get('kategori');
    const search = searchParams.get('search');
    const desaId = searchParams.get('desaId');
    const tanggalMulai = searchParams.get('tanggalMulai');
    const tanggalSelesai = searchParams.get('tanggalSelesai');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Filter by desa
    if (user.role === 'SUPER_ADMIN' && desaId) {
      where.desaId = desaId;
    } else if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    if (jenisSuratId) {
      where.jenisSuratId = jenisSuratId;
    }

    if (status) {
      where.status = status;
    }

    if (kategori) {
      where.jenisSurat = {
        kategori: kategori,
      };
    }

    if (search) {
      where.OR = [
        { pemohonNama: { contains: search } },
        { pemohonNIK: { contains: search } },
        { nomorSurat: { contains: search } },
        { nomorRegisterFmt: { contains: search } },
        { isiSurat: { contains: search } },
      ];
    }

    if (tanggalMulai || tanggalSelesai) {
      const tanggalFilter: Record<string, unknown> = {};
      if (tanggalMulai) {
        tanggalFilter.gte = new Date(tanggalMulai);
      }
      if (tanggalSelesai) {
        tanggalFilter.lte = new Date(tanggalSelesai);
      }
      where.createdAt = tanggalFilter;
    }

    // Warga only sees their own surat
    if (user.role === 'WARGA') {
      // Find penduduk linked to this user
      const penduduk = await db.penduduk.findFirst({
        where: {
          desaId: desaAccess.desaId || undefined,
          OR: [
            { nik: user.email }, // If NIK is stored as email
            { noHP: user.email },
          ],
        },
        select: { id: true },
      });
      if (penduduk) {
        where.pemohonId = penduduk.id;
      }
    }

    const [data, total] = await Promise.all([
      db.surat.findMany({
        where,
        include: {
          desa: {
            select: {
              id: true,
              namaDesa: true,
              slug: true,
            },
          },
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
          operator: {
            select: {
              id: true,
              namaLengkap: true,
              username: true,
            },
          },
          approver: {
            select: {
              id: true,
              namaLengkap: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      db.surat.count({ where }),
    ]);

    // Get status counts for the filtered desa
    const statusCounts = await db.surat.groupBy({
      by: ['status'],
      where: {
        ...(desaAccess.desaId ? { desaId: desaAccess.desaId } : {}),
      },
      _count: { id: true },
    });

    const statusCountMap: Record<string, number> = {};
    for (const sc of statusCounts) {
      statusCountMap[sc.status] = sc._count.id;
    }

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statusCounts: statusCountMap,
    });
  } catch (error) {
    console.error('Error fetching surat:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data surat' },
      { status: 500 }
    );
  }
}
