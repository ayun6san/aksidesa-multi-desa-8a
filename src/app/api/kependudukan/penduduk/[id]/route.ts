import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { JenisKelamin, Agama, StatusPerkawinan, StatusPenduduk, StatusKTP, JenisDisabilitas, Kewarganegaraan } from '@prisma/client';
import { computeChangedFields } from '@/lib/activity-logger';
import { getCurrentUser, requireOperator } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// GET - Get Penduduk details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Silakan login terlebih dahulu' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const penduduk = await db.penduduk.findUnique({
      where: { id },
      include: {
        kk: {
          include: {
            rt: {
              include: {
                rw: {
                  include: {
                    dusun: true
                  }
                }
              }
            },
            dusun: true,
            anggota: {
              where: { hubunganKeluarga: { in: ['KEPALA_KELUARGA'] } },
              select: { namaLengkap: true }
            }
          }
        }
      }
    });

    if (!penduduk) {
      return NextResponse.json(
        { success: false, error: 'Penduduk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate desa access - penduduk harus dari desa yang sama dengan user
    const desaAccess = await validateDesaAccess(user, penduduk.desaId);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak' },
        { status: 403 }
      );
    }

    // Transform data - flatten KK relations into strings
    const kkData = penduduk.kk ? {
      id: penduduk.kk.id,
      nomorKK: penduduk.kk.nomorKK,
      alamat: penduduk.kk.alamat || '-',
      rt: penduduk.kk.rt?.nomor || '-',
      rw: penduduk.kk.rt?.rw?.nomor || '-',
      dusun: penduduk.kk.dusun?.nama || penduduk.kk.rt?.rw?.dusun?.nama || '-',
    } : null;

    // Fetch pasangan data if exists
    let pasanganData: { id: string; namaLengkap: string; nik: string | null } | null = null;
    if (penduduk.pasanganId) {
      const pasangan = await db.penduduk.findUnique({
        where: { id: penduduk.pasanganId },
        select: { id: true, namaLengkap: true, nik: true },
      });
      if (pasangan) {
        pasanganData = pasangan;
      }
    }

    const transformedData = {
      ...penduduk,
      tanggalLahir: penduduk.tanggalLahir?.toISOString() || null,
      tanggalPerkawinan: penduduk.tanggalPerkawinan?.toISOString() || null,
      tanggalPerceraian: penduduk.tanggalPerceraian?.toISOString() || null,
      tanggalMasuk: penduduk.tanggalMasuk?.toISOString() || null,
      kk: kkData,
      pasangan: pasanganData,
      namaKepalaKeluarga: penduduk.kk?.anggota[0]?.namaLengkap || '-',
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Error fetching Penduduk:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Penduduk' },
      { status: 500 }
    );
  }
}

// PUT - Update Penduduk
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check - require operator or higher
    const user = await requireOperator();

    const { id } = await params;
    const body = await request.json();

    // Cek penduduk ada
    const existingPenduduk = await db.penduduk.findUnique({
      where: { id },
    });

    if (!existingPenduduk) {
      return NextResponse.json(
        { success: false, error: 'Penduduk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate desa access
    const desaAccess = await validateDesaAccess(user, existingPenduduk.desaId);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak' },
        { status: 403 }
      );
    }

    // Validasi NIK jika diubah
    if (body.nik && body.nik !== existingPenduduk.nik) {
      if (!/^\d{16}$/.test(body.nik)) {
        return NextResponse.json(
          { success: false, error: 'NIK harus 16 digit angka' },
          { status: 400 }
        );
      }

      const duplicateNIK = await db.penduduk.findUnique({
        where: { nik: body.nik },
      });

      if (duplicateNIK) {
        return NextResponse.json(
          { success: false, error: 'NIK sudah digunakan' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    // Identitas
    if (body.nik) updateData.nik = body.nik;
    if (body.namaLengkap) updateData.namaLengkap = body.namaLengkap;
    if (body.tempatLahir !== undefined) updateData.tempatLahir = body.tempatLahir || null;
    if (body.tanggalLahir !== undefined) updateData.tanggalLahir = body.tanggalLahir ? new Date(body.tanggalLahir) : null;
    if (body.jenisKelamin) updateData.jenisKelamin = body.jenisKelamin as JenisKelamin;
    if (body.golonganDarah !== undefined) updateData.golonganDarah = body.golonganDarah || null;
    if (body.agama) updateData.agama = body.agama as Agama;
    if (body.suku !== undefined) updateData.suku = body.suku || null;
    
    // Status Perkawinan
    if (body.statusPerkawinan) updateData.statusPerkawinan = body.statusPerkawinan as StatusPerkawinan;
    if (body.aktaPerkawinan !== undefined) updateData.aktaPerkawinan = body.aktaPerkawinan || null;
    if (body.tanggalPerkawinan !== undefined) updateData.tanggalPerkawinan = body.tanggalPerkawinan ? new Date(body.tanggalPerkawinan) : null;
    if (body.aktaPerceraian !== undefined) updateData.aktaPerceraian = body.aktaPerceraian || null;
    if (body.tanggalPerceraian !== undefined) updateData.tanggalPerceraian = body.tanggalPerceraian ? new Date(body.tanggalPerceraian) : null;
    
    // Pekerjaan & Pendidikan
    if (body.pekerjaan !== undefined) updateData.pekerjaan = body.pekerjaan || null;
    if (body.pendidikan !== undefined) updateData.pendidikan = body.pendidikan || null;
    if (body.penghasilan !== undefined) updateData.penghasilan = body.penghasilan || null;
    
    // Kewarganegaraan
    if (body.kewarganegaraan) updateData.kewarganegaraan = body.kewarganegaraan as Kewarganegaraan;
    if (body.negaraAsal !== undefined) updateData.negaraAsal = body.negaraAsal || null;
    if (body.noPaspor !== undefined) updateData.noPaspor = body.noPaspor || null;
    if (body.noKitasKitap !== undefined) updateData.noKitasKitap = body.noKitasKitap || null;
    if (body.tanggalMasuk !== undefined) updateData.tanggalMasuk = body.tanggalMasuk ? new Date(body.tanggalMasuk) : null;
    
    // Dokumen
    if (body.noAktaKelahiran !== undefined) updateData.noAktaKelahiran = body.noAktaKelahiran || null;
    if (body.statusKTP) updateData.statusKTP = body.statusKTP as StatusKTP;
    if (body.noBPJSKesehatan !== undefined) updateData.noBPJSKesehatan = body.noBPJSKesehatan || null;
    if (body.noBPJSTenagakerja !== undefined) updateData.noBPJSTenagakerja = body.noBPJSTenagakerja || null;
    if (body.npwp !== undefined) updateData.npwp = body.npwp || null;
    
    // Data Orang Tua
    if (body.namaAyah !== undefined) updateData.namaAyah = body.namaAyah || null;
    if (body.nikAyah !== undefined) updateData.nikAyah = body.nikAyah || null;
    if (body.namaIbu !== undefined) updateData.namaIbu = body.namaIbu || null;
    if (body.nikIbu !== undefined) updateData.nikIbu = body.nikIbu || null;
    if (body.anakKe !== undefined) updateData.anakKe = body.anakKe ? parseInt(body.anakKe) : null;
    if (body.jumlahSaudara !== undefined) updateData.jumlahSaudara = body.jumlahSaudara ? parseInt(body.jumlahSaudara) : null;
    
    // alamat, rtId, dusunId dihapus - menggunakan dari KK
    
    // KK — validate that target KK belongs to same desa
    if (body.kkId !== undefined) {
      if (body.kkId) {
        const targetKK = await db.kK.findFirst({ where: { id: body.kkId, desaId: existingPenduduk.desaId } });
        if (!targetKK) {
          return NextResponse.json(
            { success: false, error: 'KK tidak ditemukan di desa Anda' },
            { status: 400 }
          );
        }
      }
      updateData.kkId = body.kkId || null;
    }
    if (body.hubunganKeluarga !== undefined) updateData.hubunganKeluarga = body.hubunganKeluarga || null;
    if (body.urutanDalamKK !== undefined) updateData.urutanDalamKK = body.urutanDalamKK;

    // === AUTO-SET ayahId/ibuId based on hubunganKeluarga ===
    // Only recompute when the value ACTUALLY changes (not just sent in body)
    // Preserve existing valid parent links — never null out unless role changes from child to non-child
    const CHILD_HUBUNGAN = ['ANAK', 'ANAK_TIRI', 'ANAK_ANGKAT'];
    const oldHubungan = existingPenduduk.hubunganKeluarga || null;
    const newHubungan = body.hubunganKeluarga !== undefined ? (body.hubunganKeluarga || null) : oldHubungan;
    const oldKkId = existingPenduduk.kkId || null;
    const newKkId = body.kkId !== undefined ? (body.kkId || null) : oldKkId;

    const hubunganActuallyChanged = newHubungan !== oldHubungan;
    const kkActuallyChanged = newKkId !== oldKkId;

    const wasChild = oldHubungan ? CHILD_HUBUNGAN.includes(oldHubungan) : false;
    const isChild = newHubungan ? CHILD_HUBUNGAN.includes(newHubungan) : false;

    if (wasChild && !isChild) {
      // Role changed from child to non-child → clear parent links
      updateData.ayahId = null;
      updateData.ibuId = null;
    } else if (!wasChild && isChild) {
      // Role changed from non-child to child → search parents in current KK
      if (newKkId) {
        const ortu = await db.penduduk.findMany({
          where: {
            kkId: newKkId,
            hubunganKeluarga: { in: ['SUAMI', 'ISTRI', 'KEPALA_KELUARGA'] },
            isActive: true,
            status: { not: 'MENINGGAL' },
          },
          select: { id: true, hubunganKeluarga: true, jenisKelamin: true },
        });
        const suami = ortu.find(p => p.hubunganKeluarga === 'SUAMI');
        const istri = ortu.find(p => p.hubunganKeluarga === 'ISTRI');
        const kepala = ortu.find(p => p.hubunganKeluarga === 'KEPALA_KELUARGA');
        updateData.ayahId = suami?.id || (kepala?.jenisKelamin === 'LAKI_LAKI' ? kepala.id : null);
        updateData.ibuId = istri?.id || (kepala?.jenisKelamin === 'PEREMPUAN' ? kepala.id : null);
      }
    } else if (isChild && kkActuallyChanged) {
      // Child moved to a different KK → search parents in new KK
      // If not found in new KK, preserve existing parent links (don't null out)
      if (newKkId) {
        const ortu = await db.penduduk.findMany({
          where: {
            kkId: newKkId,
            hubunganKeluarga: { in: ['SUAMI', 'ISTRI', 'KEPALA_KELUARGA'] },
            isActive: true,
            status: { not: 'MENINGGAL' },
          },
          select: { id: true, hubunganKeluarga: true, jenisKelamin: true },
        });
        const suami = ortu.find(p => p.hubunganKeluarga === 'SUAMI');
        const istri = ortu.find(p => p.hubunganKeluarga === 'ISTRI');
        const kepala = ortu.find(p => p.hubunganKeluarga === 'KEPALA_KELUARGA');

        const foundAyah = suami?.id || (kepala?.jenisKelamin === 'LAKI_LAKI' ? kepala.id : null);
        const foundIbu = istri?.id || (kepala?.jenisKelamin === 'PEREMPUAN' ? kepala.id : null);

        // Only update if found — preserve existing link if parent not in new KK
        if (foundAyah) updateData.ayahId = foundAyah;
        if (foundIbu) updateData.ibuId = foundIbu;
      }
    }
    // else: no relevant change → do nothing, preserve existing ayahId/ibuId
    
    // Kontak
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.noHP !== undefined) updateData.noHP = body.noHP || null;
    
    // Kesehatan & Disabilitas
    if (body.jenisDisabilitas) updateData.jenisDisabilitas = body.jenisDisabilitas as JenisDisabilitas;
    if (body.keteranganDisabilitas !== undefined) updateData.keteranganDisabilitas = body.keteranganDisabilitas || null;
    if (body.penyakitKronis !== undefined) updateData.penyakitKronis = body.penyakitKronis || null;
    
    // Status
    if (body.status) updateData.status = body.status as StatusPenduduk;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    
    // Foto
    if (body.foto !== undefined) updateData.foto = body.foto || null;
    if (body.fotoKTP !== undefined) updateData.fotoKTP = body.fotoKTP || null;

    // Update penduduk
    const penduduk = await db.penduduk.update({
      where: { id },
      data: updateData,
      include: {
        kk: {
          include: {
            rt: {
              include: {
                rw: {
                  include: {
                    dusun: true
                  }
                }
              }
            },
            dusun: true
          }
        }
      }
    });

    // Compute changed fields for audit log
    const { changedFields, before, after } = computeChangedFields(
      {
        ...existingPenduduk,
        tanggalLahir: existingPenduduk.tanggalLahir?.toISOString()?.split('T')[0],
        tanggalPerkawinan: existingPenduduk.tanggalPerkawinan?.toISOString()?.split('T')[0],
        tanggalPerceraian: existingPenduduk.tanggalPerceraian?.toISOString()?.split('T')[0],
        tanggalMasuk: existingPenduduk.tanggalMasuk?.toISOString()?.split('T')[0],
      },
      {
        ...penduduk,
        tanggalLahir: penduduk.tanggalLahir?.toISOString()?.split('T')[0],
        tanggalPerkawinan: penduduk.tanggalPerkawinan?.toISOString()?.split('T')[0],
        tanggalPerceraian: penduduk.tanggalPerceraian?.toISOString()?.split('T')[0],
        tanggalMasuk: penduduk.tanggalMasuk?.toISOString()?.split('T')[0],
      }
    );

    // Catat log aktivitas dengan detail perubahan
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.namaLengkap,
        aksi: 'UPDATE',
        modul: 'PENDUDUK',
        deskripsi: `Mengupdate data penduduk: ${penduduk.namaLengkap} (${penduduk.nik})`,
        dataRef: JSON.stringify({
          pendudukId: penduduk.id,
          nik: penduduk.nik,
          nama: penduduk.namaLengkap,
          changedFields,
          before,
          after,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...penduduk,
        tanggalLahir: penduduk.tanggalLahir?.toISOString() || null,
        tanggalPerkawinan: penduduk.tanggalPerkawinan?.toISOString() || null,
        tanggalPerceraian: penduduk.tanggalPerceraian?.toISOString() || null,
        tanggalMasuk: penduduk.tanggalMasuk?.toISOString() || null,
      },
      message: 'Penduduk berhasil diupdate',
    });
  } catch (error) {
    console.error('Error updating Penduduk:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengupdate Penduduk';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}

// DELETE - Delete Penduduk
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check - require admin desa or higher for delete
    const user = await requireOperator();

    const { id } = await params;

    // Cek penduduk ada
    const existingPenduduk = await db.penduduk.findUnique({
      where: { id },
    });

    if (!existingPenduduk) {
      return NextResponse.json(
        { success: false, error: 'Penduduk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate desa access
    const desaAccess = await validateDesaAccess(user, existingPenduduk.desaId);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses ditolak' },
        { status: 403 }
      );
    }

    // Hapus penduduk
    // Before deleting, recompute statusAnak for any children linked to this penduduk
    // (Prisma onDelete: SetNull will clear ayahId/ibuId, but statusAnak won't auto-update)
    const linkedChildren = await db.penduduk.findMany({
      where: {
        OR: [
          { ayahId: id },
          { ibuId: id },
        ],
        isActive: true,
      },
      select: { id: true, ayahId: true, ibuId: true, statusAnak: true },
    });

    if (linkedChildren.length > 0) {
      // For each child, check if they will still have the other parent alive
      // After deletion: the deleted parent is gone, so count as dead
      const parentIds = [...new Set(linkedChildren.flatMap(c => [c.ayahId, c.ibuId].filter(Boolean) as string[]).filter(pid => pid !== id))];
      const otherParents = parentIds.length > 0
        ? await db.penduduk.findMany({ where: { id: { in: parentIds } }, select: { id: true, isActive: true, status: true } })
        : [];
      const parentMap = new Map(otherParents.map(p => [p.id, p]));

      const updates = linkedChildren.map(child => {
        const ayahAlive = child.ayahId && child.ayahId !== id
          ? (() => { const p = parentMap.get(child.ayahId!); return !!(p && p.isActive && p.status !== 'MENINGGAL'); })()
          : false;
        const ibuAlive = child.ibuId && child.ibuId !== id
          ? (() => { const p = parentMap.get(child.ibuId!); return !!(p && p.isActive && p.status !== 'MENINGGAL'); })()
          : false;

        let newStatus: 'BUKAN_YATIM_PIATU' | 'YATIM' | 'PIATU' | 'YATIM_PIATU' = 'BUKAN_YATIM_PIATU';
        if (!ayahAlive && !ibuAlive) newStatus = 'YATIM_PIATU';
        else if (!ayahAlive) newStatus = 'YATIM';
        else if (!ibuAlive) newStatus = 'PIATU';

        if (newStatus !== child.statusAnak) {
          return db.penduduk.update({ where: { id: child.id }, data: { statusAnak: newStatus } });
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
    }

    await db.penduduk.delete({
      where: { id },
    });

    // Catat log aktivitas
    await db.logAktivitas.create({
      data: {
        userId: user.id,
        userName: user.namaLengkap,
        aksi: 'DELETE',
        modul: 'KEPENDUDUKAN',
        deskripsi: `Menghapus penduduk: ${existingPenduduk.namaLengkap} (${existingPenduduk.nik})`,
        dataRef: JSON.stringify({ nik: existingPenduduk.nik }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Penduduk berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting Penduduk:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus Penduduk';
    const statusCode = errorMessage.includes('Unauthorized') || errorMessage.includes('Forbidden') ? 401 : 500;
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: statusCode }
    );
  }
}
