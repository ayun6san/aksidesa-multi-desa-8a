import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch single Koperasi member by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    if (!user) return NextResponse.json({ success: false, error: 'Tidak memiliki akses' }, { status: 401 });

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) return NextResponse.json({ success: false, error: desaAccess.error }, { status: 403 });

    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) where.desaId = desaAccess.desaId;

    const koperasi = await db.koperasi.findFirst({ where });
    if (!koperasi) return NextResponse.json({ success: false, error: 'Data Koperasi tidak ditemukan' }, { status: 404 });

    return NextResponse.json({ success: true, data: koperasi });
  } catch (error) {
    console.error('Error fetching Koperasi:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data Koperasi' }, { status: 500 });
  }
}

// PUT - Update Koperasi member
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    if (!user) return NextResponse.json({ success: false, error: 'Tidak memiliki akses' }, { status: 401 });

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) return NextResponse.json({ success: false, error: desaAccess.error }, { status: 403 });

    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) where.desaId = desaAccess.desaId;

    const existing = await db.koperasi.findFirst({ where });
    if (!existing) return NextResponse.json({ success: false, error: 'Data Koperasi tidak ditemukan' }, { status: 404 });

    const body = await request.json();

    const koperasi = await db.koperasi.update({
      where: { id },
      data: {
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
        isActive: body.isActive ?? true
      }
    });

    return NextResponse.json({ success: true, data: koperasi, message: 'Data Koperasi berhasil diperbarui' });
  } catch (error) {
    console.error('Error updating Koperasi:', error);
    return NextResponse.json({ success: false, error: 'Gagal memperbarui data Koperasi' }, { status: 500 });
  }
}

// DELETE - Delete Koperasi member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    if (!user) return NextResponse.json({ success: false, error: 'Tidak memiliki akses' }, { status: 401 });

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) return NextResponse.json({ success: false, error: desaAccess.error }, { status: 403 });

    const where: Record<string, unknown> = { id };
    if (desaAccess.desaId) where.desaId = desaAccess.desaId;

    const existing = await db.koperasi.findFirst({ where });
    if (!existing) return NextResponse.json({ success: false, error: 'Data Koperasi tidak ditemukan' }, { status: 404 });

    await db.koperasi.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Data Koperasi berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting Koperasi:', error);
    return NextResponse.json({ success: false, error: 'Gagal menghapus data Koperasi' }, { status: 500 });
  }
}
