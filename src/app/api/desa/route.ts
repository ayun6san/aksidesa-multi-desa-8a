import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess, generateUniqueDesaSlug } from '@/lib/desa-context';

// GET - Get Desa settings for current user's desa
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    // Get desa access
    const desaAccess = await validateDesaAccess(user);
    
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak' },
        { status: 403 }
      );
    }

    // Super Admin sees all desa, other roles only see their own
    if (desaAccess.isSuperAdmin && !desaAccess.desaId) {
      const allDesa = await db.desa.findMany({
        include: {
          _count: {
            select: {
              users: true,
              dusun: true,
            }
          }
        },
        orderBy: { namaDesa: 'asc' },
      });

      return NextResponse.json({
        success: true,
        data: allDesa,
      });
    }

    // Non-super admin: return their specific desa
    const desa = await db.desa.findUnique({
      where: { id: desaAccess.desaId! },
      include: {
        _count: {
          select: {
            users: true,
            dusun: true,
          }
        }
      }
    });

    if (!desa) {
      return NextResponse.json(
        { success: false, error: 'Desa tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: desa,
    });
  } catch (error) {
    console.error('Error fetching desa:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data desa' },
      { status: 500 }
    );
  }
}

// PUT - Update Desa settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    // Get desa access
    const desaAccess = await validateDesaAccess(user);
    
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    // Only ADMIN_DESA or SUPER_ADMIN can update desa
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN_DESA') {
      return NextResponse.json(
        { success: false, error: 'Anda tidak memiliki izin untuk mengubah data desa' },
        { status: 403 }
      );
    }

    if (!desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak terikat ke desa manapun' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Get existing desa
    const existingDesa = await db.desa.findUnique({
      where: { id: desaAccess.desaId },
    });

    if (!existingDesa) {
      return NextResponse.json(
        { success: false, error: 'Desa tidak ditemukan' },
        { status: 404 }
      );
    }

    // Generate new slug if namaDesa changed
    let slug = existingDesa.slug;
    if (body.namaDesa && body.namaDesa !== existingDesa.namaDesa) {
      slug = await generateUniqueDesaSlug(body.namaDesa);
    }

    // Update desa
    const updatedDesa = await db.desa.update({
      where: { id: desaAccess.desaId },
      data: {
        namaDesa: body.namaDesa ?? existingDesa.namaDesa,
        slug,
        kodeDesa: body.kodeDesa ?? existingDesa.kodeDesa,
        kodePos: body.kodePos ?? null,
        kecamatan: body.kecamatan ?? existingDesa.kecamatan,
        kabupaten: body.kabupaten ?? existingDesa.kabupaten,
        provinsi: body.provinsi ?? existingDesa.provinsi,
        negara: body.negara ?? 'Indonesia',
        alamatKantor: body.alamatKantor ?? null,
        telepon: body.telepon ?? null,
        email: body.email ?? null,
        website: body.website ?? null,
        logo: body.logo,
        logoKabupaten: body.logoKabupaten,
        logoProvinsi: body.logoProvinsi,
        visi: body.visi ?? null,
        misi: body.misi ?? null,
        luasWilayah: body.luasWilayah ?? null,
        ketinggian: body.ketinggian ?? null,
        curahHujan: body.curahHujan ?? null,
        batasUtara: body.batasUtara ?? null,
        batasSelatan: body.batasSelatan ?? null,
        batasTimur: body.batasTimur ?? null,
        batasBarat: body.batasBarat ?? null,
        tanggalBerdiri: body.tanggalBerdiri ? new Date(body.tanggalBerdiri) : null,
        hariJadi: body.hariJadi ?? null,
        sejarahSingkat: body.sejarahSingkat ?? null,
      },
    });

    // Log activity
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'UPDATE',
        modul: 'DESA',
        deskripsi: 'Memperbarui data desa',
        dataRef: JSON.stringify({ desaId: updatedDesa.id }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedDesa,
      message: 'Data desa berhasil diperbarui',
    });
  } catch (error) {
    console.error('Error updating desa:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data desa' },
      { status: 500 }
    );
  }
}
