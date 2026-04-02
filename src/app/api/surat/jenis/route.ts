import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, requireSuperAdmin, requireAdminDesa } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { logActivity } from '@/lib/activity-logger';

// GET /api/surat/jenis - List all surat jenis for the user's desa
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
    const kategori = searchParams.get('kategori');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const desaId = searchParams.get('desaId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    // Filter by desa
    if (user.role === 'SUPER_ADMIN' && desaId) {
      where.desaId = desaId;
    } else if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    if (kategori) {
      where.kategori = kategori;
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { kode: { contains: search } },
        { deskripsi: { contains: search } },
      ];
    }

    const [data, total] = await Promise.all([
      db.suratJenis.findMany({
        where,
        include: {
          suratTemplate: {
            select: {
              id: true,
              nama: true,
            },
          },
          desa: {
            select: {
              id: true,
              namaDesa: true,
              slug: true,
            },
          },
          _count: {
            select: {
              surat: true,
            },
          },
        },
        orderBy: [
          { urutan: 'asc' },
          { nama: 'asc' },
        ],
        skip: offset,
        take: limit,
      }),
      db.suratJenis.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching surat jenis:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data jenis surat' },
      { status: 500 }
    );
  }
}

// POST /api/surat/jenis - Create surat jenis (ADMIN_DESA+)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminDesa();
    const body = await request.json();

    // Validate required fields
    if (!body.kode || !body.nama || !body.kategori) {
      return NextResponse.json(
        { success: false, error: 'Kode, nama, dan kategori wajib diisi' },
        { status: 400 }
      );
    }

    // Determine desaId: use provided desaId for SUPER_ADMIN, or user's desaId for ADMIN_DESA
    const targetDesaId = body.desaId || user.desaId;
    if (!targetDesaId) {
      return NextResponse.json(
        { success: false, error: 'Desa tidak ditemukan' },
        { status: 400 }
      );
    }

    // Validate desa access for non-SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN' && user.desaId && targetDesaId !== user.desaId) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak - Anda tidak memiliki akses ke desa ini' },
        { status: 403 }
      );
    }

    // Validate kategori
    const validKategori = [
      'KEPENDUDUKAN', 'PENGANTAR', 'KETERANGAN', 'PERNYATAAN',
      'TANAH_PROPERTI', 'KEUANGAN', 'LEMBAGA',
    ];
    if (!validKategori.includes(body.kategori)) {
      return NextResponse.json(
        { success: false, error: 'Kategori tidak valid' },
        { status: 400 }
      );
    }

    // Validate tingkatApproval
    const validTingkatApproval = ['LANGSUNG_PROSES', 'PERLU_APPROVAL'];
    const tingkatApproval = body.tingkatApproval || 'LANGSUNG_PROSES';
    if (!validTingkatApproval.includes(tingkatApproval)) {
      return NextResponse.json(
        { success: false, error: 'Tingkat approval tidak valid' },
        { status: 400 }
      );
    }

    // Validate desa exists
    const desa = await db.desa.findUnique({
      where: { id: targetDesaId },
      select: { id: true, namaDesa: true },
    });
    if (!desa) {
      return NextResponse.json(
        { success: false, error: 'Desa tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check kode uniqueness within desa
    const existingKode = await db.suratJenis.findFirst({
      where: {
        kode: body.kode,
        desaId: targetDesaId,
      },
    });
    if (existingKode) {
      return NextResponse.json(
        { success: false, error: 'Kode surat sudah digunakan di desa ini' },
        { status: 409 }
      );
    }

    // Get max urutan
    const maxUrutan = await db.suratJenis.aggregate({
      where: { desaId: targetDesaId },
      _max: { urutan: true },
    });
    const nextUrutan = (maxUrutan._max.urutan || 0) + 1;

    // Build kode with desa prefix if not already prefixed
    const fullKode = body.kode.includes('/') ? body.kode : `${targetDesaId}/${body.kode}`;

    const suratJenis = await db.suratJenis.create({
      data: {
        kode: fullKode,
        nama: body.nama,
        kategori: body.kategori,
        tingkatApproval,
        deskripsi: body.deskripsi || null,
        persyaratan: body.persyaratan
          ? (typeof body.persyaratan === 'string' ? body.persyaratan : JSON.stringify(body.persyaratan))
          : null,
        fieldTemplate: body.fieldTemplate
          ? (typeof body.fieldTemplate === 'string' ? body.fieldTemplate : JSON.stringify(body.fieldTemplate))
          : null,
        isActive: body.isActive ?? true,
        urutan: body.urutan ?? nextUrutan,
        desaId: targetDesaId,
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.username,
      aksi: 'CREATE',
      modul: 'SURAT',
      deskripsi: `Menambahkan jenis surat: ${body.nama} (${fullKode}) di desa ${desa.namaDesa}`,
      dataRef: { suratJenisId: suratJenis.id, desaId: targetDesaId },
    });

    return NextResponse.json(
      {
        success: true,
        data: suratJenis,
        message: 'Jenis surat berhasil ditambahkan',
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    console.error('Error creating surat jenis:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan jenis surat' },
      { status: 500 }
    );
  }
}
