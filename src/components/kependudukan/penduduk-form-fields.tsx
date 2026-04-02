'use client';

import React from 'react';
import {
  User,
  Users,
  Briefcase,
  FileText,
  Phone,
  Heart,
  Upload,
  X,
  Home,
  BadgeCheck,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  pekerjaanGroups,
  pendidikanOptions,
  golonganDarahOptions,
  golonganDarahLabels,
  agamaOptions,
  statusPerkawinanOptions,
  statusPerkawinanLabels,
  penghasilanOptions,
  statusKTPOptions,
  disabilitasOptions,
} from '@/lib/kependudukan-constants';
import { cn } from '@/lib/utils';
import {
  PendudukFormData,
  KKSearchResult,
} from '@/lib/penduduk-form-types';
import {
  FormMode,
  NikCheckState,
  getHubunganKeluargaOptions,
} from '@/lib/penduduk-form-utils';

// ==================== TYPES ====================

interface PendudukFormFieldsProps {
  activeMenu: string;
  formData: PendudukFormData;
  errors: Partial<Record<keyof PendudukFormData, string>>;
  mode: FormMode | 'view';
  kkInfo?: KKSearchResult | null;
  kkOptions: any[];
  selectedKK?: KKSearchResult | null;
  kkStatus: 'belum-punya' | 'sudah-punya' | null;
  nikCheck: NikCheckState;
  fotoInputRef: React.RefObject<HTMLInputElement | null>;
  fotoKTPInputRef: React.RefObject<HTMLInputElement | null>;
  onInputChange: (field: keyof PendudukFormData, value: string | number | boolean) => void;
  handleStatusPerkawinanChange: (newValue: string) => void;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>, field: 'foto' | 'fotoKTP') => void;
  onSetFormData: React.Dispatch<React.SetStateAction<PendudukFormData>>;
}

// ==================== COMPONENT ====================

export function PendudukFormFields({
  activeMenu,
  formData,
  errors,
  mode,
  kkInfo,
  kkOptions,
  selectedKK,
  kkStatus,
  nikCheck,
  fotoInputRef,
  fotoKTPInputRef,
  onInputChange,
  handleStatusPerkawinanChange,
  handleFileUpload,
  onSetFormData,
}: PendudukFormFieldsProps) {
  return (
    <div className="space-y-4">
      {/* Menu: Data Pribadi (Identitas + Kontak) */}
      {activeMenu === 'pribadi' && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <User className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Data Pribadi</h2>
          </div>

          {/* Section: Identitas Dasar */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600" />
              Identitas Dasar
            </h4>

            {/* Layout 2 Kolom: Foto Kiri - Form Kanan */}
            <div className="flex gap-6">
              {/* Kolom Kiri: Foto Penduduk */}
              <div className="flex flex-col items-center flex-shrink-0">
                <input ref={fotoInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'foto')} className="hidden" />
                {formData.foto ? (
                  <div className="relative group">
                    <img src={formData.foto} alt="Foto" className="w-32 h-40 object-cover rounded-lg border-2 border-gray-200 shadow-sm" />
                    <button type="button" onClick={() => onSetFormData(prev => ({ ...prev, foto: '' }))} className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fotoInputRef.current?.click()} className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <User className="w-6 h-6 text-gray-400" />
                    </div>
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500 mt-1">Upload Foto</span>
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Form Identitas */}
              <div className="flex-1 space-y-3">
                {/* Baris 1: Nama Lengkap */}
                <div className="space-y-1">
                  <Label htmlFor="namaLengkap" className="text-xs text-gray-600">Nama Lengkap <span className="text-red-500">*</span></Label>
                  <Input id="namaLengkap" value={formData.namaLengkap} onChange={(e) => onInputChange('namaLengkap', e.target.value)} placeholder="Nama lengkap sesuai KTP" className={cn('h-9', errors.namaLengkap && 'border-red-500')} />
                </div>

                {/* Baris 2: NIK, Tempat Lahir, Tanggal Lahir */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="nik" className="text-xs text-gray-600">NIK <span className="text-gray-400 text-[10px]">(opsional)</span></Label>
                    <Input id="nik" value={formData.nik} onChange={(e) => onInputChange('nik', e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="16 digit NIK (kosongkan jika belum ada)" className={cn('h-9 font-mono text-sm', errors.nik && 'border-red-500', nikCheck.exists && 'border-red-500')} />
                    {nikCheck.checking && formData.nik.length === 16 && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Mengecek NIK...
                      </p>
                    )}
                    {nikCheck.exists && nikCheck.nama && (
                      <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" /> NIK sudah digunakan oleh <span className="font-semibold">{nikCheck.nama}</span>
                      </p>
                    )}
                    {!nikCheck.checking && !nikCheck.exists && formData.nik.length === 16 && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> NIK tersedia
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tempatLahir" className="text-xs text-gray-600">Tempat Lahir</Label>
                    <Input id="tempatLahir" value={formData.tempatLahir} onChange={(e) => onInputChange('tempatLahir', e.target.value)} placeholder="Jakarta" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tanggalLahir" className="text-xs text-gray-600">Tgl Lahir <span className="text-red-500">*</span></Label>
                    <Input id="tanggalLahir" type="date" value={formData.tanggalLahir} onChange={(e) => onInputChange('tanggalLahir', e.target.value)} className="h-9" />
                  </div>
                </div>

                {/* Baris 3: Jenis Kelamin, Gol Darah, Agama, Suku */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Jenis Kelamin <span className="text-red-500">*</span></Label>
                    <Select value={formData.jenisKelamin} onValueChange={(v) => onInputChange('jenisKelamin', v)}>
                      <SelectTrigger className={cn('h-9', errors.jenisKelamin && 'border-red-500')}><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent><SelectItem value="LAKI_LAKI">Laki-laki</SelectItem><SelectItem value="PEREMPUAN">Perempuan</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Gol. Darah</Label>
                    <Select value={formData.golonganDarah} onValueChange={(v) => onInputChange('golonganDarah', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>{golonganDarahOptions.map(gd => (<SelectItem key={gd} value={gd}>{golonganDarahLabels[gd]}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Agama</Label>
                    <Select value={formData.agama} onValueChange={(v) => onInputChange('agama', v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                      <SelectContent>{agamaOptions.map(a => (<SelectItem key={a} value={a}>{a.charAt(0) + a.slice(1).toLowerCase().replace('_', ' ')}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="suku" className="text-xs text-gray-600">Suku/Etnis</Label>
                    <Input id="suku" value={formData.suku} onChange={(e) => onInputChange('suku', e.target.value)} placeholder="Sunda" className="h-9" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Kontak */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              Kontak
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">No. HP</Label>
                <Input value={formData.noHP} onChange={(e) => onInputChange('noHP', e.target.value)} placeholder="08xxxxxxxxxx" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => onInputChange('email', e.target.value)} placeholder="email@example.com" className="h-9" />
              </div>
            </div>
          </div>

          {/* Section: Pekerjaan & Pendidikan */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              Pekerjaan & Pendidikan
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-0">
                <SearchableCombobox
                  value={formData.pekerjaan}
                  onChange={(v) => onInputChange('pekerjaan', v)}
                  options={pekerjaanGroups}
                  placeholder="Pilih pekerjaan..."
                  searchPlaceholder="Ketik pekerjaan..."
                  emptyMessage="Pekerjaan tidak ditemukan"
                  label="Pekerjaan"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Pendidikan Terakhir</Label>
                <Select value={formData.pendidikan} onValueChange={(v) => onInputChange('pendidikan', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>{pendidikanOptions.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Penghasilan per Bulan</Label>
                <Select value={formData.penghasilan} onValueChange={(v) => onInputChange('penghasilan', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>{penghasilanOptions.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Menu: Keluarga (Perkawinan + Keluarga) */}
      {activeMenu === 'keluarga' && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Data Keluarga</h2>
          </div>

          {/* Section: Status Perkawinan */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-600" />
              Status Perkawinan
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Status Perkawinan</Label>
                <Select value={formData.statusPerkawinan} onValueChange={handleStatusPerkawinanChange}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>{statusPerkawinanOptions.map(s => (<SelectItem key={s} value={s}>{statusPerkawinanLabels[s]}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              {(formData.statusPerkawinan === 'KAWIN_TERCATAT' || formData.statusPerkawinan === 'CERAI_MATI') && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">No. Akta Nikah</Label>
                    <div className="relative">
                      <Input value={formData.aktaPerkawinan} onChange={(e) => onInputChange('aktaPerkawinan', e.target.value)} placeholder="Akta nikah" className="h-9 pr-8" />
                      {formData.aktaPerkawinan && (
                        <button type="button" onClick={() => onInputChange('aktaPerkawinan', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Tanggal Nikah</Label>
                    <div className="relative">
                      <Input type="date" value={formData.tanggalPerkawinan} onChange={(e) => onInputChange('tanggalPerkawinan', e.target.value)} className="h-9 pr-8" />
                      {formData.tanggalPerkawinan && (
                        <button type="button" onClick={() => onInputChange('tanggalPerkawinan', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
              {(formData.statusPerkawinan === 'CERAI_HIDUP_TERCATAT' || formData.statusPerkawinan === 'CERAI_HIDUP_TIDAK_TERCATAT') && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">No. Akta Cerai</Label>
                    <div className="relative">
                      <Input value={formData.aktaPerceraian} onChange={(e) => onInputChange('aktaPerceraian', e.target.value)} placeholder="Akta cerai" className="h-9 pr-8" />
                      {formData.aktaPerceraian && (
                        <button type="button" onClick={() => onInputChange('aktaPerceraian', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Tanggal Cerai</Label>
                    <div className="relative">
                      <Input type="date" value={formData.tanggalPerceraian} onChange={(e) => onInputChange('tanggalPerceraian', e.target.value)} className="h-9 pr-8" />
                      {formData.tanggalPerceraian && (
                        <button type="button" onClick={() => onInputChange('tanggalPerceraian', '')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section: Kartu Keluarga */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-600" />
              Kartu Keluarga
            </h4>

            {/* KK Info untuk mode anggota-kk */}
            {mode === 'anggota-kk' && kkInfo && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">No. KK:</span>
                    <span className="font-mono font-medium text-gray-900">{kkInfo.nomorKK || 'Belum ada Nomor KK'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Kepala KK:</span>
                    <span className="font-medium text-gray-900">{kkInfo.kepalaKeluarga}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="text-gray-500">Alamat:</span>
                    <span className="text-gray-900">{kkInfo.alamat || '-'} - {kkInfo.dusun} RT {kkInfo.rt}/RW {kkInfo.rw}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Badge Kepala Keluarga untuk KK Baru */}
            {mode === 'penduduk-baru' && kkStatus === 'belum-punya' && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 mb-4 flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-sm text-emerald-800 font-medium">Kepala Keluarga (KK Baru)</span>
              </div>
            )}

            {/* Selected KK untuk mode penduduk-baru */}
            {mode === 'penduduk-baru' && selectedKK && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 mb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">No. KK:</span>
                    <span className="font-mono font-medium text-gray-900">{selectedKK.nomorKK || 'Belum ada Nomor KK'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Kepala KK:</span>
                    <span className="font-medium text-gray-900">{selectedKK.kepalaKeluarga}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <span className="text-gray-500">Alamat:</span>
                    <span className="text-gray-900">{selectedKK.alamat || '-'} - {selectedKK.dusun} RT {selectedKK.rt}/RW {selectedKK.rw}</span>
                  </div>
                </div>
              </div>
            )}

            {/* KK Info untuk mode edit — hanya info statis, tidak bisa diganti */}
            {mode === 'edit' && (() => {
              const currentKK = kkOptions.find((kk: any) => kk.id === formData.kkId);
              if (currentKK) {
                return (
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 mb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">No. KK:</span>
                        <span className="font-mono font-medium text-gray-900">{currentKK.nomorKK || 'Belum ada Nomor KK'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Kepala KK:</span>
                        <span className="font-medium text-gray-900">{currentKK.kepalaKeluarga}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Untuk memindahkan ke KK lain, gunakan fitur Mutasi KK.
                    </p>
                  </div>
                );
              }
              return null;
            })()}

            {/* Hubungan dalam Keluarga */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Hubungan dalam KK {(mode === 'anggota-kk' || mode === 'penduduk-baru') && <span className="text-red-500">*</span>}</Label>
                <Select
                  value={formData.hubunganKeluarga}
                  onValueChange={(v) => onInputChange('hubunganKeluarga', v)}
                  disabled={mode === 'penduduk-baru' && kkStatus === 'belum-punya'}
                >
                  <SelectTrigger id="hubunganKeluarga" className={cn("h-9", errors.hubunganKeluarga && "border-red-500")}>
                    <SelectValue placeholder="Pilih hubungan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {getHubunganKeluargaOptions(mode === 'view' ? 'edit' : mode, kkStatus).map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Anak Ke-</Label>
                <Input type="number" min="1" value={formData.anakKe} onChange={(e) => onInputChange('anakKe', e.target.value)} placeholder="1" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Jumlah Saudara</Label>
                <Input type="number" min="0" value={formData.jumlahSaudara} onChange={(e) => onInputChange('jumlahSaudara', e.target.value)} placeholder="0" className="h-9" />
              </div>
            </div>
          </div>

          {/* Section: Data Orang Tua */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Data Orang Tua
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {/* Data Ayah */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data Ayah</p>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Nama Ayah</Label>
                  <Input value={formData.namaAyah} onChange={(e) => onInputChange('namaAyah', e.target.value)} placeholder="Nama ayah" className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">NIK Ayah</Label>
                  <Input value={formData.nikAyah} onChange={(e) => onInputChange('nikAyah', e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="NIK ayah" className="h-9 font-mono text-sm" />
                </div>
              </div>
              {/* Data Ibu */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Data Ibu</p>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Nama Ibu</Label>
                  <Input value={formData.namaIbu} onChange={(e) => onInputChange('namaIbu', e.target.value)} placeholder="Nama ibu" className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">NIK Ibu</Label>
                  <Input value={formData.nikIbu} onChange={(e) => onInputChange('nikIbu', e.target.value.replace(/\D/g, '').slice(0, 16))} placeholder="NIK ibu" className="h-9 font-mono text-sm" />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Menu: Kesehatan */}
      {activeMenu === 'kesehatan' && (
        <>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Kesehatan</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Status Disabilitas</Label>
              <Select value={formData.jenisDisabilitas} onValueChange={(v) => onInputChange('jenisDisabilitas', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>{disabilitasOptions.map(d => (<SelectItem key={d} value={d}>{d === 'TIDAK_ADA' ? 'Tidak Ada' : d.charAt(0) + d.slice(1).toLowerCase()}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            {formData.jenisDisabilitas !== 'TIDAK_ADA' && (
              <div className="space-y-1">
                <Label className="text-xs">Keterangan Disabilitas</Label>
                <Input value={formData.keteranganDisabilitas} onChange={(e) => onInputChange('keteranganDisabilitas', e.target.value)} placeholder="Keterangan" className="h-9" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Penyakit Kronis</Label>
              <Input value={formData.penyakitKronis} onChange={(e) => onInputChange('penyakitKronis', e.target.value)} placeholder="Diabetes, dll" className="h-9" />
            </div>
          </div>
        </>
      )}

      {/* Menu: Dokumen */}
      {activeMenu === 'dokumen' && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Dokumen</h2>
          </div>

          {/* Section: Dokumen Identitas */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Dokumen Identitas
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">No. Akta Kelahiran</Label>
                <Input value={formData.noAktaKelahiran} onChange={(e) => onInputChange('noAktaKelahiran', e.target.value)} placeholder="Nomor akta lahir" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Status KTP</Label>
                <Select value={formData.statusKTP} onValueChange={(v) => onInputChange('statusKTP', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent>{statusKTPOptions.map(s => (<SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">NPWP</Label>
                <Input value={formData.npwp} onChange={(e) => onInputChange('npwp', e.target.value)} placeholder="Nomor NPWP" className="h-9" />
              </div>
            </div>
          </div>

          {/* Section: Asuransi & Jaminan */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-emerald-600" />
              Asuransi & Jaminan
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">No. BPJS Kesehatan</Label>
                <Input value={formData.noBPJSKesehatan} onChange={(e) => onInputChange('noBPJSKesehatan', e.target.value)} placeholder="Nomor BPJS Kesehatan" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">No. BPJS Tenagakerja</Label>
                <Input value={formData.noBPJSTenagakerja} onChange={(e) => onInputChange('noBPJSTenagakerja', e.target.value)} placeholder="Nomor BPJS TK" className="h-9" />
              </div>
            </div>
          </div>

          {/* Section: Kewarganegaraan */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <BadgeCheck className="w-4 h-4 text-emerald-600" />
              Kewarganegaraan
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Kewarganegaraan</Label>
                <Select value={formData.kewarganegaraan} onValueChange={(v) => onInputChange('kewarganegaraan', v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Pilih" /></SelectTrigger>
                  <SelectContent><SelectItem value="WNI">WNI (Warga Negara Indonesia)</SelectItem><SelectItem value="WNA">WNA (Warga Negara Asing)</SelectItem></SelectContent>
                </Select>
              </div>
              {formData.kewarganegaraan === 'WNA' && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">Negara Asal <span className="text-red-500">*</span></Label>
                    <Input value={formData.negaraAsal} onChange={(e) => onInputChange('negaraAsal', e.target.value)} placeholder="Negara asal" className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-600">No. Paspor</Label>
                    <Input value={formData.noPaspor} onChange={(e) => onInputChange('noPaspor', e.target.value)} placeholder="Nomor paspor" className="h-9" />
                  </div>
                </>
              )}
            </div>
            {formData.kewarganegaraan === 'WNA' && (
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">No. KITAS/KITAP</Label>
                  <Input value={formData.noKitasKitap} onChange={(e) => onInputChange('noKitasKitap', e.target.value)} placeholder="Nomor KITAS/KITAP" className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Tanggal Masuk Indonesia</Label>
                  <Input type="date" value={formData.tanggalMasuk} onChange={(e) => onInputChange('tanggalMasuk', e.target.value)} className="h-9" />
                </div>
              </div>
            )}
          </div>

          {/* Section: Unggah Dokumen */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-600" />
              Unggah Dokumen
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {/* Upload KTP */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Scan/Foto KTP</Label>
                <input ref={fotoKTPInputRef} type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'fotoKTP')} className="hidden" />
                {formData.fotoKTP ? (
                  <div className="relative inline-block">
                    <img src={formData.fotoKTP} alt="Foto KTP" className="h-32 object-cover rounded-lg border-2 border-gray-200 shadow-sm" />
                    <button type="button" onClick={() => onSetFormData(prev => ({ ...prev, fotoKTP: '' }))} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-md">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => fotoKTPInputRef.current?.click()} className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-gray-400" />
                    </div>
                    <span className="text-sm text-gray-500">Upload foto KTP</span>
                    <span className="text-xs text-gray-400">Klik untuk memilih file</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
