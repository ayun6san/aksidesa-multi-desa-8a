/**
 * Seed script: 36 jenis surat for all 8 desa
 * 
 * Total records: 36 surat jenis × 8 desa = 288 records
 * 
 * Run: cd /home/z/my-project && bun run scripts/seed-surat-jenis.ts
 */

import { PrismaClient, KategoriSurat, TingkatApproval } from '@prisma/client'

const prisma = new PrismaClient()

// Desa IDs - will be populated dynamically from database
let DESA_IDS: string[] = []

// Common form fields template
const commonFieldTemplate = JSON.stringify({
  fields: [
    { key: 'nomorSurat', label: 'Nomor Surat', type: 'auto', required: true },
    { key: 'perihal', label: 'Perihal', type: 'text', required: true },
    { key: 'namaPemohon', label: 'Nama Pemohon', type: 'auto', required: true },
    { key: 'nik', label: 'NIK', type: 'auto', required: true },
    { key: 'tempatTanggalLahir', label: 'Tempat, Tanggal Lahir', type: 'auto', required: true },
    { key: 'jenisKelamin', label: 'Jenis Kelamin', type: 'auto', required: true },
    { key: 'agama', label: 'Agama', type: 'auto', required: true },
    { key: 'pekerjaan', label: 'Pekerjaan', type: 'auto', required: true },
    { key: 'alamat', label: 'Alamat', type: 'auto', required: true },
    { key: 'rt', label: 'RT', type: 'auto', required: true },
    { key: 'rw', label: 'RW', type: 'auto', required: true },
    { key: 'dusun', label: 'Dusun', type: 'auto', required: true },
    { key: 'keperluan', label: 'Keperluan', type: 'textarea', required: false },
    { key: 'keterangan', label: 'Keterangan Tambahan', type: 'textarea', required: false },
  ],
})

interface SuratJenisDef {
  kode: string
  nama: string
  kategori: KategoriSurat
  tingkatApproval: TingkatApproval
  deskripsi: string
  persyaratan: string[]
  urutan: number
}

const SURAT_JENIS_DEFINITIONS: SuratJenisDef[] = [
  // ===== KEPENDUDUKAN (7) =====
  {
    kode: 'DOMISILI',
    nama: 'Keterangan Domisili',
    kategori: 'KEPENDUDUKAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan domisili untuk keperluan administrasi',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Pengantar RT/RW'],
    urutan: 1,
  },
  {
    kode: 'PINDAH',
    nama: 'Keterangan Pindah Penduduk',
    kategori: 'KEPENDUDUKAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan pindah penduduk antar desa/kota/kabupaten',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Pengantar RT/RW', 'Pas Foto 3x4 (2 lembar)'],
    urutan: 2,
  },
  {
    kode: 'KELAHIRAN',
    nama: 'Keterangan Kelahiran',
    kategori: 'KEPENDUDUKAN',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan kelahiran dari desa',
    persyaratan: ['Fotokopi KTP Ayah', 'Fotokopi KTP Ibu', 'Fotokopi Kartu Keluarga', 'Surat Keterangan Rumah Sakit/Bidan'],
    urutan: 3,
  },
  {
    kode: 'KEMATIAN',
    nama: 'Keterangan Kematian',
    kategori: 'KEPENDUDUKAN',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan kematian warga desa',
    persyaratan: ['Fotokopi KTP Almarhum/Almarhumah', 'Fotokopi Kartu Keluarga', 'Surat Keterangan Rumah Sakit/RSUD'],
    urutan: 4,
  },
  {
    kode: 'BEDA_IDENTITAS',
    nama: 'Keterangan Beda Identitas',
    kategori: 'KEPENDUDUKAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan perbedaan data identitas dengan dokumen kependudukan',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Akta Kelahiran', 'Surat Pengantar RT/RW'],
    urutan: 5,
  },
  {
    kode: 'BELUM_MENIKAH',
    nama: 'Keterangan Belum Menikah',
    kategori: 'KEPENDUDUKAN',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan belum menikah untuk keperluan pernikahan atau administrasi lainnya',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Pengantar RT/RW'],
    urutan: 6,
  },
  {
    kode: 'NAMAKAN_ANAK',
    nama: 'Keterangan Pergantian Nama Anak',
    kategori: 'KEPENDUDUKAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan pergantian nama anak',
    persyaratan: ['Fotokopi KTP Orang Tua', 'Fotokopi Kartu Keluarga', 'Akta Kelahiran', 'Surat Pengantar RT/RW'],
    urutan: 7,
  },

  // ===== PENGANTAR (5) =====
  {
    kode: 'SKCK',
    nama: 'Pengantar Surat Keterangan Catatan Kepolisian',
    kategori: 'PENGANTAR',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat pengantar untuk pembuatan SKCK di kepolisian',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Pas Foto 4x6 (6 lembar)', 'Surat Pengantar RT/RW'],
    urutan: 8,
  },
  {
    kode: 'NIKAH',
    nama: 'Pengantar Nikah',
    kategori: 'PENGANTAR',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat pengantar untuk melangsungkan pernikahan di KUA',
    persyaratan: ['Fotokopi KTP Calon Suami', 'Fotokopi KTP Calon Istri', 'Fotokopi Kartu Keluarga Kedua Calon', 'Surat Keterangan Belum Menikah', 'Pas Foto 2x3 (4 lembar)', 'Ijazah Terakhir'],
    urutan: 9,
  },
  {
    kode: 'RUJUKAN_KES',
    nama: 'Pengantar Rujukan Kesehatan',
    kategori: 'PENGANTAR',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat pengantar rujukan kesehatan ke puskesmas/rumah sakit',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Keterangan Dokter Puskesmas'],
    urutan: 10,
  },
  {
    kode: 'KTP',
    nama: 'Pengantar Pembuatan KTP',
    kategori: 'PENGANTAR',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat pengantar untuk pembuatan atau perpanjangan KTP di kecamatan',
    persyaratan: ['Fotokopi Kartu Keluarga', 'Surat Pengantar RT/RW', 'Akta Kelahiran/Ijazah'],
    urutan: 11,
  },
  {
    kode: 'PASSPORT',
    nama: 'Pengantar Pembuatan Paspor',
    kategori: 'PENGANTAR',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat pengantar untuk pembuatan paspor di kantor imigrasi',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Akta Kelahiran', 'Ijazah Terakhir', 'Surat Izin Orang Tua (untuk yang belum 17 tahun)', 'Pas Foto 4x6 (4 lembar)'],
    urutan: 12,
  },

  // ===== KETERANGAN (10) =====
  {
    kode: 'SKTM',
    nama: 'Surat Keterangan Tidak Mampu',
    kategori: 'KETERANGAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan tidak mampu secara ekonomi untuk keperluan bantuan atau keringanan biaya',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Pengantar RT/RW', 'Surat Pernyataan Tidak Mampu'],
    urutan: 13,
  },
  {
    kode: 'USAHA',
    nama: 'Keterangan Usaha',
    kategori: 'KETERANGAN',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan usaha untuk keperluan perizinan atau pinjaman modal',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Pengantar RT/RW', 'Foto Tempat Usaha'],
    urutan: 14,
  },
  {
    kode: 'TEMPAT_USAHA',
    nama: 'Keterangan Tempat Usaha',
    kategori: 'KETERANGAN',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan tempat usaha untuk keperluan perizinan',
    persyaratan: ['Fotokopi KTP Pemilik', 'Fotokopi Kartu Keluarga', 'Foto Tempat Usaha', 'Surat Pengantar RT/RW'],
    urutan: 15,
  },
  {
    kode: 'PENGHASILAN_ORTU',
    nama: 'Keterangan Penghasilan Orang Tua',
    kategori: 'KETERANGAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan penghasilan orang tua untuk keperluan beasiswa atau keringanan biaya pendidikan',
    persyaratan: ['Fotokopi KTP Orang Tua', 'Fotokopi Kartu Keluarga', 'Slip Gaji/Surat Keterangan Penghasilan', 'Surat Pengantar RT/RW'],
    urutan: 16,
  },
  {
    kode: 'LULUS',
    nama: 'Keterangan Lulus Sekolah',
    kategori: 'KETERANGAN',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan kelulusan dari sekolah di wilayah desa',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Ijazah', 'Surat Keterangan dari Sekolah'],
    urutan: 17,
  },
  {
    kode: 'WARGA',
    nama: 'Keterangan Warga Negara Asing',
    kategori: 'KETERANGAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan untuk warga negara asing yang bertempat tinggal di wilayah desa',
    persyaratan: ['Fotokopi Paspor', 'Fotokopi KITAS/KITAP', 'Surat Pengantar RT/RW', 'Pas Foto 3x4 (2 lembar)'],
    urutan: 18,
  },
  {
    kode: 'AHLI_WARIS',
    nama: 'Keterangan Ahli Waris',
    kategori: 'KETERANGAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan ahli waris untuk keperluan waris harta peninggalan',
    persyaratan: ['Fotokopi KTP Ahli Waris', 'Fotokopi Kartu Keluarga', 'Akta Kematian Pewaris', 'Surat Pengantar RT/RW', 'Surat Pernyataan Ahli Waris'],
    urutan: 19,
  },
  {
    kode: 'LANCAR',
    nama: 'Keterangan Lancar Usaha Mikro',
    kategori: 'KETERANGAN',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan kelancaran usaha mikro untuk keperluan perbankan atau pinjaman modal',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Foto Tempat Usaha', 'Surat Pengantar RT/RW'],
    urutan: 20,
  },

  {
    kode: 'PINDAH_SEKOLAH',
    nama: 'Keterangan Pindah Sekolah',
    kategori: 'KETERANGAN',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan pindah sekolah untuk siswa yang akan berpindah ke sekolah lain',
    persyaratan: ['Fotokopi KTP Orang Tua', 'Fotokopi Kartu Keluarga', 'Surat Keterangan dari Sekolah Asal', 'Rapor Terakhir', 'Pas Foto 3x4 (2 lembar)'],
    urutan: 21,
  },
  {
    kode: 'DOMISILI_PERUSAHAAN',
    nama: 'Keterangan Domisili Perusahaan',
    kategori: 'KETERANGAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan domisili perusahaan atau badan usaha di wilayah desa',
    persyaratan: ['Fotokopi KTP Direktur/Penanggung Jawab', 'Fotokopi NPWP Perusahaan', 'Akta Pendirian Perusahaan', 'Foto Tempat Usaha', 'Surat Pengantar RT/RW'],
    urutan: 22,
  },

  // ===== PERNYATAAN (4) =====
  {
    kode: 'KEPEMILIKAN_TANAH',
    nama: 'Pernyataan Kepemilikan Tanah',
    kategori: 'PERNYATAAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat pernyataan kepemilikan tanah di wilayah desa',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Pengantar RT/RW', 'Sertifikat Tanah/Girik/Petasan'],
    urutan: 23,
  },
  {
    kode: 'HIBAH',
    nama: 'Pernyataan Hibah Tanah',
    kategori: 'PERNYATAAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat pernyataan hibah tanah kepada pihak lain',
    persyaratan: ['Fotokopi KTP Pemberi Hibah', 'Fotokopi KTP Penerima Hibah', 'Fotokopi Kartu Keluarga', 'Sertifikat Tanah/Girik/Petasan', 'Surat Pengantar RT/RW'],
    urutan: 24,
  },
  {
    kode: 'JUAL_BELI',
    nama: 'Pernyataan Jual Beli Tanah',
    kategori: 'PERNYATAAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat pernyataan jual beli tanah di wilayah desa',
    persyaratan: ['Fotokopi KTP Penjual', 'Fotokopi KTP Pembeli', 'Fotokopi Kartu Keluarga Kedua Pihak', 'Sertifikat Tanah/Girik/Petasan', 'Surat Pengantar RT/RW', 'Foto Lokasi Tanah'],
    urutan: 25,
  },
  {
    kode: 'KEASLIAN',
    nama: 'Pernyataan Keaslian Dokumen',
    kategori: 'PERNYATAAN',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat pernyataan keaslian dokumen untuk keperluan administrasi',
    persyaratan: ['Fotokopi KTP', 'Dokumen yang dinyatakan asli', 'Surat Pengantar RT/RW'],
    urutan: 26,
  },

  // ===== TANAH_PROPERTI (4) =====
  {
    kode: 'TANAH',
    nama: 'Keterangan Tanah',
    kategori: 'TANAH_PROPERTI',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan tentang status dan lokasi tanah',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Sertifikat Tanah/Girik/Petasan', 'Surat Pengantar RT/RW', 'Foto Lokasi Tanah'],
    urutan: 27,
  },
  {
    kode: 'HIBAH_TANAH',
    nama: 'Keterangan Hibah Tanah',
    kategori: 'TANAH_PROPERTI',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan hibah tanah antar pihak',
    persyaratan: ['Fotokopi KTP Pemberi Hibah', 'Fotokopi KTP Penerima Hibah', 'Fotokopi Kartu Keluarga', 'Sertifikat Tanah/Girik/Petasan', 'Surat Pengantar RT/RW'],
    urutan: 28,
  },
  {
    kode: 'JUAL_BELI_TANAH',
    nama: 'Keterangan Jual Beli Tanah',
    kategori: 'TANAH_PROPERTI',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan jual beli tanah di wilayah desa',
    persyaratan: ['Fotokopi KTP Penjual', 'Fotokopi KTP Pembeli', 'Fotokopi Kartu Keluarga Kedua Pihak', 'Sertifikat Tanah/Girik/Petasan', 'Surat Pengantar RT/RW'],
    urutan: 29,
  },
  {
    kode: 'PEMILIK_RUMAH',
    nama: 'Keterangan Pemilik Rumah',
    kategori: 'TANAH_PROPERTI',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan kepemilikan rumah di wilayah desa',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'IMB/PBG atau Surat Keterangan Lahan', 'Surat Pengantar RT/RW'],
    urutan: 30,
  },

  // ===== KEUANGAN (3) =====
  {
    kode: 'PENGHASILAN',
    nama: 'Keterangan Penghasilan',
    kategori: 'KEUANGAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan penghasilan untuk keperluan administrasi',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Slip Gaji/Surat Keterangan Penghasilan', 'Surat Pengantar RT/RW'],
    urutan: 31,
  },
  {
    kode: 'BANTUAN_SOSIAL',
    nama: 'SKTM Bantuan Sosial PKH/BPJS',
    kategori: 'KEUANGAN',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan tidak mampu untuk pengajuan bantuan sosial PKH, BPJS Kesehatan, atau bantuan lainnya',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Pengantar RT/RW', 'Surat Pernyataan Tidak Mampu'],
    urutan: 32,
  },
  {
    kode: 'USAHA_MIKRO',
    nama: 'Keterangan Usaha Mikro Kecil',
    kategori: 'KEUANGAN',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan usaha mikro kecil untuk keperluan perbankan atau pinjaman modal usaha',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Foto Tempat Usaha', 'Surat Pengantar RT/RW', 'Surat Keterangan Usaha dari Dinas Terkait (jika ada)'],
    urutan: 33,
  },

  // ===== LEMBAGA (3) =====
  {
    kode: 'BPD',
    nama: 'Keterangan dari Badan Permusyawaratan Desa',
    kategori: 'LEMBAGA',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan yang diterbitkan oleh Badan Permusyawaratan Desa (BPD)',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Pengantar RT/RW'],
    urutan: 34,
  },
  {
    kode: 'LEMBAGA_ADAT',
    nama: 'Keterangan Keanggotaan Lembaga Adat',
    kategori: 'LEMBAGA',
    tingkatApproval: 'PERLU_APPROVAL',
    deskripsi: 'Surat keterangan keanggotaan dalam lembaga adat desa',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Keterangan dari Lembaga Adat', 'Surat Pengantar RT/RW'],
    urutan: 35,
  },
  {
    kode: 'ORMAS',
    nama: 'Keterangan Keanggotaan Organisasi Masyarakat',
    kategori: 'LEMBAGA',
    tingkatApproval: 'LANGSUNG_PROSES',
    deskripsi: 'Surat keterangan keanggotaan dalam organisasi masyarakat di wilayah desa',
    persyaratan: ['Fotokopi KTP', 'Fotokopi Kartu Keluarga', 'Surat Keterangan dari Organisasi', 'Surat Pengantar RT/RW'],
    urutan: 36,
  },
]

async function main() {
  console.log('=== SEED: Surat Jenis (Letter Types) ===\n')

  // Fetch all desa dynamically
  const allDesa = await prisma.desa.findMany({
    select: { id: true, namaDesa: true },
    orderBy: { kodeDesa: 'asc' },
  })

  DESA_IDS = allDesa.map(d => d.id)

  if (DESA_IDS.length === 0) {
    console.error('ERROR: No desa found in database.')
    console.error('Please ensure desa are seeded first.')
    process.exit(1)
  }

  console.log(`Found ${DESA_IDS.length} desa in database.`)
  console.log(`Seeding ${SURAT_JENIS_DEFINITIONS.length} surat jenis per desa...`)
  console.log(`Expected total: ${SURAT_JENIS_DEFINITIONS.length * DESA_IDS.length} records\n`)

  // Clean existing data (to allow re-runs)
  console.log('Cleaning existing SuratJenis data...')
  await prisma.suratJenis.deleteMany({
    where: { desaId: { in: DESA_IDS } },
  })

  // Prepare all records
  const records: {
    kode: string
    nama: string
    kategori: KategoriSurat
    tingkatApproval: TingkatApproval
    deskripsi: string
    persyaratan: string
    fieldTemplate: string
    isActive: boolean
    urutan: number
    desaId: string
  }[] = []

  for (const desaId of DESA_IDS) {
    for (const def of SURAT_JENIS_DEFINITIONS) {
      // Prefix kode with desaId to ensure global uniqueness
      records.push({
        kode: `${desaId}/${def.kode}`,
        nama: def.nama,
        kategori: def.kategori,
        tingkatApproval: def.tingkatApproval,
        deskripsi: def.deskripsi,
        persyaratan: JSON.stringify(def.persyaratan),
        fieldTemplate: commonFieldTemplate,
        isActive: true,
        urutan: def.urutan,
        desaId,
      })
    }
  }

  // Insert in batches to avoid issues
  const BATCH_SIZE = 50
  let totalInserted = 0

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE)
    const result = await prisma.suratJenis.createMany({
      data: batch,
    })
    totalInserted += result.count
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: inserted ${result.count} records`)
  }

  console.log(`\n=== SEED COMPLETE ===`)
  console.log(`Total SuratJenis records inserted: ${totalInserted}`)
  console.log(`Expected: ${SURAT_JENIS_DEFINITIONS.length * DESA_IDS.length}`)

  // Verification
  const actualCount = await prisma.suratJenis.count({
    where: { desaId: { in: DESA_IDS } },
  })

  console.log(`Actual count in DB: ${actualCount}`)

  // Show breakdown by category
  console.log('\n--- Breakdown by Category ---')
  const categories = await prisma.suratJenis.groupBy({
    by: ['kategori'],
    where: { desaId: { in: DESA_IDS } },
    _count: { id: true },
    orderBy: { kategori: 'asc' },
  })

  for (const cat of categories) {
    const perDesa = cat._count.id / DESA_IDS.length
    console.log(`  ${cat.kategori}: ${cat._count.id} total (${perDesa} per desa)`)
  }

  // Show breakdown by desa
  console.log('\n--- Breakdown by Desa ---')
  const desaBreakdown = await prisma.suratJenis.groupBy({
    by: ['desaId'],
    where: { desaId: { in: DESA_IDS } },
    _count: { id: true },
    orderBy: { desaId: 'asc' },
  })

  const desaNameMap = new Map(allDesa.map(d => [d.id, d.namaDesa]))
  for (const desa of desaBreakdown) {
    console.log(`  ${desaNameMap.get(desa.desaId) || desa.desaId}: ${desa._count.id} records`)
  }

  // Check approval levels
  console.log('\n--- Breakdown by Approval Level ---')
  const approvalBreakdown = await prisma.suratJenis.groupBy({
    by: ['tingkatApproval'],
    where: { desaId: { in: DESA_IDS } },
    _count: { id: true },
  })

  for (const item of approvalBreakdown) {
    console.log(`  ${item.tingkatApproval}: ${item._count.id} records`)
  }

  if (totalInserted === SURAT_JENIS_DEFINITIONS.length * DESA_IDS.length) {
    console.log('\n✅ All records seeded successfully!')
  } else {
    console.log('\n⚠️  Record count mismatch! Please investigate.')
  }
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
