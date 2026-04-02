import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - List RT by RW
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
    const rwId = searchParams.get('rwId');
    const dusunId = searchParams.get('dusunId');

    // Build where clause
    const where: Record<string, unknown> = {};
    
    // Filter by desa if not super admin
    if (desaAccess.desaId) {
      where.rw = { 
        dusun: { desaId: desaAccess.desaId } 
      };
    }
    
    if (rwId) {
      where.rwId = rwId;
    }
    
    if (dusunId && !rwId) {
      // Get all RT in dusun (through RW)
      where.rw = { 
        ...(where.rw as Record<string, unknown>),
        dusunId 
      };
    }

    const rtList = await db.rT.findMany({
      where,
      include: {
        rw: {
          include: {
            dusun: {
              select: { id: true, nama: true, desaId: true },
            },
          },
        },
      },
      orderBy: [
        { rw: { dusun: { nama: 'asc' } } }, 
        { rw: { nomor: 'asc' } }, 
        { nomor: 'asc' }
      ],
    });

    const result = rtList.map(rt => ({
      id: rt.id,
      nomor: rt.nomor,
      jumlahKK: rt.jumlahKK,
      jumlahPenduduk: rt.jumlahPenduduk,
      rwId: rt.rwId,
      rw: {
        id: rt.rw.id,
        nomor: rt.rw.nomor,
        dusun: rt.rw.dusun,
      },
      createdAt: rt.createdAt,
      updatedAt: rt.updatedAt,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('[RT GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

// POST - Create new RT
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

    const { rwId, nomor } = await request.json();

    if (!rwId) {
      return NextResponse.json(
        { success: false, error: 'RW wajib dipilih' },
        { status: 400 }
      );
    }

    if (!nomor || !nomor.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nomor RT wajib diisi' },
        { status: 400 }
      );
    }

    // Format nomor to 3 digits
    const formattedNomor = nomor.trim().padStart(3, '0');

    // Check if RW exists and verify desa access
    const rwWhere: Record<string, unknown> = { id: rwId };
    if (desaAccess.desaId) {
      rwWhere.dusun = { desaId: desaAccess.desaId };
    }

    const rw = await db.rW.findFirst({
      where: rwWhere,
      include: { 
        dusun: { 
          select: { nama: true, desaId: true } 
        } 
      },
    });

    if (!rw) {
      return NextResponse.json(
        { success: false, error: 'RW tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if RT already exists in this RW
    const existing = await db.rT.findUnique({
      where: {
        rwId_nomor: {
          rwId,
          nomor: formattedNomor,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'RT sudah ada di RW ini' },
        { status: 400 }
      );
    }

    const rt = await db.rT.create({
      data: {
        rwId,
        nomor: formattedNomor,
      },
      include: {
        rw: {
          include: {
            dusun: { select: { id: true, nama: true } },
          },
        },
      },
    });

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'CREATE',
        modul: 'WILAYAH',
        deskripsi: `Membuat RT ${rt.nomor} di RW ${rw.nomor} ${rw.dusun.nama}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: rt,
      message: 'RT berhasil ditambahkan',
    });
  } catch (error) {
    console.error('[RT POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan saat menyimpan' },
      { status: 500 }
    );
  }
}
