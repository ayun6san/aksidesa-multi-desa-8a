import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// ==================== LABEL → ENUM MAPPINGS ====================

/** Convert readable category values back to DB enum values */

const PERKAWINAN_LABEL_TO_ENUM: Record<string, string> = {
  'Belum Kawin': 'BELUM_KAWIN',
  'Kawin Tercatat': 'KAWIN_TERCATAT',
  'Kawin Tidak Tercatat': 'KAWIN_TIDAK_TERCATAT',
  'Cerai Hidup Tercatat': 'CERAI_HIDUP_TERCATAT',
  'Cerai Hidup Tidak Tercatat': 'CERAI_HIDUP_TIDAK_TERCATAT',
  'Cerai Mati': 'CERAI_MATI',
};

const AGAMA_LABEL_TO_ENUM: Record<string, string> = {
  'Islam': 'ISLAM',
  'Kristen': 'KRISTEN',
  'Katolik': 'KATOLIK',
  'Hindu': 'HINDU',
  'Buddha': 'BUDDHA',
  'Konghucu': 'KONGHUCU',
  'Lainnya': 'LAINNYA',
};

const STATUS_LABEL_TO_ENUM: Record<string, string> = {
  'Tetap': 'TETAP',
  'Pindah': 'PINDAH',
  'Meninggal': 'MENINGGAL',
  'Pendatang': 'PENDATANG',
};

const JENIS_KELAMIN_LABEL_TO_ENUM: Record<string, string> = {
  'Laki-laki': 'LAKI_LAKI',
  'Perempuan': 'PEREMPUAN',
};

const HUBUNGAN_KELUARGA_LABEL_TO_ENUM: Record<string, string> = {
  'Kepala Keluarga': 'KEPALA_KELUARGA',
  'Suami': 'SUAMI',
  'Istri': 'ISTRI',
  'Anak': 'ANAK',
  'Anak Tiri': 'ANAK_TIRI',
  'Anak Angkat': 'ANAK_ANGKAT',
  'Menantu': 'MENANTU',
  'Mertua': 'MERTUA',
  'Cucu': 'CUCU',
  'Kakek': 'KAKEK',
  'Nenek': 'NENEK',
  'Orang Tua': 'ORANG_TUA',
  'Famili Lain': 'FAMILI_LAIN',
  'Pembantu': 'PEMBANTU',
  'Lainnya': 'LAINNYA',
};

const STATUS_KTP_LABEL_TO_ENUM: Record<string, string> = {
  'Belum Buat': 'BELUM_BUAT',
  'Sudah Buat': 'SUDAH_BUAT',
  'Hilang': 'HILANG',
  'Dalam Proses': 'DALAM_PROSES',
};

const DISABILITAS_LABEL_TO_ENUM: Record<string, string> = {
  'Fisik': 'FISIK',
  'Netra': 'NETRA',
  'Rungu': 'RUNGU',
  'Wicara': 'WICARA',
  'Mental': 'MENTAL',
  'Intelektual': 'INTELEKTUAL',
  'Lainnya': 'LAINNYA',
};

const KEWARGANEGARAAN_LABEL_TO_ENUM: Record<string, string> = {
  'WNI': 'WNI',
  'WNA': 'WNA',
};

const STATUS_ANAK_LABEL_TO_ENUM: Record<string, string> = {
  'Bukan Yatim Piatu': 'BUKAN_YATIM_PIATU',
  'Yatim': 'YATIM',
  'Piatu': 'PIATU',
  'Yatim Piatu': 'YATIM_PIATU',
};

/** Umur Produktif buckets matching the overview API (chart) */
const UMUR_PRODUKTIF_RANGES: Record<string, { min: number; max: number }> = {
  'Balita (0-5)': { min: 0, max: 5 },
  'Anak-anak (6-14)': { min: 6, max: 14 },
  'Remaja (15-24)': { min: 15, max: 24 },
  'Dewasa Produktif (25-64)': { min: 25, max: 64 },
  'Lansia (65+)': { min: 65, max: Infinity },
};

// ==================== HELPERS ====================

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

function calculateAge(tanggalLahir: Date): number {
  const now = new Date();
  let age = now.getFullYear() - tanggalLahir.getFullYear();
  const monthDiff = now.getMonth() - tanggalLahir.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < tanggalLahir.getDate())) {
    age--;
  }
  return age;
}

// ==================== ROUTE ====================

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Tidak memiliki akses' }, { status: 401 });
    }
    const desaAccess = await validateDesaAccess(user);
    if (!desaAccess.allowed) {
      return NextResponse.json({ success: false, error: desaAccess.error }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category') || '';
    const value = searchParams.get('value') || '';
    const rtId = searchParams.get('rtId') || '';
    const rwId = searchParams.get('rwId') || '';
    const dusunId = searchParams.get('dusunId') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search') || '';
    const jenisKelamin = searchParams.get('jenisKelamin') || '';
    const umurMin = searchParams.get('umurMin') ? parseInt(searchParams.get('umurMin')!, 10) : null;
    const umurMax = searchParams.get('umurMax') ? parseInt(searchParams.get('umurMax')!, 10) : null;

    if (!category || !value) {
      return NextResponse.json(
        { success: false, error: 'Parameter category dan value wajib diisi' },
        { status: 400 },
      );
    }

    // Validate category
    const validCategories = [
      'pendidikan', 'pekerjaan', 'perkawinan', 'agama', 'darah', 'status',
      'jenis-kelamin', 'hubungan-keluarga', 'status-ktp', 'disabilitas',
      'kewarganegaraan', 'umurProduktif', 'kelompok-umur', 'status-anak',
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Kategori tidak valid' },
        { status: 400 },
      );
    }

    // ===== Build base WHERE clause =====
    const where: Record<string, unknown> = {};
    if (desaAccess.desaId) {
      where.desaId = desaAccess.desaId;
    }

    // Wilayah filter via KK mapping (Penduduk has no rtId directly)
    if (rtId) {
      const kks = await db.kK.findMany({ where: { rtId: sanitizeId(rtId), isActive: true }, select: { id: true } });
      if (kks.length > 0) where.kkId = { in: kks.map(k => k.id) };
      else where.kkId = { in: ['__none__'] };
    } else if (rwId) {
      const rw = await db.rW.findFirst({ where: { id: sanitizeId(rwId) }, include: { rt: { select: { id: true } } } });
      if (rw && rw.rt.length > 0) {
        const kks = await db.kK.findMany({ where: { rtId: { in: rw.rt.map(r => r.id) }, isActive: true }, select: { id: true } });
        if (kks.length > 0) where.kkId = { in: kks.map(k => k.id) };
        else where.kkId = { in: ['__none__'] };
      } else {
        where.kkId = { in: ['__none__'] };
      }
    } else if (dusunId) {
      const kks = await db.kK.findMany({ where: { dusunId: sanitizeId(dusunId), isActive: true }, select: { id: true } });
      if (kks.length > 0) where.kkId = { in: kks.map(k => k.id) };
      else where.kkId = { in: ['__none__'] };
    }

    // Search filter
    if (search) {
      where.OR = [
        { namaLengkap: { contains: search } },
        { nik: { contains: search } },
      ];
    }

    // ===== Determine field filter based on category =====
    const isStatusCategory = category === 'status';
    const isUmurProduktif = category === 'umurProduktif';

    // For all categories except 'status', filter TETAP + isActive
    if (!isStatusCategory) {
      where.status = 'TETAP';
      where.isActive = true;
    }

    // Apply category-specific field filter
    const isKelompokUmur = category === 'kelompok-umur';

    // kelompok-umur: filter by umurMin/umurMax (for piramida drill-down)
    // Use raw SQL to match the EXACT same age calculation as wilayah-detail table
    // SQL uses CAST((days / 365.25) AS INTEGER) which differs from JS calendar-based age
    if (isKelompokUmur) {
      if (umurMin === null || umurMax === null) {
        return NextResponse.json({ success: false, error: 'Parameter umurMin dan umurMax wajib untuk kelompok umur' }, { status: 400 });
      }

      const ageSQL = `CAST((julianday('now') - julianday(datetime(p.tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER)`;
      const maxClause = umurMax >= 999 ? '' : `AND ${ageSQL} <= ${umurMax}`;

      // Build wilayah filter for raw SQL
      const wilConditions: string[] = [];
      if (rtId) {
        wilConditions.push(`rt.id = '${sanitizeId(rtId)}'`);
      } else if (rwId) {
        const rwRts = await db.rT.findMany({ where: { rwId: sanitizeId(rwId) }, select: { id: true } });
        if (rwRts.length > 0) wilConditions.push(`rt.id IN (${rwRts.map(r => `'${r.id}'`).join(',')})`);
        else wilConditions.push(`1=0`);
      } else if (dusunId) {
        wilConditions.push(`kk.dusunId = '${sanitizeId(dusunId)}'`);
      }

      const wilJoin = rtId || rwId || dusunId
        ? `LEFT JOIN KK kk ON p.kkId = kk.id LEFT JOIN RT rt ON kk.rtId = rt.id`
        : '';
      const wilWhere = wilConditions.length > 0 ? `AND ${wilConditions.join(' AND ')}` : '';

      const searchSQL = search
        ? `AND (p.namaLengkap LIKE '%${search.replace(/'/g, "''")}%' OR p.nik LIKE '%${search.replace(/'/g, "''")}%')`
        : '';

      const jkSQL = jenisKelamin === 'LAKI_LAKI' || jenisKelamin === 'PEREMPUAN'
        ? `AND p.jenisKelamin = '${jenisKelamin}'`
        : '';

      const desaSQL = desaAccess.desaId ? `AND p.desaId = '${sanitizeId(desaAccess.desaId)}'` : '';

      const countSQL = `SELECT COUNT(*) as total
        FROM Penduduk p ${wilJoin}
        WHERE p.isActive = 1 ${desaSQL} AND p.status = 'TETAP' AND p.tanggalLahir IS NOT NULL
        AND ${ageSQL} >= ${umurMin}
        ${maxClause} ${wilWhere} ${searchSQL} ${jkSQL}`;

      const dataSQL = `SELECT p.id, p.nik, p.namaLengkap, p.jenisKelamin, p.tempatLahir, p.tanggalLahir, p.pendidikan, p.pekerjaan, p.agama, p.status
        FROM Penduduk p ${wilJoin}
        WHERE p.isActive = 1 ${desaSQL} AND p.status = 'TETAP' AND p.tanggalLahir IS NOT NULL
        AND ${ageSQL} >= ${umurMin}
        ${maxClause} ${wilWhere} ${searchSQL} ${jkSQL}
        ORDER BY p.namaLengkap ASC
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`;

      const [countRows, rows] = await Promise.all([
        db.$queryRawUnsafe<{ total: bigint }[]>(countSQL),
        db.$queryRawUnsafe<any[]>(dataSQL),
      ]);

      const total = Number(countRows[0]?.total ?? 0);
      const totalPages = Math.ceil(total / limit);

      return NextResponse.json({
        success: true,
        data: {
          items: rows.map((p: any) => {
            const birthDate = p.tanggalLahir ? new Date(Number(p.tanggalLahir)) : null;
            return {
              id: p.id,
              nik: p.nik,
              namaLengkap: p.namaLengkap,
              jenisKelamin: p.jenisKelamin,
              tempatLahir: p.tempatLahir,
              tanggalLahir: birthDate,
              usia: birthDate ? Math.max(0, calculateAge(birthDate)) : null,
              pendidikan: p.pendidikan,
              pekerjaan: p.pekerjaan,
              agama: p.agama,
              status: p.status,
            };
          }),
          total, page, limit, totalPages,
        },
      });
    }

    if (isUmurProduktif) {
      // umurProduktif: use JS-based age calculation to match the overview chart exactly
      const range = UMUR_PRODUKTIF_RANGES[value];
      if (!range) {
        return NextResponse.json(
          { success: false, error: `Nilai umur produktif tidak valid: ${value}` },
          { status: 400 },
        );
      }

      // Fetch all active TETAP penduduk with tanggalLahir (wilayah already filtered via `where`)
      const allPenduduk = await db.penduduk.findMany({
        where: {
          ...where,
          tanggalLahir: { not: null },
        },
        select: {
          id: true,
          nik: true,
          namaLengkap: true,
          jenisKelamin: true,
          tempatLahir: true,
          tanggalLahir: true,
          pendidikan: true,
          pekerjaan: true,
          agama: true,
          status: true,
        },
      });

      // Filter by age range using same JS logic as overview chart
      const filtered = allPenduduk.filter(p => {
        if (!p.tanggalLahir) return false;
        const age = calculateAge(p.tanggalLahir);
        if (age < range.min) return false;
        if (range.max !== Infinity && age > range.max) return false;
        // Apply search filter
        if (search) {
          const s = search.toLowerCase();
          return (p.namaLengkap?.toLowerCase().includes(s) || p.nik?.toLowerCase().includes(s));
        }
        return true;
      });

      // Sort by namaLengkap
      filtered.sort((a, b) => (a.namaLengkap || '').localeCompare(b.namaLengkap || ''));

      // Manual pagination
      const total = filtered.length;
      const totalPages = Math.ceil(total / limit);
      const skip = (page - 1) * limit;
      const pagedItems = filtered.slice(skip, skip + limit);

      return NextResponse.json({
        success: true,
        data: {
          items: pagedItems.map(p => ({
            id: p.id,
            nik: p.nik,
            namaLengkap: p.namaLengkap,
            jenisKelamin: p.jenisKelamin,
            tempatLahir: p.tempatLahir,
            tanggalLahir: p.tanggalLahir,
            usia: p.tanggalLahir ? Math.max(0, calculateAge(p.tanggalLahir)) : null,
            pendidikan: p.pendidikan,
            pekerjaan: p.pekerjaan,
            agama: p.agama,
            status: p.status,
          })),
          total,
          page,
          limit,
          totalPages,
        },
      });
    }

    // ===== Handle disabilitas category =====
    if (category === 'disabilitas') {
      const enumValue = DISABILITAS_LABEL_TO_ENUM[value];
      if (!enumValue) {
        return NextResponse.json(
          { success: false, error: `Nilai disabilitas tidak valid: ${value}` },
          { status: 400 },
        );
      }
      where.jenisDisabilitas = enumValue;
    }
    // ===== Handle perkawinan category =====
    else if (category === 'perkawinan') {
      const enumValue = PERKAWINAN_LABEL_TO_ENUM[value];
      if (!enumValue) {
        return NextResponse.json(
          { success: false, error: `Nilai perkawinan tidak valid: ${value}` },
          { status: 400 },
        );
      }
      where.statusPerkawinan = enumValue;
    }
    // ===== Handle agama category =====
    else if (category === 'agama') {
      const enumValue = AGAMA_LABEL_TO_ENUM[value];
      if (!enumValue) {
        return NextResponse.json(
          { success: false, error: `Nilai agama tidak valid: ${value}` },
          { status: 400 },
        );
      }
      where.agama = enumValue;
    }
    // ===== Handle status category =====
    else if (category === 'status') {
      const enumValue = STATUS_LABEL_TO_ENUM[value];
      if (!enumValue) {
        return NextResponse.json(
          { success: false, error: `Nilai status tidak valid: ${value}` },
          { status: 400 },
        );
      }
      where.status = enumValue;
      where.isActive = true;
    }
    // ===== Handle jenis-kelamin category =====
    else if (category === 'jenis-kelamin') {
      const enumValue = JENIS_KELAMIN_LABEL_TO_ENUM[value];
      if (!enumValue) {
        return NextResponse.json(
          { success: false, error: `Nilai jenis kelamin tidak valid: ${value}` },
          { status: 400 },
        );
      }
      where.jenisKelamin = enumValue;
    }
    // ===== Handle hubungan-keluarga category =====
    else if (category === 'hubungan-keluarga') {
      const enumValue = HUBUNGAN_KELUARGA_LABEL_TO_ENUM[value];
      if (!enumValue) {
        return NextResponse.json(
          { success: false, error: `Nilai hubungan keluarga tidak valid: ${value}` },
          { status: 400 },
        );
      }
      where.hubunganKeluarga = enumValue;
    }
    // ===== Handle status-ktp category =====
    else if (category === 'status-ktp') {
      const enumValue = STATUS_KTP_LABEL_TO_ENUM[value];
      if (!enumValue) {
        return NextResponse.json(
          { success: false, error: `Nilai status KTP tidak valid: ${value}` },
          { status: 400 },
        );
      }
      where.statusKTP = enumValue;
    }
    // ===== Handle kewarganegaraan category =====
    else if (category === 'kewarganegaraan') {
      const enumValue = KEWARGANEGARAAN_LABEL_TO_ENUM[value];
      if (!enumValue) {
        return NextResponse.json(
          { success: false, error: `Nilai kewarganegaraan tidak valid: ${value}` },
          { status: 400 },
        );
      }
      where.kewarganegaraan = enumValue;
    }
    // ===== Handle pendidikan category (direct string match) =====
    else if (category === 'pendidikan') {
      where.pendidikan = value;
    }
    // ===== Handle pekerjaan category (direct string match) =====
    else if (category === 'pekerjaan') {
      where.pekerjaan = value;
    }
    // ===== Handle darah category (direct string match) =====
    else if (category === 'darah') {
      where.golonganDarah = value;
    }
    // ===== Handle status-anak category =====
    else if (category === 'status-anak') {
      const enumValue = STATUS_ANAK_LABEL_TO_ENUM[value];
      if (!enumValue) {
        return NextResponse.json(
          { success: false, error: `Nilai status anak tidak valid: ${value}` },
          { status: 400 },
        );
      }
      where.statusAnak = enumValue;
    }

    // ===== Additional JK filter (works for ALL categories) =====
    if (jenisKelamin === 'LAKI_LAKI' || jenisKelamin === 'PEREMPUAN') {
      where.jenisKelamin = jenisKelamin;
    }

    // ===== Fetch paginated results =====
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db.penduduk.findMany({
        where,
        select: {
          id: true,
          nik: true,
          namaLengkap: true,
          jenisKelamin: true,
          tempatLahir: true,
          tanggalLahir: true,
          pendidikan: true,
          pekerjaan: true,
          agama: true,
          status: true,
        },
        orderBy: { namaLengkap: 'asc' },
        skip,
        take: limit,
      }),
      db.penduduk.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        items: items.map(p => ({
          id: p.id,
          nik: p.nik,
          namaLengkap: p.namaLengkap,
          jenisKelamin: p.jenisKelamin,
          tempatLahir: p.tempatLahir,
          tanggalLahir: p.tanggalLahir,
          usia: p.tanggalLahir ? calculateAge(p.tanggalLahir) : null,
          pendidikan: p.pendidikan,
          pekerjaan: p.pekerjaan,
          agama: p.agama,
          status: p.status,
        })),
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching penduduk list:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data penduduk' },
      { status: 500 },
    );
  }
}
