import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - List all Dusun with RW and RT counts
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

    // Build where clause
    const where: Record<string, unknown> = {};
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    const dusunList = await db.dusun.findMany({
      where,
      include: {
        desa: {
          select: {
            id: true,
            namaDesa: true,
            slug: true,
          },
        },
        _count: {
          select: { rw: true },
        },
        rw: {
          include: {
            _count: {
              select: { rt: true },
            },
          },
        },
      },
      orderBy: { nama: 'asc' },
    });

    // Calculate total RW, RT, and add counts
    const result = dusunList.map(dusun => {
      const totalRW = dusun._count.rw;
      const totalRT = dusun.rw.reduce((sum, rw) => sum + rw._count.rt, 0);
      
      return {
        id: dusun.id,
        nama: dusun.nama,
        kode: dusun.kode,
        desaId: dusun.desaId,
        desa: dusun.desa,
        jumlahKK: dusun.jumlahKK,
        jumlahPenduduk: dusun.jumlahPenduduk,
        totalRW,
        totalRT,
        createdAt: dusun.createdAt,
        updatedAt: dusun.updatedAt,
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[Dusun GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

// POST - Create new Dusun
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

    const { nama, desaId: targetDesaId } = await request.json();

    // Determine which desa to create dusun for
    const desaId = user.role === 'SUPER_ADMIN' && targetDesaId ? targetDesaId : desaAccess.desaId;

    if (!nama || !nama.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama dusun wajib diisi' },
        { status: 400 }
      );
    }

    // Check if name already exists in this desa
    const existing = await db.dusun.findFirst({
      where: { 
        nama: nama.trim(),
        desaId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Nama dusun sudah ada di desa ini' },
        { status: 400 }
      );
    }

    // Generate auto kode dusun (3 digit: 001, 002, ...)
    const lastDusun = await db.dusun.findFirst({
      where: { 
        kode: { not: null },
        desaId,
      },
      orderBy: { kode: 'desc' },
      select: { kode: true },
    });

    let nextKode = '001';
    if (lastDusun?.kode) {
      const lastNum = parseInt(lastDusun.kode, 10);
      nextKode = String(lastNum + 1).padStart(3, '0');
    }

    const dusun = await db.dusun.create({
      data: {
        nama: nama.trim(),
        kode: nextKode,
        desaId,
      },
    });

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'CREATE',
        modul: 'WILAYAH',
        deskripsi: `Membuat dusun baru: ${dusun.nama}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: dusun,
      message: 'Dusun berhasil ditambahkan',
    });
  } catch (error) {
    console.error('[Dusun POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menyimpan' },
      { status: 500 }
    );
  }
}
