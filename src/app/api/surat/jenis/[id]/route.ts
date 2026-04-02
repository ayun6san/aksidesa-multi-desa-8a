import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser, requireSuperAdmin, requireAdminDesa } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { logActivity } from '@/lib/activity-logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/surat/jenis/[id] - Get single surat jenis by ID
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

    const suratJenis = await db.suratJenis.findFirst({
      where,
      include: {
        suratTemplate: {
          select: {
            id: true,
            nama: true,
            kontenHTML: true,
            kontenCSS: true,
          },
        },
        desa: {
          select: {
            id: true,
            namaDesa: true,
            slug: true,
          },
        },
        _count: {
          select: {
            surat: true,
          },
        },
      },
    });

    if (!suratJenis) {
      return NextResponse.json(
        { success: false, error: 'Jenis surat tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: suratJenis,
    });
  } catch (error) {
    console.error('Error fetching surat jenis:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data jenis surat' },
      { status: 500 }
    );
  }
}

// PUT /api/surat/jenis/[id] - Update surat jenis (ADMIN_DESA+)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdminDesa();
    const { id } = await params;
    const body = await request.json();

    // Check exists
    const existing = await db.suratJenis.findUnique({
      where: { id },
      include: {
        desa: {
          select: { id: true, namaDesa: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Jenis surat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Validate desa access for non-SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN' && user.desaId && existing.desaId !== user.desaId) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak - Anda tidak memiliki akses ke desa ini' },
        { status: 403 }
      );
    }

    // Validate kategori if provided
    if (body.kategori) {
      const validKategori = [
        'KEPENDUDUKAN', 'PENGANTAR', 'KETERANGAN', 'PERNYATAAN',
        'TANAH_PROPERTI', 'KEUANGAN', 'LEMBAGA',
      ];
      if (!validKategori.includes(body.kategori)) {
        return NextResponse.json(
          { success: false, error: 'Kategori tidak valid' },
          { status: 400 }
        );
      }
    }

    // Validate tingkatApproval if provided
    if (body.tingkatApproval) {
      const validTingkatApproval = ['LANGSUNG_PROSES', 'PERLU_APPROVAL'];
      if (!validTingkatApproval.includes(body.tingkatApproval)) {
        return NextResponse.json(
          { success: false, error: 'Tingkat approval tidak valid' },
          { status: 400 }
        );
      }
    }

    // Check kode uniqueness if changed
    if (body.kode && body.kode !== existing.kode) {
      const existingKode = await db.suratJenis.findFirst({
        where: {
          kode: body.kode,
          desaId: existing.desaId,
          NOT: { id },
        },
      });
      if (existingKode) {
        return NextResponse.json(
          { success: false, error: 'Kode surat sudah digunakan di desa ini' },
          { status: 409 }
        );
      }
    }

    const suratJenis = await db.suratJenis.update({
      where: { id },
      data: {
        ...(body.kode !== undefined && { kode: body.kode }),
        ...(body.nama !== undefined && { nama: body.nama }),
        ...(body.kategori !== undefined && { kategori: body.kategori }),
        ...(body.tingkatApproval !== undefined && { tingkatApproval: body.tingkatApproval }),
        ...(body.deskripsi !== undefined && { deskripsi: body.deskripsi }),
        ...(body.persyaratan !== undefined && {
          persyaratan: typeof body.persyaratan === 'string'
            ? body.persyaratan
            : JSON.stringify(body.persyaratan),
        }),
        ...(body.fieldTemplate !== undefined && {
          fieldTemplate: typeof body.fieldTemplate === 'string'
            ? body.fieldTemplate
            : JSON.stringify(body.fieldTemplate),
        }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.urutan !== undefined && { urutan: body.urutan }),
      },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.username,
      aksi: 'UPDATE',
      modul: 'SURAT',
      deskripsi: `Mengupdate jenis surat: ${suratJenis.nama} (${suratJenis.kode}) di desa ${existing.desa.namaDesa}`,
      dataRef: { suratJenisId: id, desaId: existing.desaId },
    });

    return NextResponse.json({
      success: true,
      data: suratJenis,
      message: 'Jenis surat berhasil diperbarui',
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    console.error('Error updating surat jenis:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui jenis surat' },
      { status: 500 }
    );
  }
}

// DELETE /api/surat/jenis/[id] - Delete surat jenis (SUPER_ADMIN only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireSuperAdmin();
    const { id } = await params;

    // Check exists
    const existing = await db.suratJenis.findUnique({
      where: { id },
      include: {
        desa: {
          select: { id: true, namaDesa: true },
        },
        _count: {
          select: {
            surat: true,
            suratTemplate: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Jenis surat tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if there are existing surat records
    if (existing._count.surat > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Tidak dapat menghapus jenis surat karena masih ada ${existing._count.surat} surat terkait`,
        },
        { status: 409 }
      );
    }

    // Delete associated template if exists
    if (existing._count.suratTemplate > 0) {
      await db.suratTemplate.deleteMany({
        where: { jenisSuratId: id },
      });
    }

    // Delete nomor surat records
    await db.nomorSurat.deleteMany({
      where: { jenisSuratId: id },
    });

    await db.suratJenis.delete({
      where: { id },
    });

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.username,
      aksi: 'DELETE',
      modul: 'SURAT',
      deskripsi: `Menghapus jenis surat: ${existing.nama} (${existing.kode}) di desa ${existing.desa.namaDesa}`,
      dataRef: { suratJenisId: id, desaId: existing.desaId },
    });

    return NextResponse.json({
      success: true,
      message: 'Jenis surat berhasil dihapus',
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      );
    }
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 403 }
      );
    }
    console.error('Error deleting surat jenis:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus jenis surat' },
      { status: 500 }
    );
  }
}
