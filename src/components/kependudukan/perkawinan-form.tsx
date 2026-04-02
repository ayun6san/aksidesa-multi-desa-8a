'use client';

import React, { useMemo } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { NIKSearch, PendudukSearchResult } from './nik-search';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PerkawinanFormData {
  tanggalPerkawinan: string;
  tempat: string;
  aktaPerkawinan: string;
  keterangan: string;
}

export type OpsiKK = 'TETAP_DI_KK_MASING2' | 'PINDAH_KE_KK_PENDUDUK' | 'BUAT_KK_BARU';

export interface SuccessionMember {
  id: string;
  namaLengkap: string;
  nik: string;
  hubunganKeluarga: string;
}

export interface PerkawinanSuccessionData {
  pendudukIsKepala: boolean;
  pendudukSisaAnggota: SuccessionMember[];
  pendudukGantiKepalaId: string;
  pendudukAdaPengganti: boolean;
  pasanganIsKepala: boolean;
  pasanganSisaAnggota: SuccessionMember[];
  pasanganGantiKepalaId: string;
  pasanganAdaPengganti: boolean;
}

export interface PerkawinanFormProps {
  perkawinanForm: PerkawinanFormData;
  setPerkawinanForm: React.Dispatch<React.SetStateAction<PerkawinanFormData>>;
  selectedPenduduk: PendudukSearchResult | null;
  setSelectedPenduduk: (p: PendudukSearchResult | null) => void;
  selectedPasangan: PendudukSearchResult | null;
  setSelectedPasangan: (p: PendudukSearchResult | null) => void;
  opsiKK: OpsiKK;
  setOpsiKK: (v: OpsiKK) => void;
  alamatKKBaru: string;
  setAlamatKKBaru: (v: string) => void;
  succession: PerkawinanSuccessionData;
  setSuccession: React.Dispatch<React.SetStateAction<PerkawinanSuccessionData>>;
  loadingSuccession: boolean;
  submitting: boolean;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const hitungUsia = (tanggalLahir: string, tanggalAcuan: string): number | null => {
  if (!tanggalLahir) return null;
  return Math.floor(
    (new Date(tanggalAcuan).getTime() - new Date(tanggalLahir).getTime()) /
      (365.25 * 24 * 60 * 60 * 1000)
  );
};

const isValidMaritalStatus = (status: string | undefined) =>
  !status || status === 'BELUM_KAWIN' || status.startsWith('CERAI');

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/** Blue/pink info card shown below a NIKSearch when a penduduk is selected */
function PendudukInfoCard({
  penduduk,
  variant = 'blue',
}: {
  penduduk: PendudukSearchResult;
  variant?: 'blue' | 'pink';
}) {
  const colors = {
    blue: {
      card: 'bg-blue-50 border-blue-200',
      name: 'text-blue-900',
      detail: 'text-blue-700',
    },
    pink: {
      card: 'bg-pink-50 border-pink-200',
      name: 'text-pink-900',
      detail: 'text-pink-700',
    },
  };

  const c = colors[variant];

  return (
    <div className={cn('p-3 rounded-lg border', c.card)}>
      <p className={cn('font-medium', c.name)}>{penduduk.namaLengkap}</p>
      <p className={cn('text-sm', c.detail)}>
        NIK: {penduduk.nik}
        {penduduk.nomorKK && ` · No. KK: ${penduduk.nomorKK}`}
        {' · '}
        {penduduk.hubunganKeluarga}
        {penduduk.statusPerkawinan && ` · Status: ${penduduk.statusPerkawinan}`}
      </p>
    </div>
  );
}

/** Reusable styled radio-option label */
function RadioOption({
  name,
  checked,
  onChange,
  title,
  subtitle,
  selectedColor = 'border-amber-500 bg-amber-100',
  unselectedColor = 'border-amber-300 hover:bg-amber-100',
  radioAccent = 'accent-amber-600',
  titleColor = 'text-amber-900',
  subtitleColor = 'text-amber-600',
  compact = false,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: React.ReactNode;
  subtitle?: string;
  selectedColor?: string;
  unselectedColor?: string;
  radioAccent?: string;
  titleColor?: string;
  subtitleColor?: string;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        'flex items-center gap-2 rounded-lg border cursor-pointer transition-all',
        compact ? 'p-2' : 'p-2.5',
        checked ? selectedColor : unselectedColor
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className={radioAccent}
      />
      <div className="flex-1">
        <span className={cn('text-sm font-medium', titleColor)}>{title}</span>
        {subtitle && (
          <p className={cn('text-xs', subtitleColor)}>{subtitle}</p>
        )}
        {children}
      </div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function PerkawinanForm({
  perkawinanForm,
  setPerkawinanForm,
  selectedPenduduk,
  setSelectedPenduduk,
  selectedPasangan,
  setSelectedPasangan,
  opsiKK,
  setOpsiKK,
  alamatKKBaru,
  setAlamatKKBaru,
  succession,
  setSuccession,
  loadingSuccession,
  submitting,
  onSubmit,
  onCancel,
}: PerkawinanFormProps) {
  /* ---------- derived values (useMemo instead of IIFE) ---------- */

  const tanggalAcuan = perkawinanForm.tanggalPerkawinan || new Date().toISOString().split('T')[0];

  const usiaPenduduk = useMemo<number | null>(
    () => hitungUsia(selectedPenduduk?.tanggalLahir ?? '', tanggalAcuan),
    [selectedPenduduk?.tanggalLahir, tanggalAcuan]
  );

  const oppositeGender = useMemo(() => {
    if (!selectedPenduduk?.jenisKelamin) return '';
    return selectedPenduduk.jenisKelamin === 'LAKI_LAKI' ? 'PEREMPUAN' : 'LAKI_LAKI';
  }, [selectedPenduduk]);

  const isPendudukValid = useMemo(
    () => !!selectedPenduduk && isValidMaritalStatus(selectedPenduduk.statusPerkawinan),
    [selectedPenduduk]
  );

  const isUsiaPendudukValid = useMemo(
    () => usiaPenduduk === null || usiaPenduduk >= 19,
    [usiaPenduduk]
  );

  const isPasanganValid = useMemo(() => {
    if (!selectedPasangan) return true;
    return (
      isValidMaritalStatus(selectedPasangan.statusPerkawinan) &&
      (hitungUsia(selectedPasangan.tanggalLahir, tanggalAcuan) ?? 19) >= 19
    );
  }, [selectedPasangan, tanggalAcuan]);

  const isKKValid = useMemo(() => {
    if (!succession.pendudukIsKepala && !succession.pasanganIsKepala) return true;
    const pendudukOk =
      !succession.pendudukIsKepala ||
      !succession.pendudukAdaPengganti ||
      !!succession.pendudukGantiKepalaId;
    const pasanganOk =
      !succession.pasanganIsKepala ||
      !succession.pasanganAdaPengganti ||
      !!succession.pasanganGantiKepalaId;
    return pendudukOk && pasanganOk;
  }, [succession]);

  const isSubmitDisabled = useMemo(
    () =>
      submitting ||
      !selectedPenduduk ||
      !isPendudukValid ||
      !isUsiaPendudukValid ||
      !isPasanganValid ||
      !isKKValid ||
      (opsiKK === 'BUAT_KK_BARU' && !alamatKKBaru),
    [submitting, selectedPenduduk, isPendudukValid, isUsiaPendudukValid, isPasanganValid, isKKValid, opsiKK, alamatKKBaru]
  );

  /* ---------- handlers ---------- */

  const handleSelectPenduduk = (p: PendudukSearchResult) => {
    setSelectedPenduduk(p);
    // Clear pasangan if same person
    if (selectedPasangan?.id === p.id) {
      setSelectedPasangan(null);
    }
  };

  const handleSelectPasangan = (p: PendudukSearchResult) => {
    if (p.id === selectedPenduduk?.id) {
      toast.error('Pasangan tidak boleh sama dengan penduduk yang dipilih');
      return;
    }
    setSelectedPasangan(p);
  };

  const handleClearPasangan = () => {
    setSelectedPasangan(null);
    setOpsiKK('TETAP_DI_KK_MASING2');
    setAlamatKKBaru('');
  };

  /* ---------- render ---------- */

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="p-3 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-800">
          <strong>Info:</strong> Status perkawinan akan diubah menjadi{' '}
          <Badge className="ml-1 bg-red-100 text-red-700">
            {perkawinanForm.aktaPerkawinan ? 'Kawin Tercatat' : 'Kawin Tidak Tercatat'}
          </Badge>
        </p>
      </div>

      {/* Penduduk search */}
      <div className="space-y-2">
        <Label>
          Pilih Penduduk <span className="text-red-500">*</span>
        </Label>
        <NIKSearch
          onSelect={handleSelectPenduduk}
          selectedPenduduk={selectedPenduduk}
          onClear={() => setSelectedPenduduk(null)}
          placeholder="Cari NIK atau nama penduduk..."
        />
      </div>

      {/* Validasi status perkawinan penduduk */}
      {selectedPenduduk &&
        selectedPenduduk.statusPerkawinan &&
        !isValidMaritalStatus(selectedPenduduk.statusPerkawinan) && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-900">Status Perkawinan Tidak Valid</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Penduduk sudah berstatus <strong>{selectedPenduduk.statusPerkawinan}</strong>.
                  Perkawinan hanya dapat dicatat untuk status Belum Kawin atau Cerai.
                </p>
              </div>
            </div>
          </div>
        )}

      {/* Validasi usia */}
      {selectedPenduduk && selectedPenduduk.tanggalLahir && usiaPenduduk !== null && usiaPenduduk < 19 && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Usia Belum Memenuhi Syarat</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Usia penduduk <strong>{usiaPenduduk} tahun</strong>, belum memenuhi usia minimal
                perkawinan (19 tahun) sesuai UU No. 16 Tahun 2019.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Penduduk info card */}
      {selectedPenduduk && <PendudukInfoCard penduduk={selectedPenduduk} variant="blue" />}

      {/* Pilihan Status Perkawinan */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-700">Status Perkawinan</Label>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
              perkawinanForm.aktaPerkawinan
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:bg-gray-50'
            )}
          >
            <input
              type="radio"
              name="status-perkawinan"
              checked={!!perkawinanForm.aktaPerkawinan}
              onChange={() =>
                setPerkawinanForm({
                  ...perkawinanForm,
                  aktaPerkawinan: perkawinanForm.aktaPerkawinan || 'TERCATAT',
                })
              }
              className="accent-red-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Kawin Tercatat</p>
              <p className="text-xs text-gray-500">Memiliki akta perkawinan</p>
            </div>
          </label>
          <label
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
              !perkawinanForm.aktaPerkawinan
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:bg-gray-50'
            )}
          >
            <input
              type="radio"
              name="status-perkawinan"
              checked={!perkawinanForm.aktaPerkawinan}
              onChange={() =>
                setPerkawinanForm({ ...perkawinanForm, aktaPerkawinan: '' })
              }
              className="accent-red-600"
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Kawin Tidak Tercatat</p>
              <p className="text-xs text-gray-500">Tidak memiliki akta perkawinan</p>
            </div>
          </label>
        </div>
      </div>

      {/* Tanggal & Tempat */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tanggal Perkawinan</Label>
          <Input
            type="date"
            value={perkawinanForm.tanggalPerkawinan}
            onChange={(e) =>
              setPerkawinanForm({ ...perkawinanForm, tanggalPerkawinan: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label>Tempat</Label>
          <Input
            value={perkawinanForm.tempat}
            onChange={(e) =>
              setPerkawinanForm({ ...perkawinanForm, tempat: e.target.value })
            }
            placeholder="KUA/Masjid/Gereja/etc"
          />
        </div>
      </div>

      {/* No. Akta */}
      <div className="space-y-2">
        <Label>
          No. Akta Perkawinan{' '}
          {perkawinanForm.aktaPerkawinan && perkawinanForm.aktaPerkawinan !== 'TERCATAT' ? (
            ''
          ) : (
            <span className="text-gray-400 font-normal">(opsional)</span>
          )}
        </Label>
        <Input
          value={perkawinanForm.aktaPerkawinan === 'TERCATAT' ? '' : perkawinanForm.aktaPerkawinan}
          onChange={(e) =>
            setPerkawinanForm({ ...perkawinanForm, aktaPerkawinan: e.target.value })
          }
          placeholder={perkawinanForm.aktaPerkawinan === 'TERCATAT' ? 'Isi nomor akta perkawinan' : 'Isi jika ada akta perkawinan'}
        />
      </div>

      {/* Pasangan */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 mb-3">
          Data Pasangan{' '}
          <span className="text-gray-400 font-normal">
            (opsional — jika terdaftar di sistem)
          </span>
        </p>

        <div className="space-y-2">
          <NIKSearch
            onSelect={handleSelectPasangan}
            selectedPenduduk={selectedPasangan}
            onClear={handleClearPasangan}
            excludeIds={selectedPenduduk ? [selectedPenduduk.id] : []}
            filterJenisKelamin={oppositeGender}
            placeholder="Cari NIK atau nama pasangan..."
          />
        </div>

        {selectedPasangan && (
          <PendudukInfoCard penduduk={selectedPasangan} variant="pink" />
        )}

        {/* KK Options — only when pasangan from different KK */}
        {selectedPasangan &&
          selectedPenduduk &&
          selectedPenduduk.kkId &&
          selectedPasangan.kkId &&
          selectedPenduduk.kkId !== selectedPasangan.kkId && (
            <div className="mt-3 space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              {/* Different KK notice */}
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">Pasangan dari KK Berbeda</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    KK Penduduk: {selectedPenduduk.nomorKK} · KK Pasangan:{' '}
                    {selectedPasangan.nomorKK}
                  </p>
                </div>
              </div>

              {/* KK action radio options */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-900">
                  Tindakan untuk Kartu Keluarga:
                </label>
                <div className="space-y-1.5">
                  <RadioOption
                    name="opsi-kk-perkawinan"
                    checked={opsiKK === 'TETAP_DI_KK_MASING2'}
                    onChange={() => setOpsiKK('TETAP_DI_KK_MASING2')}
                    title="Tetap di KK masing-masing"
                    subtitle="Tidak ada perubahan KK"
                  />
                  <RadioOption
                    name="opsi-kk-perkawinan"
                    checked={opsiKK === 'PINDAH_KE_KK_PENDUDUK'}
                    onChange={() => setOpsiKK('PINDAH_KE_KK_PENDUDUK')}
                    title="Pasangan pindah ke KK penduduk"
                    subtitle="Pasangan akan menjadi anggota KK penduduk"
                  />
                  <RadioOption
                    name="opsi-kk-perkawinan"
                    checked={opsiKK === 'BUAT_KK_BARU'}
                    onChange={() => setOpsiKK('BUAT_KK_BARU')}
                    title="Buat KK baru"
                    subtitle="Kedua pasangan pindah ke KK baru"
                  />
                </div>
              </div>

              {/* Alamat KK Baru */}
              {opsiKK === 'BUAT_KK_BARU' && (
                <div className="space-y-2">
                  <Label>
                    Alamat KK Baru <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={alamatKKBaru}
                    onChange={(e) => setAlamatKKBaru(e.target.value)}
                    placeholder="Alamat tempat tinggal baru"
                  />
                </div>
              )}

              {/* KK Succession — Penduduk is kepala KK (BUAT_KK_BARU only) */}
              {opsiKK === 'BUAT_KK_BARU' && succession.pendudukIsKepala && (
                <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900">Penduduk adalah Kepala Keluarga</p>
                      <p className="text-sm text-red-700 mt-0.5">
                        {succession.pendudukSisaAnggota.length === 0
                          ? 'Tidak ada anggota KK lain. KK akan dinonaktifkan.'
                          : `Masih ada ${succession.pendudukSisaAnggota.length} anggota KK lain yang aktif.`}
                      </p>
                    </div>
                  </div>

                  {succession.pendudukSisaAnggota.length > 0 && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-red-900">
                          Tindakan untuk KK Penduduk:
                        </label>
                        <RadioOption
                          name="opsi-kk-penduduk"
                          checked={succession.pendudukAdaPengganti}
                          onChange={() =>
                            setSuccession((p) => ({
                              ...p,
                              pendudukAdaPengganti: true,
                            }))
                          }
                          title="Pilih pengganti dari anggota"
                          selectedColor="border-red-500 bg-red-100"
                          unselectedColor="border-red-300 hover:bg-red-100"
                          radioAccent="accent-red-600"
                          titleColor="text-red-900"
                        />
                        <RadioOption
                          name="opsi-kk-penduduk"
                          checked={!succession.pendudukAdaPengganti}
                          onChange={() =>
                            setSuccession((p) => ({
                              ...p,
                              pendudukAdaPengganti: false,
                              pendudukGantiKepalaId: '',
                            }))
                          }
                          title={
                            <span className="text-sm text-red-900">
                              Tidak ada pengganti{' '}
                              <span className="text-red-600">(KK dinonaktifkan)</span>
                            </span>
                          }
                          selectedColor="border-red-500 bg-red-100"
                          unselectedColor="border-red-300 hover:bg-red-100"
                          radioAccent="accent-red-600"
                          titleColor="text-red-900"
                        />
                      </div>

                      {succession.pendudukAdaPengganti && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-red-900">
                            Pilih Pengganti <span className="text-red-500">*</span>
                          </label>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {succession.pendudukSisaAnggota.map((anggota) => (
                              <RadioOption
                                key={anggota.id}
                                name="ganti-kepala-penduduk"
                                checked={succession.pendudukGantiKepalaId === anggota.id}
                                onChange={() =>
                                  setSuccession((p) => ({
                                    ...p,
                                    pendudukGantiKepalaId: anggota.id,
                                  }))
                                }
                                title={anggota.namaLengkap}
                                subtitle={`${anggota.nik} · ${anggota.hubunganKeluarga}`}
                                selectedColor="border-red-500 bg-red-100"
                                unselectedColor="border-gray-200 hover:bg-red-50"
                                radioAccent="accent-red-600"
                                titleColor="text-gray-900"
                                subtitleColor="text-gray-500"
                                compact
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* KK Succession — Pasangan is kepala KK */}
              {succession.pasanganIsKepala && (
                <div className="space-y-3 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-purple-900">
                        Pasangan adalah Kepala Keluarga
                      </p>
                      <p className="text-sm text-purple-700 mt-0.5">
                        {succession.pasanganSisaAnggota.length === 0
                          ? 'Tidak ada anggota KK lain. KK akan dinonaktifkan.'
                          : `Masih ada ${succession.pasanganSisaAnggota.length} anggota KK lain yang aktif.`}
                      </p>
                    </div>
                  </div>

                  {succession.pasanganSisaAnggota.length > 0 && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-purple-900">
                          Tindakan untuk KK Pasangan:
                        </label>
                        <RadioOption
                          name="opsi-kk-pasangan"
                          checked={succession.pasanganAdaPengganti}
                          onChange={() =>
                            setSuccession((p) => ({
                              ...p,
                              pasanganAdaPengganti: true,
                            }))
                          }
                          title="Pilih pengganti dari anggota"
                          selectedColor="border-purple-500 bg-purple-100"
                          unselectedColor="border-purple-300 hover:bg-purple-100"
                          radioAccent="accent-purple-600"
                          titleColor="text-purple-900"
                        />
                        <RadioOption
                          name="opsi-kk-pasangan"
                          checked={!succession.pasanganAdaPengganti}
                          onChange={() =>
                            setSuccession((p) => ({
                              ...p,
                              pasanganAdaPengganti: false,
                              pasanganGantiKepalaId: '',
                            }))
                          }
                          title={
                            <span className="text-sm text-purple-900">
                              Tidak ada pengganti{' '}
                              <span className="text-purple-600">(KK dinonaktifkan)</span>
                            </span>
                          }
                          selectedColor="border-purple-500 bg-purple-100"
                          unselectedColor="border-purple-300 hover:bg-purple-100"
                          radioAccent="accent-purple-600"
                          titleColor="text-purple-900"
                        />
                      </div>

                      {succession.pasanganAdaPengganti && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium text-purple-900">
                            Pilih Pengganti <span className="text-red-500">*</span>
                          </label>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {succession.pasanganSisaAnggota.map((anggota) => (
                              <RadioOption
                                key={anggota.id}
                                name="ganti-kepala-pasangan"
                                checked={succession.pasanganGantiKepalaId === anggota.id}
                                onChange={() =>
                                  setSuccession((p) => ({
                                    ...p,
                                    pasanganGantiKepalaId: anggota.id,
                                  }))
                                }
                                title={anggota.namaLengkap}
                                subtitle={`${anggota.nik} · ${anggota.hubunganKeluarga}`}
                                selectedColor="border-purple-500 bg-purple-100"
                                unselectedColor="border-gray-200 hover:bg-purple-50"
                                radioAccent="accent-purple-600"
                                titleColor="text-gray-900"
                                subtitleColor="text-gray-500"
                                compact
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
      </div>

      {/* Keterangan */}
      <div className="space-y-2">
        <Label>Keterangan</Label>
        <Textarea
          value={perkawinanForm.keterangan}
          onChange={(e) =>
            setPerkawinanForm({ ...perkawinanForm, keterangan: e.target.value })
          }
        />
      </div>

      {/* Footer */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
          Simpan Perkawinan
        </Button>
      </DialogFooter>
    </div>
  );
}
