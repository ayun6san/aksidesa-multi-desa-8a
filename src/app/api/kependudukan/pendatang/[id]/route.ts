import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JenisKelamin } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get Pendatang details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

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
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    const pendatang = await db.pendatang.findFirst({
      where,
      include: {
        rt: {
          include: {
            rw: {
              include: {
                dusun: {
                  include: {
                    desa: {
                      select: { id: true, namaDesa: true }
                    }
                  }
                }
              }
            }
          }
        },
        dusun: {
          include: {
            desa: {
              select: { id: true, namaDesa: true }
            }
          }
        },
      }
    });

    if (!pendatang) {
      return NextResponse.json(
        { success: false, error: 'Pendatang tidak ditemukan' },
        { status: 404 }
      );
    }

    // Transform data
    const transformedData = {
      ...pendatang,
      tanggalLahir: pendatang.tanggalLahir?.toISOString() || null,
      tanggalDatang: pendatang.tanggalDatang?.toISOString() || null,
      tanggalPulang: pendatang.tanggalPulang?.toISOString() || null,
      rt: pendatang.rt?.nomor || '-',
      rw: pendatang.rt?.rw?.nomor || '-',
      dusun: pendatang.dusun?.nama || pendatang.rt?.rw?.dusun?.nama || '-',
      desa: pendatang.dusun?.desa?.namaDesa || pendatang.rt?.rw?.dusun?.desa?.namaDesa || '-',
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching Pendatang:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Pendatang' },
      { status: 500 }
    );
  }
}

// PUT - Update Pendatang
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

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

    const body = await request.json();
    const {
      nik,
      namaLengkap,
      tempatLahir,
      tanggalLahir,
      jenisKelamin,
      pekerjaan,
      alamatAsal,
      tujuanKedatangan,
      noTelp,
      alamat,
      rtId,
      dusunId,
      tanggalDatang,
      tanggalPulang,
      lamaTinggal,
      isActive,
      keterangan,
      foto,
    } = body;

    // Build where clause
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    // Cek pendatang ada dan user punya akses
    const existingPendatang = await db.pendatang.findFirst({ where });

    if (!existingPendatang) {
      return NextResponse.json(
        { success: false, error: 'Pendatang tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validasi NIK jika diubah
    if (nik && nik !== existingPendatang.nik) {
      if (!/^\d{16}$/.test(nik)) {
        return NextResponse.json(
          { success: false, error: 'NIK harus 16 digit angka' },
          { status: 400 }
        );
      }
    }

    // Update pendatang
    const pendatang = await db.pendatang.update({
      where: { id },
      data: {
        ...(nik !== undefined && { nik: nik || null }),
        ...(namaLengkap && { namaLengkap }),
        ...(tempatLahir !== undefined && { tempatLahir: tempatLahir || null }),
        ...(tanggalLahir !== undefined && { tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null }),
        ...(jenisKelamin && { jenisKelamin: jenisKelamin as JenisKelamin }),
        ...(pekerjaan !== undefined && { pekerjaan: pekerjaan || null }),
        ...(alamatAsal && { alamatAsal }),
        ...(tujuanKedatangan && { tujuanKedatangan }),
        ...(noTelp !== undefined && { noTelp: noTelp || null }),
        ...(alamat !== undefined && { alamat: alamat || null }),
        ...(rtId !== undefined && { rtId: rtId || null }),
        ...(dusunId !== undefined && { dusunId: dusunId || null }),
        ...(tanggalDatang !== undefined && { tanggalDatang: tanggalDatang ? new Date(tanggalDatang) : null }),
        ...(tanggalPulang !== undefined && { tanggalPulang: tanggalPulang ? new Date(tanggalPulang) : null }),
        ...(lamaTinggal !== undefined && { lamaTinggal: lamaTinggal || null }),
        ...(isActive !== undefined && { isActive }),
        ...(keterangan !== undefined && { keterangan: keterangan || null }),
        ...(foto !== undefined && { foto: foto || null }),
      },
      include: {
        rt: {
          include: {
            rw: {
              include: {
                dusun: {
                  include: {
                    desa: { select: { id: true, namaDesa: true } }
                  }
                }
              }
            }
          }
        },
        dusun: {
          include: {
            desa: { select: { id: true, namaDesa: true } }
          }
        },
      }
    });

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'UPDATE',
        modul: 'KEPENDUDUKAN',
        deskripsi: `Mengupdate pendatang: ${pendatang.namaLengkap}`,
        dataRef: JSON.stringify({ pendatangId: pendatang.id }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...pendatang,
        tanggalLahir: pendatang.tanggalLahir?.toISOString() || null,
        tanggalDatang: pendatang.tanggalDatang?.toISOString() || null,
        tanggalPulang: pendatang.tanggalPulang?.toISOString() || null,
      },
      message: 'Pendatang berhasil diupdate',
    });
  } catch (error) {
    console.error('Error updating Pendatang:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengupdate Pendatang' },
      { status: 500 }
    );
  }
}

// DELETE - Delete Pendatang
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

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
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    // Cek pendatang ada dan user punya akses
    const existingPendatang = await db.pendatang.findFirst({ where });

    if (!existingPendatang) {
      return NextResponse.json(
        { success: false, error: 'Pendatang tidak ditemukan' },
        { status: 404 }
      );
    }

    // Hapus pendatang
    await db.pendatang.delete({
      where: { id },
    });

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'DELETE',
        modul: 'KEPENDUDUKAN',
        deskripsi: `Menghapus pendatang: ${existingPendatang.namaLengkap}`,
        dataRef: JSON.stringify({ namaLengkap: existingPendatang.namaLengkap }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pendatang berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting Pendatang:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus Pendatang' },
      { status: 500 }
    );
  }
}
