import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth-utils';
import { validateDesaAccess } from '@/lib/desa-context';

// Category → Prisma field mapping
const CATEGORY_FIELD: Record<string, string> = {
  pendidikan: 'pendidikan',
  pekerjaan: 'pekerjaan',
  perkawinan: 'statusPerkawinan',
  agama: 'agama',
  darah: 'golonganDarah',
  disabilitas: 'jenisDisabilitas',
  kewarganegaraan: 'kewarganegaraan',
  'jenis-kelamin': 'jenisKelamin',
  'status-ktp': 'statusKTP',
  'hubungan-keluarga': 'hubunganKeluarga',
  'status-anak': 'statusAnak',
};

// Education hierarchy order (BPS standard)
const PENDIDIKAN_ORDER = [
  'Tidak/Belum Sekolah', 'SD/Sederajat', 'SMP/Sederajat', 'SMA/Sederajat',
  'D1', 'D2', 'D3', 'D4/S1', 'S2', 'S3',
];

// Marriage status order
const PERKAWINAN_ORDER = [
  'Belum Kawin', 'Kawin Tercatat', 'Kawin Tidak Tercatat',
  'Cerai Hidup Tercatat', 'Cerai Hidup Tidak Tercatat', 'Cerai Mati',
];

// Age group ordering for umurProduktif
const UMUR_PRODUKTIF_ORDER = [
  'Balita (0-5)', 'Anak-anak (6-14)', 'Remaja (15-24)',
  'Dewasa Produktif (25-64)', 'Lansia (65+)',
];

// Kelompok Umur (BPS standard 16 groups)
const KELOMPOK_UMUR_ORDER = [
  '0-4', '5-9', '10-14', '15-19', '20-24', '25-29', '30-34', '35-39',
  '40-44', '45-49', '50-54', '55-59', '60-64', '65-69', '70-74', '75+',
];

// Jenis Kelamin order
const JENIS_KELAMIN_ORDER = ['Laki-laki', 'Perempuan'];

// Status KTP order
const STATUS_KTP_ORDER = ['Belum Buat', 'Sudah Buat', 'Hilang', 'Dalam Proses'];

// Hubungan Keluarga order
const HUBUNGAN_KELUARGA_ORDER = [
  'Kepala Keluarga', 'Istri', 'Suami', 'Anak', 'Anak Tiri', 'Anak Angkat',
  'Menantu', 'Mertua', 'Cucu', 'Kakek', 'Nenek', 'Orang Tua',
  'Famili Lain', 'Pembantu', 'Lainnya',
];

// Status Anak (Yatim/Piatu) order
const STATUS_ANAK_ORDER = [
  'Bukan Yatim Piatu', 'Yatim', 'Piatu', 'Yatim Piatu',
];

// Label mappers (enum → readable)
const LABEL_MAP: Record<string, Record<string, string>> = {
  statusPerkawinan: {
    'BELUM_KAWIN': 'Belum Kawin',
    'KAWIN_TERCATAT': 'Kawin Tercatat',
    'KAWIN_TIDAK_TERCATAT': 'Kawin Tidak Tercatat',
    'CERAI_HIDUP_TERCATAT': 'Cerai Hidup Tercatat',
    'CERAI_HIDUP_TIDAK_TERCATAT': 'Cerai Hidup Tidak Tercatat',
    'CERAI_MATI': 'Cerai Mati',
  },
  status: { 'TETAP': 'Tetap', 'PENDATANG': 'Pendatang', 'PINDAH': 'Pindah', 'MENINGGAL': 'Meninggal' },
  kewarganegaraan: { 'WNI': 'WNI', 'WNA': 'WNA' },
  disabilitas: {
    'FISIK': 'Fisik', 'NETRA': 'Netra', 'RUNGU': 'Rungu', 'WICARA': 'Wicara',
    'MENTAL': 'Mental', 'INTELEKTUAL': 'Intelektual', 'LAINNYA': 'Lainnya',
  },
  jenisKelamin: {
    'LAKI_LAKI': 'Laki-laki',
    'PEREMPUAN': 'Perempuan',
  },
  statusKTP: {
    'BELUM_BUAT': 'Belum Buat',
    'SUDAH_BUAT': 'Sudah Buat',
    'HILANG': 'Hilang',
    'DALAM_PROSES': 'Dalam Proses',
  },
  hubunganKeluarga: {
    'KEPALA_KELUARGA': 'Kepala Keluarga',
    'ISTRI': 'Istri',
    'SUAMI': 'Suami',
    'ANAK': 'Anak',
    'ANAK_TIRI': 'Anak Tiri',
    'ANAK_ANGKAT': 'Anak Angkat',
    'CUCU': 'Cucu',
    'KAKEK': 'Kakek',
    'NENEK': 'Nenek',
    'ORANG_TUA': 'Orang Tua',
    'MERTUA': 'Mertua',
    'MENANTU': 'Menantu',
    'FAMILI_LAIN': 'Famili Lain',
    'PEMBANTU': 'Pembantu',
    'LAINNYA': 'Lainnya',
  },
  statusAnak: {
    'BUKAN_YATIM_PIATU': 'Bukan Yatim Piatu',
    'YATIM': 'Yatim',
    'PIATU': 'Piatu',
    'YATIM_PIATU': 'Yatim Piatu',
  },
};

function mapLabel(category: string, value: string): string {
  const mapper = LABEL_MAP[category] || LABEL_MAP[CATEGORY_FIELD[category]];
  if (mapper && mapper[value]) return mapper[value];
  return value;
}

export async function GET(request: NextRequest) {
  try {
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
    const dusunId = searchParams.get('dusunId') || '';
    const rwId = searchParams.get('rwId') || '';
    const rtId = searchParams.get('rtId') || '';

    if (!category || category === 'per-wilayah') {
      return NextResponse.json({ success: false, error: 'Kategori tidak valid' }, { status: 400 });
    }

    // Sanitize IDs
    const sanitizeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '');

    // Build WHERE conditions
    const conditions: string[] = ['p.isActive = 1'];
    if (desaAccess.desaId) conditions.push(`p.desaId = '${sanitizeId(desaAccess.desaId)}'`);
    if (dusunId) conditions.push(`d.id = '${sanitizeId(dusunId)}'`);
    if (rwId) conditions.push(`rw.id = '${sanitizeId(rwId)}'`);
    if (rtId) conditions.push(`rt.id = '${sanitizeId(rtId)}'`);
    if (category !== 'status') conditions.push("p.status = 'TETAP'");
    const whereSQL = conditions.join(' AND ');

    let sql: string;

    // For disabilitas, exclude TIDAK_ADA
    if (category === 'disabilitas') {
      const field = 'jenisDisabilitas';
      sql = `
        SELECT
          COALESCE(d.id, '__none__') as dusunId,
          COALESCE(d.nama, 'Belum diatur') as dusunNama,
          COALESCE(rw.id, '') as rwId,
          COALESCE(rw.nomor, '') as rwNomor,
          COALESCE(rt.id, '') as rtId,
          COALESCE(rt.nomor, '') as rtNomor,
          p.${field} as categoryValue,
          SUM(CASE WHEN p.jenisKelamin = 'LAKI_LAKI' THEN 1 ELSE 0 END) as lakiLaki,
          SUM(CASE WHEN p.jenisKelamin = 'PEREMPUAN' THEN 1 ELSE 0 END) as perempuan,
          COUNT(*) as total
        FROM Penduduk p
        LEFT JOIN KK kk ON p.kkId = kk.id
        LEFT JOIN RT rt ON kk.rtId = rt.id
        LEFT JOIN RW rw ON rt.rwId = rw.id
        LEFT JOIN Dusun d ON kk.dusunId = d.id
        WHERE ${whereSQL} AND p.${field} IS NOT NULL AND p.${field} != 'TIDAK_ADA'
        GROUP BY COALESCE(kk.dusunId, '__none__'), COALESCE(rt.id, ''), COALESCE(rw.id, ''), p.${field}
        ORDER BY COUNT(*) DESC, d.nama, rw.nomor, rt.nomor
      `;
    } else if (category === 'kelompok-umur') {
      const ageExpr = `CAST((julianday('now') - julianday(datetime(p.tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER)`;
      const caseSQL = `
        CASE
          WHEN p.tanggalLahir IS NULL THEN 'Tidak diketahui'
          WHEN ${ageExpr} < 5 THEN '0-4'
          WHEN ${ageExpr} < 10 THEN '5-9'
          WHEN ${ageExpr} < 15 THEN '10-14'
          WHEN ${ageExpr} < 20 THEN '15-19'
          WHEN ${ageExpr} < 25 THEN '20-24'
          WHEN ${ageExpr} < 30 THEN '25-29'
          WHEN ${ageExpr} < 35 THEN '30-34'
          WHEN ${ageExpr} < 40 THEN '35-39'
          WHEN ${ageExpr} < 45 THEN '40-44'
          WHEN ${ageExpr} < 50 THEN '45-49'
          WHEN ${ageExpr} < 55 THEN '50-54'
          WHEN ${ageExpr} < 60 THEN '55-59'
          WHEN ${ageExpr} < 65 THEN '60-64'
          WHEN ${ageExpr} < 70 THEN '65-69'
          WHEN ${ageExpr} < 75 THEN '70-74'
          ELSE '75+'
        END`;
      const sortSQL = `
        CASE
          WHEN p.tanggalLahir IS NULL THEN 99
          WHEN ${ageExpr} < 5 THEN 0
          WHEN ${ageExpr} < 10 THEN 1
          WHEN ${ageExpr} < 15 THEN 2
          WHEN ${ageExpr} < 20 THEN 3
          WHEN ${ageExpr} < 25 THEN 4
          WHEN ${ageExpr} < 30 THEN 5
          WHEN ${ageExpr} < 35 THEN 6
          WHEN ${ageExpr} < 40 THEN 7
          WHEN ${ageExpr} < 45 THEN 8
          WHEN ${ageExpr} < 50 THEN 9
          WHEN ${ageExpr} < 55 THEN 10
          WHEN ${ageExpr} < 60 THEN 11
          WHEN ${ageExpr} < 65 THEN 12
          WHEN ${ageExpr} < 70 THEN 13
          WHEN ${ageExpr} < 75 THEN 14
          ELSE 15
        END`;
      sql = `
        SELECT
          COALESCE(d.id, '__none__') as dusunId,
          COALESCE(d.nama, 'Belum diatur') as dusunNama,
          COALESCE(rw.id, '') as rwId,
          COALESCE(rw.nomor, '') as rwNomor,
          COALESCE(rt.id, '') as rtId,
          COALESCE(rt.nomor, '') as rtNomor,
          ${caseSQL} as categoryValue,
          SUM(CASE WHEN p.jenisKelamin = 'LAKI_LAKI' THEN 1 ELSE 0 END) as lakiLaki,
          SUM(CASE WHEN p.jenisKelamin = 'PEREMPUAN' THEN 1 ELSE 0 END) as perempuan,
          COUNT(*) as total
        FROM Penduduk p
        LEFT JOIN KK kk ON p.kkId = kk.id
        LEFT JOIN RT rt ON kk.rtId = rt.id
        LEFT JOIN RW rw ON rt.rwId = rw.id
        LEFT JOIN Dusun d ON kk.dusunId = d.id
        WHERE ${whereSQL} AND p.tanggalLahir IS NOT NULL
        GROUP BY COALESCE(kk.dusunId, '__none__'), COALESCE(rt.id, ''), COALESCE(rw.id, ''),
          ${sortSQL}
        ORDER BY MIN(${sortSQL}), d.nama, rw.nomor, rt.nomor
      `;
    } else if (category === 'umurProduktif') {
      const ageExpr = `CAST((julianday('now') - julianday(datetime(p.tanggalLahir / 1000, 'unixepoch'))) / 365.25 AS INTEGER)`;
      sql = `
        SELECT
          COALESCE(d.id, '__none__') as dusunId,
          COALESCE(d.nama, 'Belum diatur') as dusunNama,
          COALESCE(rw.id, '') as rwId,
          COALESCE(rw.nomor, '') as rwNomor,
          COALESCE(rt.id, '') as rtId,
          COALESCE(rt.nomor, '') as rtNomor,
          CASE
            WHEN p.tanggalLahir IS NULL THEN 'Tidak diketahui'
            WHEN ${ageExpr} <= 5 THEN 'Balita (0-5)'
            WHEN ${ageExpr} <= 14 THEN 'Anak-anak (6-14)'
            WHEN ${ageExpr} <= 24 THEN 'Remaja (15-24)'
            WHEN ${ageExpr} <= 64 THEN 'Dewasa Produktif (25-64)'
            ELSE 'Lansia (65+)'
          END as categoryValue,
          SUM(CASE WHEN p.jenisKelamin = 'LAKI_LAKI' THEN 1 ELSE 0 END) as lakiLaki,
          SUM(CASE WHEN p.jenisKelamin = 'PEREMPUAN' THEN 1 ELSE 0 END) as perempuan,
          COUNT(*) as total
        FROM Penduduk p
        LEFT JOIN KK kk ON p.kkId = kk.id
        LEFT JOIN RT rt ON kk.rtId = rt.id
        LEFT JOIN RW rw ON rt.rwId = rw.id
        LEFT JOIN Dusun d ON kk.dusunId = d.id
        WHERE ${whereSQL}
        GROUP BY COALESCE(kk.dusunId, '__none__'), COALESCE(rt.id, ''), COALESCE(rw.id, ''),
          CASE
            WHEN p.tanggalLahir IS NULL THEN 99
            WHEN ${ageExpr} <= 5 THEN 0
            WHEN ${ageExpr} <= 14 THEN 1
            WHEN ${ageExpr} <= 24 THEN 2
            WHEN ${ageExpr} <= 64 THEN 3
            ELSE 4
          END
        ORDER BY MIN(CASE
            WHEN p.tanggalLahir IS NULL THEN 99
            WHEN ${ageExpr} <= 5 THEN 0
            WHEN ${ageExpr} <= 14 THEN 1
            WHEN ${ageExpr} <= 24 THEN 2
            WHEN ${ageExpr} <= 64 THEN 3
            ELSE 4
          END), d.nama, rw.nomor, rt.nomor
      `;
    } else if (category === 'status') {
      sql = `
        SELECT
          COALESCE(d.id, '__none__') as dusunId,
          COALESCE(d.nama, 'Belum diatur') as dusunNama,
          COALESCE(rw.id, '') as rwId,
          COALESCE(rw.nomor, '') as rwNomor,
          COALESCE(rt.id, '') as rtId,
          COALESCE(rt.nomor, '') as rtNomor,
          p.status as categoryValue,
          SUM(CASE WHEN p.jenisKelamin = 'LAKI_LAKI' THEN 1 ELSE 0 END) as lakiLaki,
          SUM(CASE WHEN p.jenisKelamin = 'PEREMPUAN' THEN 1 ELSE 0 END) as perempuan,
          COUNT(*) as total
        FROM Penduduk p
        LEFT JOIN KK kk ON p.kkId = kk.id
        LEFT JOIN RT rt ON kk.rtId = rt.id
        LEFT JOIN RW rw ON rt.rwId = rw.id
        LEFT JOIN Dusun d ON kk.dusunId = d.id
        WHERE ${whereSQL}
        GROUP BY COALESCE(kk.dusunId, '__none__'), COALESCE(rt.id, ''), COALESCE(rw.id, ''), p.status
        ORDER BY COUNT(*) DESC, d.nama, rw.nomor, rt.nomor
      `;
    } else {
      const field = CATEGORY_FIELD[category];
      if (!field) {
        return NextResponse.json({ success: false, error: 'Kategori tidak valid' }, { status: 400 });
      }
      sql = `
        SELECT
          COALESCE(d.id, '__none__') as dusunId,
          COALESCE(d.nama, 'Belum diatur') as dusunNama,
          COALESCE(rw.id, '') as rwId,
          COALESCE(rw.nomor, '') as rwNomor,
          COALESCE(rt.id, '') as rtId,
          COALESCE(rt.nomor, '') as rtNomor,
          p.${field} as categoryValue,
          SUM(CASE WHEN p.jenisKelamin = 'LAKI_LAKI' THEN 1 ELSE 0 END) as lakiLaki,
          SUM(CASE WHEN p.jenisKelamin = 'PEREMPUAN' THEN 1 ELSE 0 END) as perempuan,
          COUNT(*) as total
        FROM Penduduk p
        LEFT JOIN KK kk ON p.kkId = kk.id
        LEFT JOIN RT rt ON kk.rtId = rt.id
        LEFT JOIN RW rw ON rt.rwId = rw.id
        LEFT JOIN Dusun d ON kk.dusunId = d.id
        WHERE ${whereSQL} AND p.${field} IS NOT NULL
        GROUP BY COALESCE(kk.dusunId, '__none__'), COALESCE(rt.id, ''), COALESCE(rw.id, ''), p.${field}
        ORDER BY COUNT(*) DESC, d.nama, rw.nomor, rt.nomor
      `;
    }

    const rawRows = await db.$queryRawUnsafe<any[]>(sql);

    // Convert BigInt to Number for JSON serialization
    const rows = rawRows.map((r: any) => ({
      ...r,
      lakiLaki: Number(r.lakiLaki),
      perempuan: Number(r.perempuan),
      total: Number(r.total),
    }));

    // Aggregate into hierarchical structure
    const catMap = new Map<string, {
      name: string; lakiLaki: number; perempuan: number; total: number;
      dusunMap: Map<string, {
        dusunId: string; dusunNama: string; lakiLaki: number; perempuan: number; total: number;
        rwMap: Map<string, {
          rwId: string; rwNomor: string; lakiLaki: number; perempuan: number; total: number;
          rtList: { rtId: string; rtNomor: string; lakiLaki: number; perempuan: number; total: number; negaraList?: { negara: string; count: number }[] }[];
        }>;
      }>;
    }>();

    for (const row of rows) {
      const rawVal = row.categoryValue || 'Tidak diisi';
      const catLabel = mapLabel(category, rawVal);

      if (!catMap.has(catLabel)) {
        catMap.set(catLabel, { name: catLabel, lakiLaki: 0, perempuan: 0, total: 0, dusunMap: new Map() });
      }
      const cat = catMap.get(catLabel)!;
      cat.lakiLaki += row.lakiLaki;
      cat.perempuan += row.perempuan;
      cat.total += row.total;

      const dKey = row.dusunId;
      if (!cat.dusunMap.has(dKey)) {
        cat.dusunMap.set(dKey, {
          dusunId: dKey === '__none__' ? '' : dKey, dusunNama: row.dusunNama,
          lakiLaki: 0, perempuan: 0, total: 0, rwMap: new Map(),
        });
      }
      const dusun = cat.dusunMap.get(dKey)!;
      dusun.lakiLaki += row.lakiLaki;
      dusun.perempuan += row.perempuan;
      dusun.total += row.total;

      if (!row.rwId) continue;

      if (!dusun.rwMap.has(row.rwId)) {
        dusun.rwMap.set(row.rwId, {
          rwId: row.rwId, rwNomor: row.rwNomor,
          lakiLaki: 0, perempuan: 0, total: 0, rtList: [],
        });
      }
      const rw = dusun.rwMap.get(row.rwId)!;
      rw.lakiLaki += row.lakiLaki;
      rw.perempuan += row.perempuan;
      rw.total += row.total;

      if (row.rtId) {
        rw.rtList.push({
          rtId: row.rtId, rtNomor: row.rtNomor,
          lakiLaki: row.lakiLaki, perempuan: row.perempuan, total: row.total,
        });
      }
    }

    // Build response
    const grandTotal = { lakiLaki: 0, perempuan: 0, total: 0 };
    const items = Array.from(catMap.values()).map(cat => {
      grandTotal.lakiLaki += cat.lakiLaki;
      grandTotal.perempuan += cat.perempuan;
      grandTotal.total += cat.total;
      return {
        name: cat.name,
        lakiLaki: cat.lakiLaki,
        perempuan: cat.perempuan,
        total: cat.total,
        percentage: 0,
        dusunList: Array.from(cat.dusunMap.values()).map(d => ({
          dusunId: d.dusunId, dusunNama: d.dusunNama,
          lakiLaki: d.lakiLaki, perempuan: d.perempuan, total: d.total,
          rwList: Array.from(d.rwMap.values())
            .sort((a, b) => a.rwNomor.localeCompare(b.rwNomor, undefined, { numeric: true }))
            .map(rw => ({
              rwId: rw.rwId, rwNomor: rw.rwNomor,
              lakiLaki: rw.lakiLaki, perempuan: rw.perempuan, total: rw.total,
              rtList: rw.rtList.sort((a, b) => a.rtNomor.localeCompare(b.rtNomor, undefined, { numeric: true })),
            })),
        })).sort((a, b) => a.dusunNama.localeCompare(b.dusunNama)),
      };
    });

    // Sort items by hierarchy order for specific categories, otherwise by count desc
    if (category === 'pendidikan') {
      items.sort((a, b) => PENDIDIKAN_ORDER.indexOf(a.name) - PENDIDIKAN_ORDER.indexOf(b.name));
    } else if (category === 'perkawinan') {
      items.sort((a, b) => PERKAWINAN_ORDER.indexOf(a.name) - PERKAWINAN_ORDER.indexOf(b.name));
    } else if (category === 'umurProduktif') {
      items.sort((a, b) => UMUR_PRODUKTIF_ORDER.indexOf(a.name) - UMUR_PRODUKTIF_ORDER.indexOf(b.name));
    } else if (category === 'kelompok-umur') {
      items.sort((a, b) => KELOMPOK_UMUR_ORDER.indexOf(a.name) - KELOMPOK_UMUR_ORDER.indexOf(b.name));
    } else if (category === 'jenis-kelamin') {
      items.sort((a, b) => JENIS_KELAMIN_ORDER.indexOf(a.name) - JENIS_KELAMIN_ORDER.indexOf(b.name));
    } else if (category === 'status-ktp') {
      items.sort((a, b) => STATUS_KTP_ORDER.indexOf(a.name) - STATUS_KTP_ORDER.indexOf(b.name));
    } else if (category === 'hubungan-keluarga') {
      items.sort((a, b) => HUBUNGAN_KELUARGA_ORDER.indexOf(a.name) - HUBUNGAN_KELUARGA_ORDER.indexOf(b.name));
    } else if (category === 'status-anak') {
      items.sort((a, b) => STATUS_ANAK_ORDER.indexOf(a.name) - STATUS_ANAK_ORDER.indexOf(b.name));
    } else {
      items.sort((a, b) => b.total - a.total);
    }

    // Calculate percentages
    for (const item of items) {
      item.percentage = grandTotal.total > 0
        ? Math.round((item.total / grandTotal.total) * 1000) / 10
        : 0;
    }

    // For kewarganegaraan: add WNA negara asal per RT
    if (category === 'kewarganegaraan') {
      const wnaItem = items.find(i => i.name === 'WNA');
      if (wnaItem && wnaItem.total > 0) {
        const negaraSql = `
          SELECT COALESCE(rt.id, '') as rtId, p.negaraAsal as negaraAsal, COUNT(*) as total
          FROM Penduduk p
          LEFT JOIN KK kk ON p.kkId = kk.id
          LEFT JOIN RT rt ON kk.rtId = rt.id
          LEFT JOIN RW rw ON rt.rwId = rw.id
          LEFT JOIN Dusun d ON kk.dusunId = d.id
          WHERE ${whereSQL} AND p.kewarganegaraan = 'WNA' AND p.negaraAsal IS NOT NULL
          GROUP BY COALESCE(rt.id, ''), p.negaraAsal
          ORDER BY COUNT(*) DESC
        `;
        const negaraRows = await db.$queryRawUnsafe<{ rtId: string; negaraAsal: string; total: bigint }[]>(negaraSql);

        // Build map: rtId → [{ negara, count }]
        const negaraByRT = new Map<string, { negara: string; count: number }[]>();
        for (const r of negaraRows) {
          const rtId = r.rtId || '';
          if (!negaraByRT.has(rtId)) negaraByRT.set(rtId, []);
          negaraByRT.get(rtId)!.push({ negara: r.negaraAsal, count: Number(r.total) });
        }

        // Inject into WNA item's RT entries
        for (const dusun of wnaItem.dusunList) {
          for (const rw of dusun.rwList) {
            for (const rt of rw.rtList) {
              rt.negaraList = negaraByRT.get(rt.rtId) || [];
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: { items, grandTotal } });
  } catch (error) {
    console.error('Error fetching wilayah detail stats:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data statistik wilayah' },
      { status: 500 },
    );
  }
}
