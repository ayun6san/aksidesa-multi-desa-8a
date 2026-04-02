import React from 'react';
import {
  PendudukFormData,
  KKInfo,
  tabFieldConfig,
} from './penduduk-form-types';
import { hubunganKeluargaOptions } from './kependudukan-constants';

// ==================== TYPES ====================

export type FormMode = 'tambah' | 'edit' | 'anggota-kk' | 'penduduk-baru';

export interface NikCheckState {
  checking: boolean;
  exists: boolean;
  nama?: string;
}

export interface NomorKKCheckState {
  checking: boolean;
  exists: boolean;
  kepalaKeluarga?: string;
}

// ==================== VALIDATION ====================

export const validatePendudukForm = (
  formData: PendudukFormData,
  mode: FormMode,
  nikCheck: NikCheckState,
): Partial<Record<keyof PendudukFormData, string>> => {
  const newErrors: Partial<Record<keyof PendudukFormData, string>> = {};

  // NIK opsional — penduduk baru mungkin belum punya NIK
  if (formData.nik.trim() && !/^\d{16}$/.test(formData.nik)) {
    newErrors.nik = 'NIK harus 16 digit angka';
  }

  // NIK duplikat check
  if (formData.nik.trim() && nikCheck.exists) {
    newErrors.nik = `NIK sudah digunakan oleh ${nikCheck.nama}`;
  }

  if (!formData.namaLengkap.trim()) {
    newErrors.namaLengkap = 'Nama lengkap wajib diisi';
  }

  if (!formData.jenisKelamin) {
    newErrors.jenisKelamin = 'Jenis kelamin wajib dipilih';
  }

  if (!formData.tanggalLahir.trim()) {
    newErrors.tanggalLahir = 'Tanggal lahir wajib diisi';
  }

  // Hubungan keluarga wajib untuk mode anggota-kk dan penduduk-baru
  if ((mode === 'anggota-kk' || mode === 'penduduk-baru') && !formData.hubunganKeluarga) {
    newErrors.hubunganKeluarga = 'Hubungan keluarga wajib dipilih';
  }

  // Negara asal wajib jika WNA
  if (formData.kewarganegaraan === 'WNA' && !formData.negaraAsal.trim()) {
    newErrors.negaraAsal = 'Negara asal wajib diisi untuk WNA';
  }

  return newErrors;
};

// ==================== MENU STATUS ====================

export const getMenuStatus = (
  menuId: string,
  formData: PendudukFormData,
  mode: FormMode,
): { status: 'complete' | 'partial' | 'empty'; filled: number; total: number } => {
  const config = tabFieldConfig[menuId];
  if (!config) return { status: 'empty', filled: 0, total: 0 };

  const isRequiredMode = mode === 'anggota-kk' || mode === 'penduduk-baru';
  const requiredFields = isRequiredMode ? config.required : [];
  const optionalFields = config.optional;
  const allFields = [...requiredFields, ...optionalFields];

  if (allFields.length === 0) {
    return { status: 'complete', filled: 0, total: 0 };
  }

  let filledRequired = 0;
  let filledOptional = 0;
  let totalRequired = requiredFields.length;

  for (const key of allFields) {
    const value = formData[key];
    const isFilled = value !== null && value !== undefined && value !== '' && value !== 0;
    if (requiredFields.includes(key)) {
      if (isFilled) filledRequired++;
    } else {
      if (isFilled) filledOptional++;
    }
  }

  const total = allFields.length;
  const filled = filledRequired + filledOptional;

  // Tab dengan required fields: complete hanya jika semua required terisi
  if (totalRequired > 0) {
    if (filledRequired >= totalRequired) {
      return { status: 'complete', filled, total };
    } else if (filled > 0) {
      return { status: 'partial', filled, total };
    }
    return { status: 'empty', filled, total };
  }

  // Tab tanpa required fields (kesehatan, dokumen):
  // status berdasarkan optional fields yang terisi
  if (filled >= total) {
    return { status: 'complete', filled, total };
  } else if (filled > 0) {
    return { status: 'partial', filled, total };
  }
  return { status: 'empty', filled, total };
};

// ==================== AGE CALCULATION ====================

export const calculateAge = (tanggalLahir: string | undefined): string => {
  if (!tanggalLahir) return '-';
  const birth = new Date(tanggalLahir);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? `${age} tahun` : '-';
};

// ==================== TITLE ====================

export const getFormTitle = (
  mode: FormMode,
  editingPenduduk?: PendudukFormData & { id: string; nomorKK?: string } | null,
): string => {
  switch (mode) {
    case 'tambah':
      return 'Tambah Penduduk';
    case 'edit':
      return 'Edit Data Penduduk';
    case 'anggota-kk':
      return editingPenduduk ? 'Edit Anggota Keluarga' : 'Tambah Anggota Keluarga';
    case 'penduduk-baru':
      return 'Tambah Penduduk Baru';
    default:
      return 'Form Penduduk';
  }
};

// ==================== BREADCRUMBS ====================

export const getFormBreadcrumbs = (
  mode: FormMode,
  kkInfo?: KKInfo | null,
  editingPenduduk?: PendudukFormData & { id: string; nomorKK?: string } | null,
  step?: 'pilih-kk' | 'form-data',
): { label: string; icon?: React.ComponentType<{ className?: string }> }[] => {
  switch (mode) {
    case 'edit':
      return [
        { label: 'Data Penduduk' },
        { label: editingPenduduk?.namaLengkap || 'Penduduk' },
        { label: 'Edit Data' },
      ];
    case 'anggota-kk':
      return [
        ...(kkInfo ? [{ label: 'Data KK' }] : [{ label: 'Data KK' }]),
        ...(kkInfo ? [{ label: kkInfo.kepalaKeluarga || 'KK' }] : []),
        { label: editingPenduduk ? 'Edit Anggota' : 'Tambah Anggota' },
      ];
    case 'penduduk-baru':
      if (step === 'pilih-kk') {
        return [{ label: 'Penduduk' }, { label: 'Buat Baru' }];
      }
      return [{ label: 'Penduduk' }, { label: 'Buat Baru' }, { label: 'Data Diri' }];
    case 'tambah':
      return [{ label: 'Data Penduduk' }, { label: 'Tambah' }];
    default:
      return [];
  }
};

// ==================== HUBUNGAN KELUARGA OPTIONS ====================

export const getHubunganKeluargaOptions = (
  mode: FormMode,
  kkStatus: 'belum-punya' | 'sudah-punya' | null,
): string[] => {
  if (mode === 'penduduk-baru' && kkStatus === 'belum-punya') {
    return ['Kepala Keluarga']; // Fixed for new KK
  }
  if (mode === 'anggota-kk' || (mode === 'penduduk-baru' && kkStatus === 'sudah-punya')) {
    return hubunganKeluargaOptions.filter(h => h !== 'Kepala Keluarga');
  }
  return hubunganKeluargaOptions;
};
