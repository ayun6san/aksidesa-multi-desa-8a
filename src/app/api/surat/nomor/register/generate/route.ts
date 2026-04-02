import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';
import { generateNomorRegister, padNumber } from '@/lib/surat-utils';

// GET /api/surat/nomor/register/generate - Generate next nomor register (preview only, no side effects)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Tidak memiliki akses' },
        { status: 401 }
      );
    }

    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed || !desaAccess.desaId) {
      return NextResponse.json(
        { success: false, error: 'Anda tidak terikat ke desa manapun' },
        { status: 403 }
      );
    }

    // Get desa konfigurasi
    const konfigurasi = await db.suratKonfigurasi.findUnique({
      where: { desaId: desaAccess.desaId },
    });

    if (!konfigurasi) {
      return NextResponse.json(
        { success: false, error: 'Konfigurasi surat desa belum diatur' },
        { status: 400 }
      );
    }

    const now = new Date();
    const tahun = now.getFullYear();

    // Get current nomor register terakhir
    const nomorRegisterRecord = await db.nomorRegister.findUnique({
      where: {
        desaId_tahun: {
          desaId: desaAccess.desaId,
          tahun,
        },
      },
    });

    const currentNomor = nomorRegisterRecord?.nomorTerakhir || 0;
    const nextNomor = currentNomor + 1;

    // Generate preview nomor register
    const nomorRegisterStr = generateNomorRegister(
      nextNomor,
      konfigurasi.kodeDesaSurat,
      tahun,
      konfigurasi.formatNomorRegister,
      konfigurasi.digitPaddingReg
    );

    // Also generate a few next numbers for preview
    const previewNomor: { nomor: number; formatted: string }[] = [];
    for (let i = 0; i < 3; i++) {
      const previewNum = nextNomor + i;
      const formatted = generateNomorRegister(
        previewNum,
        konfigurasi.kodeDesaSurat,
        tahun,
        konfigurasi.formatNomorRegister,
        konfigurasi.digitPaddingReg
      );
      previewNomor.push({ nomor: previewNum, formatted });
    }

    return NextResponse.json({
      success: true,
      data: {
        currentNomorTerakhir: currentNomor,
        nextNomor,
        nomorRegister: nomorRegisterStr,
        previewNomor,
        konfigurasi: {
          formatNomorRegister: konfigurasi.formatNomorRegister,
          kodeDesaSurat: konfigurasi.kodeDesaSurat,
          digitPaddingReg: konfigurasi.digitPaddingReg,
        },
        periode: {
          tahun,
        },
      },
    });
  } catch (error) {
    console.error('Error generating nomor register:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghasilkan nomor register' },
      { status: 500 }
    );
  }
}
