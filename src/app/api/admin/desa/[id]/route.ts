/**
 * API untuk manajemen desa individual oleh Super Admin
 * GET: Detail desa
 * PUT: Update desa
 * DELETE: Hapus/Nonaktifkan desa
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { generateUniqueDesaSlug } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Detail desa
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Hanya Super Admin yang bisa mengakses' },
        { status: 403 }
      );
    }

    const desa = await db.desa.findUnique({
      where: { id },
      include: {
        dusun: {
          include: {
            rw: {
              include: {
                rt: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        perangkatDesa: {
          where: { isActive: true },
        },
        bpd: {
          where: { isActive: true },
        },
      },
    });

    if (!desa) {
      return NextResponse.json(
        { error: 'Desa tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get additional stats
    const dusunIds = desa.dusun.map(d => d.id);
    
    const [kkCount, pendudukCount] = await Promise.all([
      db.kK.count({
        where: {
          dusunId: { in: dusunIds },
          isActive: true,
        },
      }),
      db.penduduk.count({
        where: {
          kk: {
            dusunId: { in: dusunIds },
          },
          isActive: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...desa,
        stats: {
          totalKK: kkCount,
          totalPenduduk: pendudukCount,
          totalDusun: desa.dusun.length,
          totalRW: desa.dusun.reduce((acc, d) => acc + d.rw.length, 0),
          totalRT: desa.dusun.reduce((acc, d) => acc + d.rw.reduce((a, rw) => a + rw.rt.length, 0), 0),
          totalUsers: desa.users.length,
          totalPerangkat: desa.perangkatDesa.length,
          totalBPD: desa.bpd.length,
        },
      },
    });
  } catch (error) {
    console.error('Error getting desa detail:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// PUT - Update desa
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Hanya Super Admin yang bisa mengakses' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      namaDesa,
      kodeDesa,
      kodePos,
      kecamatan,
      kabupaten,
      provinsi,
      alamatKantor,
      telepon,
      email,
      website,
      visi,
      misi,
      luasWilayah,
      ketinggian,
      curahHujan,
      batasUtara,
      batasSelatan,
      batasTimur,
      batasBarat,
      paket,
      isActive,
    } = body;

    // Cek apakah desa ada
    const existingDesa = await db.desa.findUnique({
      where: { id },
    });

    if (!existingDesa) {
      return NextResponse.json(
        { error: 'Desa tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validasi
    const errors: string[] = [];
    if (namaDesa !== undefined && !namaDesa?.trim()) errors.push('Nama desa tidak boleh kosong');
    if (kodeDesa !== undefined && !kodeDesa?.trim()) errors.push('Kode desa tidak boleh kosong');

    // Cek duplikasi kode desa jika diubah
    if (kodeDesa && kodeDesa !== existingDesa.kodeDesa) {
      const duplicate = await db.desa.findFirst({
        where: {
          kodeDesa: kodeDesa.trim(),
          NOT: { id },
        },
      });
      if (duplicate) errors.push('Kode desa sudah digunakan');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: errors.join(', ') },
        { status: 400 }
      );
    }

    // Generate slug baru jika nama desa berubah
    let slug = existingDesa.slug;
    if (namaDesa && namaDesa !== existingDesa.namaDesa) {
      slug = await generateUniqueDesaSlug(namaDesa.trim());
    }

    // Update desa
    const updatedDesa = await db.desa.update({
      where: { id },
      data: {
        namaDesa: namaDesa?.trim() ?? existingDesa.namaDesa,
        slug,
        kodeDesa: kodeDesa?.trim() ?? existingDesa.kodeDesa,
        kodePos: kodePos?.trim() ?? existingDesa.kodePos,
        kecamatan: kecamatan?.trim() ?? existingDesa.kecamatan,
        kabupaten: kabupaten?.trim() ?? existingDesa.kabupaten,
        provinsi: provinsi?.trim() ?? existingDesa.provinsi,
        alamatKantor: alamatKantor?.trim() ?? existingDesa.alamatKantor,
        telepon: telepon?.trim() ?? existingDesa.telepon,
        email: email?.trim() ?? existingDesa.email,
        website: website?.trim() ?? existingDesa.website,
        visi: visi?.trim() ?? existingDesa.visi,
        misi: misi?.trim() ?? existingDesa.misi,
        luasWilayah: luasWilayah?.trim() ?? existingDesa.luasWilayah,
        ketinggian: ketinggian?.trim() ?? existingDesa.ketinggian,
        curahHujan: curahHujan?.trim() ?? existingDesa.curahHujan,
        batasUtara: batasUtara?.trim() ?? existingDesa.batasUtara,
        batasSelatan: batasSelatan?.trim() ?? existingDesa.batasSelatan,
        batasTimur: batasTimur?.trim() ?? existingDesa.batasTimur,
        batasBarat: batasBarat?.trim() ?? existingDesa.batasBarat,
        paket: paket ?? existingDesa.paket,
        isActive: isActive ?? existingDesa.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Desa berhasil diperbarui',
      data: updatedDesa,
    });
  } catch (error) {
    console.error('Error updating desa:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}

// DELETE - Nonaktifkan desa (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    if (!user || user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Hanya Super Admin yang bisa mengakses' },
        { status: 403 }
      );
    }

    // Cek apakah desa ada
    const existingDesa = await db.desa.findUnique({
      where: { id },
    });

    if (!existingDesa) {
      return NextResponse.json(
        { error: 'Desa tidak ditemukan' },
        { status: 404 }
      );
    }

    // Nonaktifkan desa (soft delete)
    const updatedDesa = await db.desa.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Desa berhasil dinonaktifkan',
      data: updatedDesa,
    });
  } catch (error) {
    console.error('Error deleting desa:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server' },
      { status: 500 }
    );
  }
}
