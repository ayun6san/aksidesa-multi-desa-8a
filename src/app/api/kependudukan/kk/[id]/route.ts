import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JenisTempatTinggal } from '@prisma/client';
import { computeChangedFields } from '@/lib/activity-logger';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get KK details with all anggota
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

    const kk = await db.kK.findFirst({
      where,
      include: {
        anggota: {
          orderBy: { urutanDalamKK: 'asc' },
          select: {
            id: true,
            nik: true,
            namaLengkap: true,
            tempatLahir: true,
            tanggalLahir: true,
            jenisKelamin: true,
            agama: true,
            pekerjaan: true,
            pendidikan: true,
            statusPerkawinan: true,
            hubunganKeluarga: true,
            urutanDalamKK: true,
            status: true,
            isActive: true,
            foto: true,
          }
        },
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

    if (!kk) {
      return NextResponse.json(
        { success: false, error: 'KK tidak ditemukan' },
        { status: 404 }
      );
    }

    // Urutan prioritas hubungan keluarga (standar administrasi kependudukan)
    const hubunganPriority: Record<string, number> = {
      KEPALA_KELUARGA: 0,
      SUAMI: 1,
      ISTRI: 2,
      ANAK: 3,
      ANAK_TIRI: 4,
      ANAK_ANGKAT: 5,
      MENANTU: 6,
      CUCU: 7,
      KAKEK: 8,
      NENEK: 9,
      ORANG_TUA: 10,
      MERTUA: 11,
      FAMILI_LAIN: 12,
      PEMBANTU: 13,
      LAINNYA: 14,
    };

    // Sort anggota: prioritas hubungan → tanggal lahir (tertua dulu)
    const sortedAnggota = [...kk.anggota].sort((a, b) => {
      const priorityA = hubunganPriority[a.hubunganKeluarga || 'LAINNYA'] ?? 99;
      const priorityB = hubunganPriority[b.hubunganKeluarga || 'LAINNYA'] ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      // Prioritas sama → urutkan tanggal lahir (tertua dulu, null di akhir)
      const dateA = a.tanggalLahir ? new Date(a.tanggalLahir).getTime() : Infinity;
      const dateB = b.tanggalLahir ? new Date(b.tanggalLahir).getTime() : Infinity;
      return dateA - dateB;
    });

    // Sinkronkan urutanDalamKK di database jika ada perubahan urutan
    const needsUpdate = sortedAnggota.some((a, index) => a.urutanDalamKK !== index + 1);
    if (needsUpdate) {
      await db.$transaction(
        sortedAnggota.map((a, index) =>
          db.penduduk.update({
            where: { id: a.id },
            data: { urutanDalamKK: index + 1 },
          })
        )
      );
    }

    // Transform data
    const transformedData = {
      id: kk.id,
      nomorKK: kk.nomorKK,
      alamat: kk.alamat,
      rt: kk.rt?.nomor || '-',
      rw: kk.rt?.rw?.nomor || '-',
      dusun: kk.dusun?.nama || kk.rt?.rw?.dusun?.nama || '-',
      desa: kk.dusun?.desa?.namaDesa || kk.rt?.rw?.dusun?.desa?.namaDesa || '-',
      rtId: kk.rtId,
      dusunId: kk.dusunId,
      tanggalTerbit: kk.tanggalTerbit,
      jenisTempatTinggal: kk.jenisTempatTinggal,
      latitude: kk.latitude,
      longitude: kk.longitude,
      scanKK: kk.scanKK,
      fotoRumah: kk.fotoRumah,
      isActive: kk.isActive,
      createdAt: kk.createdAt,
      updatedAt: kk.updatedAt,
      anggota: sortedAnggota.map((a, index) => ({
        ...a,
        tanggalLahir: a.tanggalLahir?.toISOString() || null,
        urutanDalamKK: index + 1,
      }))
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching KK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data KK' },
      { status: 500 }
    );
  }
}

// PUT - Update KK
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
      nomorKK, 
      tanggalTerbit,
      jenisTempatTinggal,
      alamat, 
      rtId, 
      dusunId, 
      latitude,
      longitude,
      scanKK,
      fotoRumah,
      isActive 
    } = body;

    // Build where clause
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    // Cek KK ada dan user punya akses
    const existingKK = await db.kK.findFirst({
      where,
    });

    if (!existingKK) {
      return NextResponse.json(
        { success: false, error: 'KK tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validasi nomor KK jika diubah
    if (nomorKK && nomorKK !== existingKK.nomorKK) {
      if (!/^\d{16}$/.test(nomorKK)) {
        return NextResponse.json(
          { success: false, error: 'Nomor KK harus 16 digit angka' },
          { status: 400 }
        );
      }

      const duplicateKK = await db.kK.findUnique({
        where: { nomorKK },
      });

      if (duplicateKK) {
        return NextResponse.json(
          { success: false, error: 'Nomor KK sudah digunakan' },
          { status: 400 }
        );
      }
    }

    // Validasi jenis tempat tinggal jika diubah
    if (jenisTempatTinggal && !Object.values(JenisTempatTinggal).includes(jenisTempatTinggal as JenisTempatTinggal)) {
      return NextResponse.json(
        { success: false, error: 'Jenis tempat tinggal tidak valid' },
        { status: 400 }
      );
    }

    // Verify rtId belongs to user's desa if provided
    if (rtId && desaAccess.desaId) {
      const rt = await db.rT.findFirst({
        where: {
          id: rtId,
          rw: { dusun: { desaId: desaAccess.desaId } }
        },
      });
      if (!rt) {
        return NextResponse.json(
          { success: false, error: 'RT tidak ditemukan di desa Anda' },
          { status: 404 }
        );
      }
    }

    // Verify dusunId belongs to user's desa if provided
    if (dusunId && desaAccess.desaId) {
      const dusun = await db.dusun.findFirst({
        where: {
          id: dusunId,
          desaId: desaAccess.desaId,
        },
      });
      if (!dusun) {
        return NextResponse.json(
          { success: false, error: 'Dusun tidak ditemukan di desa Anda' },
          { status: 404 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (nomorKK) updateData.nomorKK = nomorKK;
    if (tanggalTerbit !== undefined) updateData.tanggalTerbit = tanggalTerbit ? new Date(tanggalTerbit) : null;
    if (jenisTempatTinggal) updateData.jenisTempatTinggal = jenisTempatTinggal;
    if (alamat !== undefined) updateData.alamat = alamat;
    if (rtId !== undefined) updateData.rtId = rtId || null;
    if (dusunId !== undefined) updateData.dusunId = dusunId || null;
    if (latitude !== undefined) updateData.latitude = latitude || null;
    if (longitude !== undefined) updateData.longitude = longitude || null;
    if (scanKK !== undefined) updateData.scanKK = scanKK || null;
    if (fotoRumah !== undefined) updateData.fotoRumah = fotoRumah || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update KK
    const kk = await db.kK.update({
      where: { id },
      data: updateData,
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

    // Compute changed fields for audit log
    const { changedFields, before, after } = computeChangedFields(existingKK, kk);

    // Catat log aktivitas dengan detail perubahan
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'UPDATE',
        modul: 'KK',
        deskripsi: `Mengupdate data KK: ${kk.nomorKK}`,
        dataRef: JSON.stringify({
          kkId: kk.id,
          nomorKK: kk.nomorKK,
          changedFields,
          before,
          after,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: kk,
      message: 'KK berhasil diupdate',
    });
  } catch (error) {
    console.error('Error updating KK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengupdate KK' },
      { status: 500 }
    );
  }
}

// DELETE - Delete KK
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

    // Cek KK ada dan user punya akses
    const existingKK = await db.kK.findFirst({
      where,
      include: {
        _count: {
          select: { anggota: true }
        }
      }
    });

    if (!existingKK) {
      return NextResponse.json(
        { success: false, error: 'KK tidak ditemukan' },
        { status: 404 }
      );
    }

    // Cek apakah ada anggota
    if (existingKK._count.anggota > 0) {
      return NextResponse.json(
        { success: false, error: 'KK tidak dapat dihapus karena masih memiliki anggota' },
        { status: 400 }
      );
    }

    // Hapus KK
    await db.kK.delete({
      where: { id },
    });

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.username,
        aksi: 'DELETE',
        modul: 'KK',
        deskripsi: `Menghapus KK: ${existingKK.nomorKK}`,
        dataRef: JSON.stringify({ nomorKK: existingKK.nomorKK }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'KK berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting KK:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus KK' },
      { status: 500 }
    );
  }
}
