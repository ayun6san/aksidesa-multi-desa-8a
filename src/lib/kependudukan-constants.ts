// ==================== STANDAR DISDUKCAPIL (SIAK) ====================
// Berdasarkan Permendagri Nomor 109 Tahun 2019

// ==================== PEKERJAAN (99 Jenis) ====================

export interface PekerjaanGroup {
  group: string;
  items: string[];
}

export const pekerjaanGroups: PekerjaanGroup[] = [
  {
    group: 'Umum',
    items: [
      'Belum/Tidak Bekerja',
      'Mengurus Rumah Tangga',
      'Pelajar/Mahasiswa',
      'Pensiunan',
    ],
  },
  {
    group: 'Pemerintahan & Keamanan',
    items: [
      'Pegawai Negeri Sipil',
      'Tentara Nasional Indonesia',
      'Kepolisian RI',
      'Perangkat Desa',
      'Kepala Desa',
    ],
  },
  {
    group: 'Pegawai & Karyawan',
    items: [
      'Karyawan Swasta',
      'Karyawan BUMN',
      'Karyawan BUMD',
      'Karyawan Honorer',
    ],
  },
  {
    group: 'Pertanian & Perikanan',
    items: [
      'Petani/Pekebun',
      'Peternak',
      'Nelayan/Perikanan',
      'Buruh Tani/Perkebunan',
      'Buruh Nelayan/Perikanan',
      'Buruh Peternakan',
    ],
  },
  {
    group: 'Perdagangan & Jasa',
    items: [
      'Pedagang',
      'Wiraswasta',
      'Pengacara',
      'Notaris',
      'Arsitek',
      'Akuntan',
      'Konsultan',
      'Dokter',
      'Bidan',
      'Perawat',
      'Apoteker',
      'Psikiater/Psikolog',
      'Peneliti',
    ],
  },
  {
    group: 'Pendidikan & Agama',
    items: [
      'Dosen',
      'Guru',
      'Imam Masjid',
      'Pendeta',
      'Pastur',
      'Ustadz/Mubaligh',
      'Biarawati',
    ],
  },
  {
    group: 'Transportasi & Industri',
    items: [
      'Industri',
      'Konstruksi',
      'Transportasi',
      'Sopir',
      'Pelaut',
      'Pilot',
      'Mekanik',
    ],
  },
  {
    group: 'Pekerjaan Informal & Buruh',
    items: [
      'Buruh Harian Lepas',
      'Pembantu Rumah Tangga',
      'Juru Masak',
    ],
  },
  {
    group: 'Tukang & Keahlian Teknis',
    items: [
      'Tukang Cukur',
      'Tukang Listrik',
      'Tukang Batu',
      'Tukang Kayu',
      'Tukang Sol Sepatu',
      'Tukang Las/Pandai Besi',
      'Tukang Jahit',
      'Tukang Gigi',
      'Penata Rambut',
      'Penata Rias',
      'Penata Busana',
      'Perancang Busana',
      'Teknisi',
      'Operator',
      'Pekerja Pengolahan/Kerajinan',
    ],
  },
  {
    group: 'Seni & Media',
    items: [
      'Seniman',
      'Artis',
      'Atlet',
      'Chef',
      'Wartawan',
      'Penyiar Televisi',
      'Penyiar Radio',
      'Promotor Acara',
      'Penerjemah',
    ],
  },
  {
    group: 'Lainnya',
    items: [
      'Tabib',
      'Paraji',
      'Paranormal',
      'Pialang',
      'Manajer',
      'Tenaga Tata Usaha',
      'Asisten Ahli',
      'Anggota Lembaga Tinggi',
      'Lainnya',
    ],
  },
  {
    group: 'Pejabat Negara & DPR',
    items: [
      'Presiden',
      'Wakil Presiden',
      'Anggota Mahkamah Konstitusi',
      'Anggota Kabinet/Kementerian',
      'Duta Besar',
      'Gubernur',
      'Wakil Gubernur',
      'Bupati',
      'Wakil Bupati',
      'Walikota',
      'Wakil Walikota',
      'Anggota DPR-RI',
      'Anggota DPD',
      'Anggota BPK',
      'Anggota DPRD Provinsi',
      'Anggota DPRD Kabupaten/Kota',
    ],
  },
];

// Flat list for simple usage
export const pekerjaanOptions: string[] = pekerjaanGroups.flatMap(g => g.items);

// ==================== PENDIDIKAN TERAKHIR (10 Jenis) ====================

export const pendidikanOptions: string[] = [
  'Tidak/Belum Sekolah',
  'SD/Sederajat',
  'SMP/Sederajat',
  'SMA/Sederajat',
  'D1',
  'D2',
  'D3',
  'D4/S1',
  'S2',
  'S3',
];

// ==================== HUBUNGAN KELUARGA (15 Jenis) ====================

export const hubunganKeluargaOptions: string[] = [
  'Kepala Keluarga',
  'Suami',
  'Istri',
  'Anak',
  'Anak Tiri',
  'Anak Angkat',
  'Menantu',
  'Cucu',
  'Kakek',
  'Nenek',
  'Orang Tua',
  'Mertua',
  'Famili Lain',
  'Pembantu',
  'Lainnya',
];

// Hubungan Keluarga: Label -> Enum mapping
export const hubunganKeluargaToEnum: Record<string, string> = {
  'Kepala Keluarga': 'KEPALA_KELUARGA',
  'Suami': 'SUAMI',
  'Istri': 'ISTRI',
  'Anak': 'ANAK',
  'Anak Tiri': 'ANAK_TIRI',
  'Anak Angkat': 'ANAK_ANGKAT',
  'Menantu': 'MENANTU',
  'Cucu': 'CUCU',
  'Kakek': 'KAKEK',
  'Nenek': 'NENEK',
  'Orang Tua': 'ORANG_TUA',
  'Mertua': 'MERTUA',
  'Famili Lain': 'FAMILI_LAIN',
  'Pembantu': 'PEMBANTU',
  'Lainnya': 'LAINNYA',
};

// Enum -> Label mapping
export const enumToHubunganKeluarga: Record<string, string> = Object.fromEntries(
  Object.entries(hubunganKeluargaToEnum).map(([k, v]) => [v, k])
);

// ==================== GOLONGAN DARAH ====================

export const golonganDarahOptions = ['TIDAK_TAHU', 'A', 'B', 'AB', 'O'];
export const golonganDarahLabels: Record<string, string> = {
  'TIDAK_TAHU': 'Tidak Tahu',
  'A': 'A',
  'B': 'B',
  'AB': 'AB',
  'O': 'O',
};

// ==================== AGAMA ====================

export const agamaOptions = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA'];

// ==================== STATUS PERKAWINAN ====================

export const statusPerkawinanOptions = [
  'BELUM_KAWIN',
  'KAWIN_TERCATAT',
  'KAWIN_TIDAK_TERCATAT',
  'CERAI_HIDUP_TERCATAT',
  'CERAI_HIDUP_TIDAK_TERCATAT',
  'CERAI_MATI',
];

export const statusPerkawinanLabels: Record<string, string> = {
  'BELUM_KAWIN': 'Belum Kawin',
  'KAWIN_TERCATAT': 'Kawin Tercatat',
  'KAWIN_TIDAK_TERCATAT': 'Kawin Tidak Tercatat',
  'CERAI_HIDUP_TERCATAT': 'Cerai Hidup Tercatat',
  'CERAI_HIDUP_TIDAK_TERCATAT': 'Cerai Hidup Tidak Tercatat',
  'CERAI_MATI': 'Cerai Mati',
};

// ==================== PENGHASILAN ====================

export const penghasilanOptions = [
  'Tidak Ada',
  '< 500.000',
  '500.000 - 1.000.000',
  '1.000.000 - 2.500.000',
  '2.500.000 - 5.000.000',
  '5.000.000 - 10.000.000',
  '> 10.000.000',
];

// ==================== STATUS KTP ====================

export const statusKTPOptions = ['BELUM_BUAT', 'SUDAH_BUAT', 'HILANG', 'DALAM_PROSES'];

// ==================== STATUS PENDUDUK ====================

export const statusPendudukOptions = ['TETAP', 'PENDATANG', 'PINDAH', 'MENINGGAL'];

// ==================== DISABILITAS ====================

export const disabilitasOptions = ['TIDAK_ADA', 'FISIK', 'NETRA', 'RUNGU', 'WICARA', 'MENTAL', 'INTELEKTUAL', 'LAINNYA'];

// ==================== JENIS KELAMIN ====================

export const jenisKelaminOptions = [
  { value: 'LAKI_LAKI', label: 'Laki-laki' },
  { value: 'PEREMPUAN', label: 'Perempuan' },
];

// ==================== KEWARGANEGARAAN ====================

export const kewarganegaraanOptions = [
  { value: 'WNI', label: 'WNI' },
  { value: 'WNA', label: 'WNA' },
];
