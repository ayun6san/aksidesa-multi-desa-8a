'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, Check, AlertTriangle, Baby, Users, ClipboardList } from 'lucide-react';
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

const agamaOptions = ['ISLAM', 'KRISTEN', 'KATOLIK', 'HINDU', 'BUDDHA', 'KONGHUCU', 'LAINNYA'];

const agamaLabels: Record<string, string> = {
  ISLAM: 'Islam', KRISTEN: 'Kristen', KATOLIK: 'Katolik',
  HINDU: 'Hindu', BUDDHA: 'Buddha', KONGHUCU: 'Konghucu', LAINNYA: 'Lainnya',
};

interface KKMember {
  id: string;
  nik: string;
  namaLengkap: string;
  hubunganKeluarga: string;
}

export interface KelahiranFormProps {
  kelahiranForm: {
    namaBayi: string;
    jenisKelamin: string;
    tanggalLahir: string;
    tempatLahir: string;
    agama: string;
    beratBayi: string;
    panjangBayi: string;
    kkId: string;
    namaAyah: string;
    nikAyah: string;
    namaIbu: string;
    nikIbu: string;
    keterangan: string;
    noAktaKelahiran: string;
  };
  setKelahiranForm: React.Dispatch<React.SetStateAction<KelahiranFormProps['kelahiranForm']>>;
  selectedIbu: PendudukSearchResult | null;
  setSelectedIbu: (p: PendudukSearchResult) => void;
  onClearIbu: () => void;
  submitting: boolean;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
}

const STEPS = [
  { id: 1, label: 'Cari Ibu', icon: Users },
  { id: 2, label: 'Data Bayi', icon: Baby },
  { id: 3, label: 'Konfirmasi', icon: ClipboardList },
];

export default function KelahiranForm({
  kelahiranForm,
  setKelahiranForm,
  selectedIbu,
  setSelectedIbu,
  onClearIbu,
  submitting,
  onSubmit,
  onCancel,
}: KelahiranFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [kkMembers, setKKMembers] = useState<KKMember[]>([]);
  const [loadingKK, setLoadingKK] = useState(false);

  // Calculate days since birth for 60-day warning
  const daysSinceBirth = useMemo(() => {
    if (!kelahiranForm.tanggalLahir) return null;
    const birthDate = new Date(kelahiranForm.tanggalLahir);
    const now = new Date();
    const diffMs = now.getTime() - birthDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }, [kelahiranForm.tanggalLahir]);

  const isOver60Days = daysSinceBirth !== null && daysSinceBirth > 60;

  // Handle Ibu selected from NIKSearch
  const handleIbuSelected = (p: PendudukSearchResult) => {
    // If user switches to a different ibu, reset ayah data so new KK auto-fill works
    const isDifferentKK = selectedIbu && selectedIbu.kkId !== p.kkId;
    setSelectedIbu(p);
    // Auto-fill ibu data & kkId
    setKelahiranForm(prev => ({
      ...prev,
      kkId: p.kkId || '',
      namaIbu: p.namaLengkap || '',
      nikIbu: p.nik || '',
      // Reset ayah data if switching to different KK so auto-fill from new KK can work
      ...(isDifferentKK ? { namaAyah: '', nikAyah: '' } : {}),
    }));
  };

  // Fetch KK members when kkId changes (for auto-fill ayah)
  useEffect(() => {
    if (!kelahiranForm.kkId) {
      setKKMembers([]);
      return;
    }

    const fetchKKMembers = async () => {
      setLoadingKK(true);
      try {
        const res = await fetch(`/api/kependudukan/kk/${kelahiranForm.kkId}`);
        const data = await res.json();
        if (data.success && data.data?.anggota) {
          const members: KKMember[] = data.data.anggota.map((a: any) => ({
            id: a.id,
            nik: a.nik || '',
            namaLengkap: a.namaLengkap,
            hubunganKeluarga: a.hubunganKeluarga,
          }));
          setKKMembers(members);

          // Auto-fill ayah from KK members (exclude the selected ibu)
          const kepala = members.find(m => m.hubunganKeluarga === 'KEPALA_KELUARGA' && m.id !== selectedIbu?.id);
          const suami = members.find(m => m.hubunganKeluarga === 'SUAMI' && m.id !== selectedIbu?.id);
          const istriNonIbu = members.find(m => m.hubunganKeluarga === 'ISTRI' && m.id !== selectedIbu?.id);

          // Determine ayah: suami first, then kepala (if not the ibu)
          let ayah = suami || kepala;

          // Only auto-fill if ayah field is empty
          setKelahiranForm(prev => ({
            ...prev,
            ...(prev.namaAyah === '' && ayah ? { namaAyah: ayah.namaLengkap, nikAyah: ayah.nik } : {}),
          }));
        }
      } catch {
        setKKMembers([]);
      } finally {
        setLoadingKK(false);
      }
    };

    fetchKKMembers();
  }, [kelahiranForm.kkId, selectedIbu?.id]);

  const updateField = (field: string, value: string) => {
    setKelahiranForm(prev => ({ ...prev, [field]: value }));
  };

  // Validation
  const step1Valid = kelahiranForm.kkId !== '' && kelahiranForm.namaIbu !== '';
  const tanggalLahirValid = kelahiranForm.tanggalLahir !== '' && new Date(kelahiranForm.tanggalLahir) <= new Date();
  const tanggalLahirError = kelahiranForm.tanggalLahir === ''
    ? 'Tanggal lahir wajib diisi'
    : kelahiranForm.tanggalLahir && new Date(kelahiranForm.tanggalLahir) > new Date()
      ? 'Tanggal lahir tidak boleh lebih dari hari ini'
      : '';
  const step2Valid = kelahiranForm.namaBayi.trim() !== '' && tanggalLahirValid;

  const canNext = currentStep === 1 ? step1Valid : currentStep === 2 ? step2Valid : true;

  const handleNext = () => {
    if (currentStep < 3 && canNext) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    onSubmit();
  };

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
                <span className={`text-xs font-medium hidden sm:block ${
                  isActive ? 'text-emerald-700' : isDone ? 'text-emerald-600' : 'text-gray-400'
                }`}>
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

      {/* Step 1: Cari Data Ibu */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Step 1:</strong> Cari data ibu dari penduduk terdaftar. KK dan data ayah akan otomatis terisi.
            </p>
          </div>

          {/* NIKSearch for Ibu */}
          <div className="space-y-2">
            <Label>
              Cari Data Ibu <span className="text-red-500">*</span>
            </Label>
            <NIKSearch
              onSelect={handleIbuSelected}
              selectedPenduduk={selectedIbu}
              onClear={onClearIbu}
              placeholder="Cari NIK atau nama ibu..."
              filterJenisKelamin="PEREMPUAN"
              showLabel={false}
            />
          </div>

          {/* Ibu & KK info card */}
          {selectedIbu && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Nama Ibu</span><p className="font-medium">{selectedIbu.namaLengkap}</p></div>
                <div><span className="text-gray-400">NIK Ibu</span><p className="font-mono text-xs">{selectedIbu.nik || '-'}</p></div>
                <div><span className="text-gray-400">No. KK</span><p className="font-mono text-xs font-medium">{selectedIbu.nomorKK || '-'}</p></div>
                <div><span className="text-gray-400">Kepala KK</span><p className="font-medium text-xs">{selectedIbu.displayText || '-'}</p></div>
              </div>
              {loadingKK && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Memuat data ayah dari KK...
                </div>
              )}
              {kelahiranForm.namaAyah && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-400">Nama Ayah</span><p className="font-medium">{kelahiranForm.namaAyah}</p></div>
                    <div><span className="text-gray-400">NIK Ayah</span><p className="font-mono text-xs">{kelahiranForm.nikAyah || '-'}</p></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Data Bayi */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Step 2:</strong> Lengkapi data bayi. Data orang tua sudah terisi otomatis dan bisa diedit.
            </p>
          </div>

          {/* 60-day warning */}
          {isOver60Days && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Melampaui Batas 60 Hari</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Kelahiran tercatat {daysSinceBirth} hari yang lalu. Sesuai UU No. 24 Tahun 2013, pelaporan kelahiran sebaiknya dalam 60 hari. Data tetap bisa disimpan.
                </p>
              </div>
            </div>
          )}

          {/* Data Bayi */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Baby className="w-4 h-4 text-pink-500" />
              Data Bayi
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">
                  Nama Bayi <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={kelahiranForm.namaBayi}
                  onChange={(e) => updateField('namaBayi', e.target.value)}
                  placeholder="Nama lengkap bayi"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Jenis Kelamin</Label>
                <Select
                  value={kelahiranForm.jenisKelamin}
                  onValueChange={(v) => updateField('jenisKelamin', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LAKI_LAKI">Laki-laki</SelectItem>
                    <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">
                  Tanggal Lahir <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={kelahiranForm.tanggalLahir}
                  onChange={(e) => updateField('tanggalLahir', e.target.value)}
                  className={`h-9 ${tanggalLahirError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  max={new Date().toISOString().split('T')[0]}
                />
                {tanggalLahirError && (
                  <p className="text-xs text-red-500">{tanggalLahirError}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Tempat Lahir</Label>
                <Input
                  value={kelahiranForm.tempatLahir}
                  onChange={(e) => updateField('tempatLahir', e.target.value)}
                  placeholder="RS/Bidan/Puskesmas/Rumah"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Agama</Label>
                <Select
                  value={kelahiranForm.agama}
                  onValueChange={(v) => updateField('agama', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {agamaOptions.map((a) => (
                      <SelectItem key={a} value={a}>
                        {agamaLabels[a] || a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">No. Akta Kelahiran</Label>
                <Input
                  value={kelahiranForm.noAktaKelahiran}
                  onChange={(e) => updateField('noAktaKelahiran', e.target.value)}
                  placeholder="Opsional, bisa diisi nanti"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Berat Bayi (kg)</Label>
                <Input
                  value={kelahiranForm.beratBayi}
                  onChange={(e) => updateField('beratBayi', e.target.value)}
                  placeholder="3.5"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Panjang Bayi (cm)</Label>
                <Input
                  value={kelahiranForm.panjangBayi}
                  onChange={(e) => updateField('panjangBayi', e.target.value)}
                  placeholder="50"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Data Orang Tua */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Data Orang Tua
              <Badge className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0">Auto-fill</Badge>
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Nama Ayah</Label>
                <Input
                  value={kelahiranForm.namaAyah}
                  onChange={(e) => updateField('namaAyah', e.target.value)}
                  placeholder="Nama ayah"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">NIK Ayah</Label>
                <Input
                  value={kelahiranForm.nikAyah}
                  onChange={(e) => updateField('nikAyah', e.target.value)}
                  maxLength={16}
                  placeholder="16 digit NIK"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">Nama Ibu</Label>
                <Input
                  value={kelahiranForm.namaIbu}
                  onChange={(e) => updateField('namaIbu', e.target.value)}
                  placeholder="Nama ibu"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">NIK Ibu</Label>
                <Input
                  value={kelahiranForm.nikIbu}
                  onChange={(e) => updateField('nikIbu', e.target.value)}
                  maxLength={16}
                  placeholder="16 digit NIK"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Keterangan */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-600">Keterangan</Label>
            <Textarea
              value={kelahiranForm.keterangan}
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
              <strong>Step 3:</strong> Periksa kembali data sebelum menyimpan. Data bayi akan otomatis terdaftar sebagai penduduk baru.
            </p>
          </div>

          {/* Summary card */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
            {/* KK */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Kartu Keluarga</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">No. KK</span><p className="font-mono font-medium">{selectedIbu?.nomorKK || '-'}</p></div>
                <div><span className="text-gray-400">Kepala KK</span><p className="font-medium">{selectedIbu?.displayText || '-'}</p></div>
              </div>
            </div>

            {/* Bayi */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Baby className="w-4 h-4 text-pink-500" />
                Data Bayi
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Nama</span><p className="font-medium">{kelahiranForm.namaBayi || '-'}</p></div>
                <div><span className="text-gray-400">Jenis Kelamin</span><p className="font-medium">{kelahiranForm.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}</p></div>
                <div><span className="text-gray-400">Tanggal Lahir</span><p className="font-medium">{kelahiranForm.tanggalLahir ? new Date(kelahiranForm.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p></div>
                <div><span className="text-gray-400">Tempat Lahir</span><p className="font-medium">{kelahiranForm.tempatLahir || '-'}</p></div>
                <div><span className="text-gray-400">Agama</span><p className="font-medium">{agamaLabels[kelahiranForm.agama] || kelahiranForm.agama}</p></div>
                <div><span className="text-gray-400">No. Akta Kelahiran</span><p className="font-medium">{kelahiranForm.noAktaKelahiran || <span className="text-gray-300 italic">Belum diisi</span>}</p></div>
                {kelahiranForm.beratBayi && <div><span className="text-gray-400">Berat</span><p className="font-medium">{kelahiranForm.beratBayi} kg</p></div>}
                {kelahiranForm.panjangBayi && <div><span className="text-gray-400">Panjang</span><p className="font-medium">{kelahiranForm.panjangBayi} cm</p></div>}
              </div>
            </div>

            {/* Orang Tua */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Orang Tua
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Ayah</span><p className="font-medium">{kelahiranForm.namaAyah || '-'}</p><p className="text-xs text-gray-400 font-mono">{kelahiranForm.nikAyah || '-'}</p></div>
                <div><span className="text-gray-400">Ibu</span><p className="font-medium">{kelahiranForm.namaIbu || '-'}</p><p className="text-xs text-gray-400 font-mono">{kelahiranForm.nikIbu || '-'}</p></div>
              </div>
            </div>

            {/* 60-day warning in summary */}
            {isOver60Days && (
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs text-amber-700">Kelahiran dilaporkan setelah {daysSinceBirth} hari (batas 60 hari)</span>
              </div>
            )}

            {/* Auto-generated info */}
            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs text-emerald-700">
                <strong>Otomatis:</strong> Status Penduduk: <Badge className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0 ml-1">TETAP</Badge> • Hubungan: <Badge className="bg-emerald-200 text-emerald-800 text-[10px] px-1.5 py-0 ml-1">ANAK</Badge> • NIK bisa diisi nanti melalui edit data penduduk
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <DialogFooter className="flex-row gap-2 sm:justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="gap-1"
          >
            Batal
          </Button>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Sebelumnya
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canNext}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              Selanjutnya
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !step2Valid}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              Simpan Kelahiran
            </Button>
          )}
        </div>
      </DialogFooter>
    </div>
  );
}
