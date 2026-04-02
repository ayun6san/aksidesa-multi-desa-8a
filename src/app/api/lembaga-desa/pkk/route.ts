import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - Fetch all PKK members
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
    const isActive = searchParams.get('isActive');

    // Build where clause
    const where: Record<string, unknown> = {};

    // Filter by desa
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const pkk = await db.pKK.findMany({
      where,
      include: {
        desa: {
          select: {
            id: true,
            namaDesa: true,
            slug: true,
          }
        }
      },
      orderBy: [
        { urutan: 'asc' },
        { jabatan: 'asc' },
        { namaLengkap: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: pkk
    });
  } catch (error) {
    console.error('Error fetching PKK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data PKK' },
      { status: 500 }
    );
  }
}

// POST - Create new PKK member
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

    // Determine which desa to create PKK member for
    const desaId = user.role === 'SUPER_ADMIN' && body.desaId ? body.desaId : desaAccess.desaId;

    // Get max urutan for this desa
    const maxUrutan = await db.pKK.aggregate({
      where: { desaId },
      _max: { urutan: true }
    });
    const nextUrutan = (maxUrutan._max.urutan || 0) + 1;

    const pkk = await db.pKK.create({
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

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'CREATE',
        modul: 'LEMBAGA_DESA',
        deskripsi: `Menambahkan anggota PKK: ${body.namaLengkap}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: pkk,
      message: 'Data PKK berhasil ditambahkan'
    });
  } catch (error) {
    console.error('Error creating PKK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan data PKK' },
      { status: 500 }
    );
  }
}
