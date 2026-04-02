'use client';

import React, { useState, useMemo } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, Check, AlertTriangle, UserPlus, Users, ClipboardList, Home } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NIKSearch, PendudukSearchResult } from './nik-search';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { pekerjaanGroups } from '@/lib/kependudukan-constants';

const agamaOptions = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA'];
const agamaLabels: Record<string, string> = {
  ISLAM: 'Islam', KRISTEN: 'Kristen', KATOLIK: 'Katolik',
  HINDU: 'Hindu', BUDDHA: 'Buddha', KONGHUCU: 'Konghucu', LAINNYA: 'Lainnya',
};

const statusPerkawinanOptions = [
  { value: 'BELUM_KAWIN', label: 'Belum Kawin' },
  { value: 'KAWIN_TERCATAT', label: 'Kawin Tercatat' },
  { value: 'KAWIN_TIDAK_TERCATAT', label: 'Kawin Tidak Tercatat' },
  { value: 'CERAI_MATI', label: 'Cerai Mati' },
  { value: 'CERAI_HIDUP_TERCATAT', label: 'Cerai Hidup Tercatat' },
  { value: 'CERAI_HIDUP_TIDAK_TERCATAT', label: 'Cerai Hidup Tidak Tercatat' },
];

const hubunganOptions = [
  { value: 'KEPALA_KELUARGA', label: 'Kepala Keluarga' },
  { value: 'ISTRI', label: 'Istri' },
  { value: 'SUAMI', label: 'Suami' },
  { value: 'ANAK', label: 'Anak' },
  { value: 'MENANTU', label: 'Menantu' },
  { value: 'CUCU', label: 'Cucu' },
  { value: 'KAKEK', label: 'Kakek' },
  { value: 'NENEK', label: 'Nenek' },
  { value: 'ORANG_TUA', label: 'Orang Tua' },
  { value: 'MERTUA', label: 'Mertua' },
  { value: 'FAMILI_LAIN', label: 'Famili Lain' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

export interface PindahMasukFormProps {
  pindahMasukForm: {
    nik: string;
    namaLengkap: string;
    tempatLahir: string;
    tanggalLahir: string;
    jenisKelamin: string;
    agama: string;
    pekerjaan: string;
    statusPerkawinan: string;
    alamatAsal: string;
    kkId: string;
    hubunganKeluarga: string;
    keterangan: string;
  };
  setPindahMasukForm: React.Dispatch<React.SetStateAction<PindahMasukFormProps['pindahMasukForm']>>;
  selectedKKMasuk: PendudukSearchResult | null;
  setSelectedKKMasuk: (p: PendudukSearchResult) => void;
  onClearKKMasuk: () => void;
  submitting: boolean;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, label: 'Data Penduduk', icon: UserPlus },
  { id: 2, label: 'KK Tujuan', icon: Home },
  { id: 3, label: 'Konfirmasi', icon: ClipboardList },
];

export default function PindahMasukForm({
  pindahMasukForm,
  setPindahMasukForm,
  selectedKKMasuk,
  setSelectedKKMasuk,
  onClearKKMasuk,
  submitting,
  onSubmit,
  onCancel,
}: PindahMasukFormProps) {
  const [currentStep, setCurrentStep] = useState(1);

  const updateField = (field: string, value: string) => {
    setPindahMasukForm(prev => ({ ...prev, [field]: value }));
  };

  // Validation
  const nikValid = pindahMasukForm.nik.length === 16;
  const tanggalLahirValid = pindahMasukForm.tanggalLahir !== '' && new Date(pindahMasukForm.tanggalLahir) <= new Date();
  const tanggalLahirError = !pindahMasukForm.tanggalLahir ? 'Tanggal lahir wajib diisi'
    : pindahMasukForm.tanggalLahir && new Date(pindahMasukForm.tanggalLahir) > new Date() ? 'Tidak boleh lebih dari hari ini' : '';

  const step1Valid = pindahMasukForm.namaLengkap.trim() !== '' && nikValid && tanggalLahirValid;
  const step2Valid = pindahMasukForm.kkId !== '' && pindahMasukForm.hubunganKeluarga !== '';
  const canNext = currentStep === 1 ? step1Valid : currentStep === 2 ? step2Valid : true;

  const handleNext = () => { if (currentStep < 3 && canNext) setCurrentStep(prev => prev + 1); };
  const handlePrev = () => { if (currentStep > 1) setCurrentStep(prev => prev - 1); };

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isDone ? 'bg-emerald-600 text-white' :
                  isActive ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500' :
                  'bg-gray-100 text-gray-400 border-2 border-gray-200'
                }`}>
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-emerald-700' : isDone ? 'text-emerald-600' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1: Data Penduduk */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Step 1:</strong> Lengkapi data penduduk yang pindah. NIK wajib 16 digit (sudah ada dari daerah asal).
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-500" />
              Data Penduduk
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">NIK <span className="text-red-500">*</span></Label>
                <Input
                  value={pindahMasukForm.nik}
                  onChange={(e) => updateField('nik', e.target.value.replace(/\D/g, '').slice(0, 16))}
                  placeholder="16 digit NIK"
                  maxLength={16}
                  className={`h-9 ${pindahMasukForm.nik && !nikValid ? 'border-red-500' : ''}`}
                />
                {pindahMasukForm.nik && !nikValid && (
                  <p className="text-xs text-red-500">NIK harus 16 digit</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Nama Lengkap <span className="text-red-500">*</span></Label>
                <Input
                  value={pindahMasukForm.namaLengkap}
                  onChange={(e) => updateField('namaLengkap', e.target.value)}
                  placeholder="Nama lengkap"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Tempat Lahir</Label>
                <Input
                  value={pindahMasukForm.tempatLahir}
                  onChange={(e) => updateField('tempatLahir', e.target.value)}
                  placeholder="Kota/Kabupaten"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Tanggal Lahir <span className="text-red-500">*</span></Label>
                <Input
                  type="date"
                  value={pindahMasukForm.tanggalLahir}
                  onChange={(e) => updateField('tanggalLahir', e.target.value)}
                  className={`h-9 ${tanggalLahirError ? 'border-red-500' : ''}`}
                  max={new Date().toISOString().split('T')[0]}
                />
                {tanggalLahirError && <p className="text-xs text-red-500">{tanggalLahirError}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Jenis Kelamin</Label>
                <Select value={pindahMasukForm.jenisKelamin} onValueChange={(v) => updateField('jenisKelamin', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAKI_LAKI">Laki-laki</SelectItem>
                    <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Agama</Label>
                <Select value={pindahMasukForm.agama} onValueChange={(v) => updateField('agama', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {agamaOptions.map((a) => (
                      <SelectItem key={a} value={a}>{agamaLabels[a] || a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Status Perkawinan</Label>
                <Select value={pindahMasukForm.statusPerkawinan} onValueChange={(v) => updateField('statusPerkawinan', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusPerkawinanOptions.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <SearchableCombobox
                  value={pindahMasukForm.pekerjaan}
                  onChange={(v) => updateField('pekerjaan', v)}
                  options={pekerjaanGroups}
                  placeholder="Pilih pekerjaan..."
                  searchPlaceholder="Ketik pekerjaan..."
                  emptyMessage="Pekerjaan tidak ditemukan"
                  label="Pekerjaan"
                />
              </div>
            </div>
          </div>

          {/* Alamat Asal */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Alamat Asal</Label>
            <Textarea
              value={pindahMasukForm.alamatAsal}
              onChange={(e) => updateField('alamatAsal', e.target.value)}
              placeholder="Alamat lengkap sebelum pindah (desa, kecamatan, kabupaten/kota, provinsi)"
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
      )}

      {/* Step 2: KK Tujuan */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Step 2:</strong> Cari anggota KK tujuan untuk menentukan KK yang akan dimasuki. Bisa juga buat KK baru.
            </p>
          </div>

          {/* NIKSearch for KK member */}
          <div className="space-y-2">
            <Label className="text-xs text-gray-600">Cari Anggota KK Tujuan <span className="text-red-500">*</span></Label>
            <NIKSearch
              onSelect={setSelectedKKMasuk}
              selectedPenduduk={selectedKKMasuk}
              onClear={onClearKKMasuk}
              placeholder="Cari NIK atau nama anggota KK tujuan..."
              showLabel={false}
            />
          </div>

          {/* KK info card */}
          {selectedKKMasuk && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">No. KK</span><p className="font-mono font-medium">{selectedKKMasuk.nomorKK || '-'}</p></div>
                <div><span className="text-gray-400">Anggota</span><p className="font-medium">{selectedKKMasuk.namaLengkap}</p></div>
                <div><span className="text-gray-400">NIK</span><p className="font-mono text-xs">{selectedKKMasuk.nik || '-'}</p></div>
                <div><span className="text-gray-400">Alamat</span><p className="font-medium text-xs">{selectedKKMasuk.alamat || '-'}{selectedKKMasuk.dusun ? ` — ${selectedKKMasuk.dusun}` : ''}</p></div>
              </div>
            </div>
          )}

          {/* Hubungan */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Hubungan dalam KK <span className="text-red-500">*</span></Label>
            <Select value={pindahMasukForm.hubunganKeluarga} onValueChange={(v) => updateField('hubunganKeluarga', v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Pilih hubungan" /></SelectTrigger>
              <SelectContent>
                {hubunganOptions.map((h) => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Keterangan */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Keterangan</Label>
            <Textarea
              value={pindahMasukForm.keterangan}
              onChange={(e) => updateField('keterangan', e.target.value)}
              placeholder="Keterangan tambahan (opsional)"
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
      )}

      {/* Step 3: Konfirmasi */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Step 3:</strong> Periksa data sebelum menyimpan. Penduduk akan terdaftar dengan status TETAP.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
            {/* Penduduk */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-500" />
                Data Penduduk
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">NIK</span><p className="font-mono font-medium">{pindahMasukForm.nik || '-'}</p></div>
                <div><span className="text-gray-400">Nama</span><p className="font-medium">{pindahMasukForm.namaLengkap || '-'}</p></div>
                <div><span className="text-gray-400">Tempat Lahir</span><p className="font-medium">{pindahMasukForm.tempatLahir || '-'}</p></div>
                <div><span className="text-gray-400">Tanggal Lahir</span><p className="font-medium">{pindahMasukForm.tanggalLahir ? new Date(pindahMasukForm.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p></div>
                <div><span className="text-gray-400">Jenis Kelamin</span><p className="font-medium">{pindahMasukForm.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}</p></div>
                <div><span className="text-gray-400">Agama</span><p className="font-medium">{agamaLabels[pindahMasukForm.agama] || pindahMasukForm.agama}</p></div>
                <div><span className="text-gray-400">Status Perkawinan</span><p className="font-medium">{statusPerkawinanOptions.find(s => s.value === pindahMasukForm.statusPerkawinan)?.label || '-'}</p></div>
                <div><span className="text-gray-400">Pekerjaan</span><p className="font-medium">{pindahMasukForm.pekerjaan || '-'}</p></div>
              </div>
            </div>

            {/* Alamat Asal */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Alamat Asal</h4>
              <p className="text-sm">{pindahMasukForm.alamatAsal || '-'}</p>
            </div>

            {/* KK Tujuan */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600" />
                KK Tujuan
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">No. KK</span><p className="font-mono font-medium">{selectedKKMasuk?.nomorKK || '-'}</p></div>
                <div><span className="text-gray-400">Hubungan</span><p className="font-medium">{hubunganOptions.find(h => h.value === pindahMasukForm.hubunganKeluarga)?.label || '-'}</p></div>
                <div><span className="text-gray-400">Alamat</span><p className="font-medium text-xs">{selectedKKMasuk?.alamat || '-'}{selectedKKMasuk?.dusun ? ` — ${selectedKKMasuk.dusun}` : ''}</p></div>
              </div>
            </div>

            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs text-emerald-700">
                <strong>Otomatis:</strong> Status: <Badge className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0 ml-1">TETAP</Badge> • Status KTP: <Badge className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0 ml-1">SUDAH BUAT</Badge> • Kewarganegaraan: <Badge className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0 ml-1">WNI</Badge>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <DialogFooter className="flex-row gap-2 sm:justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="gap-1">Batal</Button>
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handlePrev} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Sebelumnya
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep < 3 ? (
            <Button type="button" onClick={handleNext} disabled={!canNext} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="button" onClick={onSubmit} disabled={submitting} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              Simpan Pindah Masuk
            </Button>
          )}
        </div>
      </DialogFooter>
    </div>
  );
}
