import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - List RW by Dusun
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

    const { searchParams } = new URL(request.url);
    const dusunId = searchParams.get('dusunId');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    // Filter by desa if not super admin
    if (desaAccess.desaId) {
      where.dusun = { desaId: desaAccess.desaId };
    }
    
    if (dusunId) {
      where.dusunId = dusunId;
    }

    const rwList = await db.rW.findMany({
      where,
      include: {
        dusun: {
          select: { id: true, nama: true, desaId: true },
        },
        _count: {
          select: { rt: true },
        },
      },
      orderBy: [{ dusun: { nama: 'asc' } }, { nomor: 'asc' }],
    });

    const result = rwList.map(rw => ({
      id: rw.id,
      nomor: rw.nomor,
      jumlahKK: rw.jumlahKK,
      jumlahPenduduk: rw.jumlahPenduduk,
      totalRT: rw._count.rt,
      dusunId: rw.dusunId,
      dusun: rw.dusun,
      createdAt: rw.createdAt,
      updatedAt: rw.updatedAt,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[RW GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

// POST - Create new RW
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

    const { dusunId, nomor } = await request.json();

    if (!dusunId) {
      return NextResponse.json(
        { success: false, error: 'Dusun wajib dipilih' },
        { status: 400 }
      );
    }

    if (!nomor || !nomor.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nomor RW wajib diisi' },
        { status: 400 }
      );
    }

    // Verify dusun belongs to user's desa (if not super admin)
    const dusunWhere: Record<string, unknown> = { id: dusunId };
    if (desaAccess.desaId) {
      dusunWhere.desaId = desaAccess.desaId;
    }

    const dusun = await db.dusun.findFirst({
      where: dusunWhere,
    });

    if (!dusun) {
      return NextResponse.json(
        { success: false, error: 'Dusun tidak ditemukan' },
        { status: 404 }
      );
    }

    // Format nomor to 3 digits
    const formattedNomor = nomor.trim().padStart(3, '0');

    // Check if RW already exists in this dusun
    const existing = await db.rW.findUnique({
      where: {
        dusunId_nomor: {
          dusunId,
          nomor: formattedNomor,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'RW sudah ada di dusun ini' },
        { status: 400 }
      );
    }

    const rw = await db.rW.create({
      data: {
        dusunId,
        nomor: formattedNomor,
      },
      include: {
        dusun: { select: { id: true, nama: true } },
      },
    });

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'CREATE',
        modul: 'WILAYAH',
        deskripsi: `Membuat RW ${rw.nomor} di ${dusun.nama}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: rw,
      message: 'RW berhasil ditambahkan',
    });
  } catch (error) {
    console.error('[RW POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menyimpan' },
      { status: 500 }
    );
  }
}
