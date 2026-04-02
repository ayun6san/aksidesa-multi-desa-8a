import {
  User,
  Users,
  FileText,
  Heart,
} from 'lucide-react';

// ==================== TYPES ====================

export interface PendudukFormData {
  // Identitas
  nik: string;
  namaLengkap: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  golonganDarah: string;
  agama: string;
  suku: string;
  // Status Perkawinan
  statusPerkawinan: string;
  aktaPerkawinan: string;
  tanggalPerkawinan: string;
  aktaPerceraian: string;
  tanggalPerceraian: string;
  // Pekerjaan & Pendidikan
  pekerjaan: string;
  pendidikan: string;
  penghasilan: string;
  // Kewarganegaraan
  kewarganegaraan: string;
  negaraAsal: string;
  noPaspor: string;
  noKitasKitap: string;
  tanggalMasuk: string;
  // Dokumen
  noAktaKelahiran: string;
  statusKTP: string;
  noBPJSKesehatan: string;
  noBPJSTenagakerja: string;
  npwp: string;
  // Data Orang Tua
  namaAyah: string;
  nikAyah: string;
  namaIbu: string;
  nikIbu: string;
  anakKe: string;
  jumlahSaudara: string;
  // KK
  kkId: string;
  hubunganKeluarga: string;
  urutanDalamKK: number;
  // Kontak
  email: string;
  noHP: string;
  // Kesehatan
  jenisDisabilitas: string;
  keteranganDisabilitas: string;
  penyakitKronis: string;
  // Status
  status: string;
  isActive: boolean;
  // Foto
  foto: string;
  fotoKTP: string;
}

export interface WilayahOption {
  id: string;
  label: string;
  dusunId: string;
}

export interface KKInfo {
  id: string;
  nomorKK: string;
  kepalaKeluarga: string;
  alamat: string;
  rt: string;
  rw: string;
  dusun: string;
  jumlahAnggota: number;
}

export interface KKOption {
  id: string;
  nomorKK: string;
  kepalaKeluarga: string;
  alamat: string;
  rt: string;
  rw: string;
  dusun: string;
  jumlahAnggota: number;
}

export interface EditingPendudukKK {
  nomorKK?: string;
}

export interface KKSearchResult {
  id: string;
  nomorKK: string;
  kepalaKeluarga: string;
  alamat: string;
  rt: string;
  rw: string;
  dusun: string;
  jumlahAnggota: number;
}

// Props
export interface FormPendudukUnifiedProps {
  // Mode
  mode: 'tambah' | 'edit' | 'anggota-kk' | 'penduduk-baru';
  // Layout
  layout?: 'full-page' | 'modal';
  // KK Context (untuk mode anggota-kk)
  kkInfo?: KKInfo | null;
  // KK Options (untuk mode edit)
  kkOptions?: KKOption[];
  // Editing data
  editingPenduduk?: PendudukFormData & { id: string; nomorKK?: string } | null;
  // Wilayah options
  wilayahOptions: WilayahOption[];
  // Callbacks
  onBack: () => void;
  onSubmit: (data: PendudukFormData, kkBaru?: { nomorKK: string; alamat: string; rtId: string; dusunId: string } | null) => Promise<void>;
  // Loading state
  loading?: boolean;
}

// ==================== HELPER FUNCTIONS ====================

// Helper to convert null values to empty strings for form inputs
export const sanitizeFormData = (data: Partial<PendudukFormData>): Partial<PendudukFormData> => {
  const sanitized: Partial<PendudukFormData> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      (sanitized as Record<string, string | number | boolean>)[key] = '';
    } else {
      (sanitized as Record<string, string | number | boolean>)[key] = value;
    }
  }
  return sanitized;
};

// ==================== CONSTANTS ====================

export const initialFormData: PendudukFormData = {
  nik: '',
  namaLengkap: '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: 'LAKI_LAKI',
  golonganDarah: 'TIDAK_TAHU',
  agama: 'ISLAM',
  suku: '',
  statusPerkawinan: 'BELUM_KAWIN',
  aktaPerkawinan: '',
  tanggalPerkawinan: '',
  aktaPerceraian: '',
  tanggalPerceraian: '',
  pekerjaan: '',
  pendidikan: '',
  penghasilan: '',
  kewarganegaraan: 'WNI',
  negaraAsal: '',
  noPaspor: '',
  noKitasKitap: '',
  tanggalMasuk: '',
  noAktaKelahiran: '',
  statusKTP: 'BELUM_BUAT',
  noBPJSKesehatan: '',
  noBPJSTenagakerja: '',
  npwp: '',
  namaAyah: '',
  nikAyah: '',
  namaIbu: '',
  nikIbu: '',
  anakKe: '',
  jumlahSaudara: '',
  kkId: '',
  hubunganKeluarga: '',
  urutanDalamKK: 1,
  email: '',
  noHP: '',
  jenisDisabilitas: 'TIDAK_ADA',
  keteranganDisabilitas: '',
  penyakitKronis: '',
  status: 'TETAP',
  isActive: true,
  foto: '',
  fotoKTP: '',
};

// Consolidated menu items - fewer sections for better UX
export const menuItems = [
  { id: 'pribadi', label: 'Data Pribadi', icon: User },
  { id: 'keluarga', label: 'Keluarga', icon: Users },
  { id: 'kesehatan', label: 'Kesehatan', icon: Heart },
  { id: 'dokumen', label: 'Dokumen', icon: FileText },
];

// Mapping field wajib & opsional per tab untuk progress tracking
export const tabFieldConfig: Record<string, { required: (keyof PendudukFormData)[]; optional: (keyof PendudukFormData)[] }> = {
  pribadi: {
    required: ['namaLengkap', 'jenisKelamin', 'tanggalLahir'],
    optional: ['nik', 'tempatLahir', 'golonganDarah', 'agama', 'suku', 'pekerjaan', 'pendidikan', 'penghasilan', 'email', 'noHP'],
  },
  keluarga: {
    required: ['hubunganKeluarga'],
    optional: ['statusPerkawinan', 'aktaPerkawinan', 'tanggalPerkawinan', 'aktaPerceraian', 'tanggalPerceraian', 'namaAyah', 'namaIbu', 'nikAyah', 'nikIbu', 'anakKe', 'jumlahSaudara'],
  },
  kesehatan: {
    required: [],
    optional: ['jenisDisabilitas', 'keteranganDisabilitas', 'penyakitKronis'],
  },
  dokumen: {
    required: [],
    optional: ['noAktaKelahiran', 'statusKTP', 'noBPJSKesehatan', 'noBPJSTenagakerja', 'npwp', 'kewarganegaraan', 'negaraAsal', 'noPaspor', 'noKitasKitap', 'tanggalMasuk'],
  },
};

// Mapping error field → tab untuk auto-navigate
export const fieldToTab: Record<string, string> = {
  nik: 'pribadi', namaLengkap: 'pribadi', tanggalLahir: 'pribadi',
  jenisKelamin: 'pribadi', golonganDarah: 'pribadi', agama: 'pribadi',
  hubunganKeluarga: 'keluarga', statusPerkawinan: 'keluarga', namaIbu: 'keluarga',
  kewarganegaraan: 'dokumen', negaraAsal: 'dokumen',
};
