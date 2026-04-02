import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { logActivity, getClientInfo } from '@/lib/activity-logger';

// GET /api/surat/konfigurasi - Get surat konfigurasi for user's desa
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryDesaId = searchParams.get('desaId');
    const desaAccess = await validateDesaAccess(user, queryDesaId || undefined);
    if (!desaAccess.allowed || !desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses desa tidak valid' },
        { status: 403 }
      );
    }

    const konfigurasi = await db.suratKonfigurasi.findUnique({
      where: { desaId: desaAccess.desaId },
      include: {
        desa: {
          select: {
            id: true,
            namaDesa: true,
            slug: true,
            kodeDesa: true,
          },
        },
      },
    });

    if (!konfigurasi) {
      return NextResponse.json(
        { success: false, error: 'Konfigurasi surat belum diatur untuk desa ini' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: konfigurasi,
    });
  } catch (error) {
    console.error('Error fetching surat konfigurasi:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil konfigurasi surat' },
      { status: 500 }
    );
  }
}

// PUT /api/surat/konfigurasi - Update or create surat konfigurasi (upsert)
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    // Require at least admin desa or operator
    if (!['SUPER_ADMIN', 'ADMIN_DESA', 'OPERATOR'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Hanya Admin Desa atau Operator yang bisa mengatur konfigurasi surat' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const targetDesaId = body.desaId;
    const desaAccess = await validateDesaAccess(user, targetDesaId || undefined);
    if (!desaAccess.allowed || !desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: desaAccess.error || 'Akses desa tidak valid' },
        { status: 403 }
      );
    }
    const clientInfo = getClientInfo(request);

    // ====== VALIDATION ======

    // Format Nomor Surat
    if (body.formatNomorSurat && typeof body.formatNomorSurat === 'string') {
      if (!body.formatNomorSurat.includes('{nomor}')) {
        return NextResponse.json(
          { success: false, error: 'Format nomor surat harus mengandung {nomor}' },
          { status: 400 }
        );
      }
      if (body.formatNomorSurat.length > 200) {
        return NextResponse.json(
          { success: false, error: 'Format nomor surat maksimal 200 karakter' },
          { status: 400 }
        );
      }
    }

    // Digit Padding
    if (body.digitPadding !== undefined && body.digitPadding !== null) {
      const dp = Number(body.digitPadding);
      if (!Number.isInteger(dp) || dp < 1 || dp > 6) {
        return NextResponse.json(
          { success: false, error: 'Digit padding harus bilangan bulat antara 1-6' },
          { status: 400 }
        );
      }
    }

    // Format Bulan
    const validFormatBulan = ['ROMAWI', 'ANGKA', 'TANPA'];
    if (body.formatBulan !== undefined && body.formatBulan !== null) {
      if (!validFormatBulan.includes(body.formatBulan)) {
        return NextResponse.json(
          { success: false, error: 'Format bulan tidak valid (pilih: ROMAWI, ANGKA, TANPA)' },
          { status: 400 }
        );
      }
    }

    // Reset Nomor Per
    const validResetNomor = ['PER_TAHUN', 'PER_BULAN', 'BERKELANJUTAN'];
    if (body.resetNomorPer !== undefined && body.resetNomorPer !== null) {
      if (!validResetNomor.includes(body.resetNomorPer)) {
        return NextResponse.json(
          { success: false, error: 'Reset nomor per tidak valid (pilih: PER_TAHUN, PER_BULAN, BERKELANJUTAN)' },
          { status: 400 }
        );
      }
    }

    // Format Nomor Register
    if (body.formatNomorRegister && typeof body.formatNomorRegister === 'string') {
      if (!body.formatNomorRegister.includes('{nomor}')) {
        return NextResponse.json(
          { success: false, error: 'Format nomor register harus mengandung {nomor}' },
          { status: 400 }
        );
      }
      if (body.formatNomorRegister.length > 200) {
        return NextResponse.json(
          { success: false, error: 'Format nomor register maksimal 200 karakter' },
          { status: 400 }
        );
      }
    }

    // Digit Padding Register
    if (body.digitPaddingReg !== undefined && body.digitPaddingReg !== null) {
      const dpr = Number(body.digitPaddingReg);
      if (!Number.isInteger(dpr) || dpr < 1 || dpr > 6) {
        return NextResponse.json(
          { success: false, error: 'Digit padding register harus bilangan bulat antara 1-6' },
          { status: 400 }
        );
      }
    }

    // Kode Desa Surat (required for format preview)
    if (body.kodeDesaSurat !== undefined && body.kodeDesaSurat !== null) {
      if (typeof body.kodeDesaSurat !== 'string' || body.kodeDesaSurat.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Kode desa surat tidak boleh kosong' },
          { status: 400 }
        );
      }
      if (body.kodeDesaSurat.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Kode desa surat maksimal 100 karakter' },
          { status: 400 }
        );
      }
    }

    // Optional field length validation
    if (body.kepalaDesaNama !== undefined && body.kepalaDesaNama !== null) {
      if (typeof body.kepalaDesaNama !== 'string' || body.kepalaDesaNama.length > 200) {
        return NextResponse.json(
          { success: false, error: 'Nama kepala desa maksimal 200 karakter' },
          { status: 400 }
        );
      }
    }

    if (body.kepalaDesaNIP !== undefined && body.kepalaDesaNIP !== null) {
      if (typeof body.kepalaDesaNIP !== 'string' || body.kepalaDesaNIP.length > 50) {
        return NextResponse.json(
          { success: false, error: 'NIP kepala desa maksimal 50 karakter' },
          { status: 400 }
        );
      }
    }

    if (body.sekretarisNama !== undefined && body.sekretarisNama !== null) {
      if (typeof body.sekretarisNama !== 'string' || body.sekretarisNama.length > 200) {
        return NextResponse.json(
          { success: false, error: 'Nama sekretaris maksimal 200 karakter' },
          { status: 400 }
        );
      }
    }

    if (body.sekretarisNIP !== undefined && body.sekretarisNIP !== null) {
      if (typeof body.sekretarisNIP !== 'string' || body.sekretarisNIP.length > 50) {
        return NextResponse.json(
          { success: false, error: 'NIP sekretaris maksimal 50 karakter' },
          { status: 400 }
        );
      }
    }

    // ====== UPSERT ======

    // Check existing konfigurasi
    const existing = await db.suratKonfigurasi.findUnique({
      where: { desaId: desaAccess.desaId },
    });

    // Build update data
    const updateData: Record<string, unknown> = {
      formatNomorSurat: body.formatNomorSurat !== undefined ? body.formatNomorSurat : existing?.formatNomorSurat || '{nomor}/{kodeDesa}/{bulan}/{tahun}',
      digitPadding: body.digitPadding !== undefined ? Number(body.digitPadding) : existing?.digitPadding || 3,
      formatBulan: body.formatBulan ?? existing?.formatBulan ?? 'ROMAWI',
      resetNomorPer: body.resetNomorPer ?? existing?.resetNomorPer ?? 'PER_TAHUN',
      formatNomorRegister: body.formatNomorRegister !== undefined ? body.formatNomorRegister : existing?.formatNomorRegister || '{nomor}/{kodeDesa}/Reg/{tahun}',
      digitPaddingReg: body.digitPaddingReg !== undefined ? Number(body.digitPaddingReg) : existing?.digitPaddingReg || 4,
      kodeDesaSurat: body.kodeDesaSurat !== undefined ? body.kodeDesaSurat : existing?.kodeDesaSurat || '',
      kepalaDesaNama: body.kepalaDesaNama !== undefined ? (body.kepalaDesaNama || null) : existing?.kepalaDesaNama ?? null,
      kepalaDesaNIP: body.kepalaDesaNIP !== undefined ? (body.kepalaDesaNIP || null) : existing?.kepalaDesaNIP ?? null,
      sekretarisNama: body.sekretarisNama !== undefined ? (body.sekretarisNama || null) : existing?.sekretarisNama ?? null,
      sekretarisNIP: body.sekretarisNIP !== undefined ? (body.sekretarisNIP || null) : existing?.sekretarisNIP ?? null,
    };

    let konfigurasi;

    if (existing) {
      // Update existing
      konfigurasi = await db.suratKonfigurasi.update({
        where: { id: existing.id },
        data: updateData,
        include: {
          desa: {
            select: {
              id: true,
              namaDesa: true,
              slug: true,
              kodeDesa: true,
            },
          },
        },
      });
    } else {
      // Create new
      konfigurasi = await db.suratKonfigurasi.create({
        data: {
          desaId: desaAccess.desaId,
          formatNomorSurat: updateData.formatNomorSurat as string,
          digitPadding: updateData.digitPadding as number,
          formatBulan: updateData.formatBulan as 'ROMAWI' | 'ANGKA' | 'TANPA',
          resetNomorPer: updateData.resetNomorPer as string,
          formatNomorRegister: updateData.formatNomorRegister as string,
          digitPaddingReg: updateData.digitPaddingReg as number,
          kodeDesaSurat: updateData.kodeDesaSurat as string,
          kepalaDesaNama: updateData.kepalaDesaNama as string | null,
          kepalaDesaNIP: updateData.kepalaDesaNIP as string | null,
          sekretarisNama: updateData.sekretarisNama as string | null,
          sekretarisNIP: updateData.sekretarisNIP as string | null,
        },
        include: {
          desa: {
            select: {
              id: true,
              namaDesa: true,
              slug: true,
              kodeDesa: true,
            },
          },
        },
      });
    }

    // Log activity
    await logActivity({
      userId: user.id,
      userName: user.namaLengkap || user.username,
      aksi: existing ? 'UPDATE' : 'CREATE',
      modul: 'SETTINGS',
      deskripsi: existing
        ? `Memperbarui konfigurasi surat desa ${desaAccess.desa?.namaDesa || ''}`
        : `Membuat konfigurasi surat desa ${desaAccess.desa?.namaDesa || ''}`,
      dataRef: {
        suratKonfigurasiId: konfigurasi.id,
        desaId: desaAccess.desaId,
        changedFields: existing
          ? Object.keys(body)
          : ['all'],
      },
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      deviceInfo: clientInfo.deviceInfo,
    });

    return NextResponse.json({
      success: true,
      data: konfigurasi,
      message: existing ? 'Konfigurasi surat berhasil diperbarui' : 'Konfigurasi surat berhasil dibuat',
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
    console.error('Error updating surat konfigurasi:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan konfigurasi surat' },
      { status: 500 }
    );
  }
}
