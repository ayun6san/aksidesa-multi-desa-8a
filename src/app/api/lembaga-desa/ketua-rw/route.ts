import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - Fetch all Ketua RW members
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
    const isActive = searchParams.get('isActive');

    const where: Record<string, unknown> = {};

    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const ketuaRW = await db.ketuaRW.findMany({
      where,
      orderBy: [
        { urutan: 'asc' },
        { jabatan: 'asc' },
        { namaLengkap: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: ketuaRW
    });
  } catch (error) {
    console.error('Error fetching Ketua RW:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Ketua RW' },
      { status: 500 }
    );
  }
}

// POST - Create new Ketua RW member
export async function POST(request: NextRequest) {
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

    if (!desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak terikat ke desa manapun' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const desaId = user.role === 'SUPER_ADMIN' && body.desaId ? body.desaId : desaAccess.desaId;

    const maxUrutan = await db.ketuaRW.aggregate({
      where: { desaId },
      _max: { urutan: true }
    });
    const nextUrutan = (maxUrutan._max.urutan || 0) + 1;

    const ketuaRW = await db.ketuaRW.create({
      data: {
        desaId,
        namaLengkap: body.namaLengkap,
        tempatLahir: body.tempatLahir || null,
        tanggalLahir: body.tanggalLahir ? new Date(body.tanggalLahir) : null,
        jenisKelamin: body.jenisKelamin,
        pendidikanTerakhir: body.pendidikanTerakhir || null,
        pekerjaan: body.pekerjaan || null,
        jabatan: body.jabatan,
        periodeMulai: body.periodeMulai ? new Date(body.periodeMulai) : null,
        periodeSelesai: body.periodeSelesai ? new Date(body.periodeSelesai) : null,
        skPengangkatan: body.skPengangkatan || null,
        tanggalSk: body.tanggalSk ? new Date(body.tanggalSk) : null,
        alamat: body.alamat || null,
        noHp: body.noHp || null,
        foto: body.foto || null,
        urutan: nextUrutan,
        isActive: body.isActive ?? true
      }
    });

    return NextResponse.json({
      success: true,
      data: ketuaRW,
      message: 'Data Ketua RW berhasil ditambahkan'
    });
  } catch (error) {
    console.error('Error creating Ketua RW:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan data Ketua RW' },
      { status: 500 }
    );
  }
}
