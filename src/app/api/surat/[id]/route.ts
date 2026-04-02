import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/surat/[id] - Get surat detail
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

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    const surat = await db.surat.findFirst({
      where,
      include: {
        desa: {
          select: {
            id: true,
            namaDesa: true,
            slug: true,
            kodeDesa: true,
            kecamatan: true,
            kabupaten: true,
            provinsi: true,
            alamatKantor: true,
            telepon: true,
            logo: true,
          },
        },
        jenisSurat: {
          select: {
            id: true,
            kode: true,
            nama: true,
            kategori: true,
            tingkatApproval: true,
            deskripsi: true,
            persyaratan: true,
            suratTemplate: {
              select: {
                id: true,
                nama: true,
                kontenHTML: true,
                kontenCSS: true,
              },
            },
          },
        },
        pemohon: {
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
            kewarganegaraan: true,
            noHP: true,
            kk: {
              select: {
                id: true,
                nomorKK: true,
                alamat: true,
              },
            },
          },
        },
        operator: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
          },
        },
        approver: {
          select: {
            id: true,
            namaLengkap: true,
            username: true,
          },
        },
        log: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            aksi: true,
            userName: true,
            keterangan: true,
            dataSebelum: true,
            dataSesudah: true,
            createdAt: true,
          },
        },
      },
    });

    if (!surat) {
      return NextResponse.json(
        { success: false, error: 'Surat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Get desa konfigurasi for nomor surat format info
    let konfigurasi = null;
    if (surat.desaId) {
      konfigurasi = await db.suratKonfigurasi.findUnique({
        where: { desaId: surat.desaId },
        select: {
          id: true,
          formatNomorSurat: true,
          kodeDesaSurat: true,
          digitPadding: true,
          kepalaDesaNama: true,
          kepalaDesaNIP: true,
          sekretarisNama: true,
          sekretarisNIP: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...surat,
        konfigurasi,
      },
    });
  } catch (error) {
    console.error('Error fetching surat detail:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil detail surat' },
      { status: 500 }
    );
  }
}

// PUT /api/surat/[id] - Update surat (operator only)
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

    // Only operator+ can update surat
    if (!['SUPER_ADMIN', 'ADMIN_DESA', 'OPERATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Hanya operator yang dapat mengubah data surat' },
        { status: 403 }
      );
    }

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json(
        { success: false, error: desaAccess.error },
        { status: 403 }
      );
    }

    // Find surat
    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    const existing = await db.surat.findFirst({
      where,
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Surat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Only allow update for surat in certain statuses
    const editableStatuses = ['MENUNGGU_PROSES', 'DALAM_PROSES', 'MENUNGGU_APPROVAL', 'DRAFT', 'DITOLAK_OPERATOR', 'DITOLAK_KADES'];
    if (!editableStatuses.includes(existing.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Surat dengan status ${existing.status} tidak dapat diubah`,
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Update surat
    const updateData: Record<string, unknown> = {};

    if (body.pemohonNama !== undefined) updateData.pemohonNama = body.pemohonNama;
    if (body.pemohonNIK !== undefined) updateData.pemohonNIK = body.pemohonNIK;
    if (body.pemohonAlamat !== undefined) updateData.pemohonAlamat = body.pemohonAlamat;
    if (body.pemohonRT !== undefined) updateData.pemohonRT = body.pemohonRT;
    if (body.pemohonRW !== undefined) updateData.pemohonRW = body.pemohonRW;
    if (body.pemohonDusun !== undefined) updateData.pemohonDusun = body.pemohonDusun;
    if (body.pemohonTelepon !== undefined) updateData.pemohonTelepon = body.pemohonTelepon;
    if (body.isiSurat !== undefined) {
      updateData.isiSurat = typeof body.isiSurat === 'string'
        ? body.isiSurat
        : JSON.stringify(body.isiSurat);
    }
    if (body.catatanOperator !== undefined) updateData.catatanOperator = body.catatanOperator;
    if (body.dokumenPendukung !== undefined) {
      updateData.dokumenPendukung = typeof body.dokumenPendukung === 'string'
        ? body.dokumenPendukung
        : JSON.stringify(body.dokumenPendukung);
    }

    // Link penduduk if NIK provided
    if (body.pemohonNIK) {
      const penduduk = await db.penduduk.findFirst({
        where: {
          nik: body.pemohonNIK,
          desaId: existing.desaId,
          isActive: true,
        },
        select: { id: true },
      });
      if (penduduk) {
        updateData.pemohonId = penduduk.id;
      }
    }

    // Set operator if not already set
    if (!existing.operatorId) {
      updateData.operatorId = user.id;
    }

    const surat = await db.surat.update({
      where: { id },
      data: updateData,
      include: {
        jenisSurat: {
          select: { id: true, kode: true, nama: true },
        },
        desa: {
          select: { id: true, namaDesa: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: surat,
      message: 'Data surat berhasil diperbarui',
    });
  } catch (error) {
    console.error('Error updating surat:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui data surat' },
      { status: 500 }
    );
  }
}
