'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Scale, RefreshCw, ChevronLeft, ChevronRight, Check, AlertTriangle, Users, HeartCrack, ClipboardList, AlertCircle, Home, ArrowRightLeft } from 'lucide-react';
import { NIKSearch, PendudukSearchResult } from './nik-search';
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
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PerceraianSubmitData {
  pendudukId: string;
  kkId: string;
  tanggalPerceraian: string;
  statusPerkawinanTarget: string;
  aktaPerceraian: string | null;
  keterangan: string;
  opsiKKPerceraian: string | null;
  gantiKepalaPerceraianId: string | null;
  hubunganKepalaLamaPerceraian: string | null;
  alamatKKBaru: string | null;
  rtIdKKBaru: string | null;
  dusunIdKKBaru: string | null;
  pindahKKTujuanId: string | null;
}

export interface PerceraianFormProps {
  wilayahOptions: { id: string; label: string; dusunId: string }[];
  submitting: boolean;
  onSubmit: (data: PerceraianSubmitData) => Promise<void>;
  onCancel: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const hubunganOptions = [
  { value: 'ISTRI', label: 'Istri' },
  { value: 'SUAMI', label: 'Suami' },
  { value: 'ANAK', label: 'Anak' },
  { value: 'ANAK_TIRI', label: 'Anak Tiri' },
  { value: 'ANAK_ANGKAT', label: 'Anak Angkat' },
  { value: 'ORANG_TUA', label: 'Orang Tua' },
  { value: 'MENANTU', label: 'Menantu' },
  { value: 'MERTUA', label: 'Mertua' },
  { value: 'CUCU', label: 'Cucu' },
  { value: 'KAKEK', label: 'Kakek' },
  { value: 'NENEK', label: 'Nenek' },
  { value: 'FAMILI_LAIN', label: 'Famili Lain' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

const statusPerkawinanOptions = [
  { value: 'CERAI_HIDUP_TERCATAT', label: 'Cerai Hidup Tercatat', desc: 'Perceraian tercatat di pengadilan (ada akta)' },
  { value: 'CERAI_HIDUP_TIDAK_TERCATAT', label: 'Cerai Hidup Tidak Tercatat', desc: 'Perceraian tidak tercatat / tanpa akta' },
  { value: 'CERAI_MATI', label: 'Cerai Mati', desc: 'Pasangan meninggal dunia' },
];

type OpsiKK = 'TETAP_GANTI_KEPALA' | 'BUAT_KK_BARU' | 'PINDAH_KK_LAIN';

const STEPS = [
  { id: 1, label: 'Pilih Penduduk', icon: HeartCrack },
  { id: 2, label: 'Data Perceraian', icon: Scale },
  { id: 3, label: 'Opsi KK', icon: Users },
  { id: 4, label: 'Konfirmasi', icon: ClipboardList },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function PerceraianForm({
  wilayahOptions,
  submitting,
  onSubmit,
  onCancel,
}: PerceraianFormProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Penduduk
  const [selectedPenduduk, setSelectedPenduduk] = useState<PendudukSearchResult | null>(null);
  const [pasanganData, setPasanganData] = useState<{ id: string; namaLengkap: string; nik: string; statusPerkawinan: string } | null>(null);

  // Step 2: Data Perceraian
  const [tanggalPerceraian, setTanggalPerceraian] = useState(new Date().toISOString().split('T')[0]);
  const [statusPerkawinanTarget, setStatusPerkawinanTarget] = useState('CERAI_HIDUP_TIDAK_TERCATAT');
  const [aktaPerceraian, setAktaPerceraian] = useState('');
  const [keterangan, setKeterangan] = useState('');

  // Step 3: Opsi KK (hanya jika kepala KK)
  const [isKepalaKK, setIsKepalaKK] = useState(false);
  const [sisaAnggota, setSisaAnggota] = useState<{ id: string; namaLengkap: string; nik: string; hubunganKeluarga: string }[]>([]);
  const [loadingAnggota, setLoadingAnggota] = useState(false);
  const [opsiKK, setOpsiKK] = useState<OpsiKK>('TETAP_GANTI_KEPALA');
  const [gantiKepalaId, setGantiKepalaId] = useState('');
  const [hubunganLama, setHubunganLama] = useState('ORANG_TUA');
  const [alamatKKBaru, setAlamatKKBaru] = useState('');
  const [rtIdKKBaru, setRtIdKKBaru] = useState('');
  const [dusunIdKKBaru, setDusunIdKKBaru] = useState('');
  const [selectedKKTujuan, setSelectedKKTujuan] = useState<PendudukSearchResult | null>(null);

  // Fetch pasangan data when penduduk selected
  useEffect(() => {
    if (!selectedPenduduk?.pasanganId) {
      setPasanganData(null);
      return;
    }
    const fetchPasangan = async () => {
      try {
        const res = await fetch(`/api/kependudukan/penduduk/${selectedPenduduk.pasanganId}`);
        const data = await res.json();
        if (data.success && data.data) {
          setPasanganData({
            id: data.data.id,
            namaLengkap: data.data.namaLengkap,
            nik: data.data.nik || '-',
            statusPerkawinan: data.data.statusPerkawinan || '-',
          });
        }
      } catch {
        setPasanganData(null);
      }
    };
    fetchPasangan();
  }, [selectedPenduduk?.pasanganId]);

  // Fetch sisa anggota KK when penduduk is kepala
  useEffect(() => {
    if (!selectedPenduduk || selectedPenduduk.hubunganKeluarga !== 'KEPALA_KELUARGA' || !selectedPenduduk.kkId) {
      setIsKepalaKK(false);
      setSisaAnggota([]);
      return;
    }

    setIsKepalaKK(true);
    const fetchAnggota = async () => {
      setLoadingAnggota(true);
      try {
        const res = await fetch(`/api/kependudukan/kk/${selectedPenduduk.kkId}`);
        const data = await res.json();
        if (data.success && data.data?.anggota) {
          const anggota = data.data.anggota
            .filter((a: any) => a.id !== selectedPenduduk.id && a.status !== 'MENINGGAL' && a.isActive !== false)
            .map((a: any) => ({
              id: a.id,
              namaLengkap: a.namaLengkap,
              nik: a.nik || '',
              hubunganKeluarga: a.hubunganKeluarga,
            }));
          setSisaAnggota(anggota);
          // Auto-switch opsi if no members left
          if (anggota.length === 0) {
            setOpsiKK('BUAT_KK_BARU');
            setGantiKepalaId('');
          }
        }
      } catch {
        setSisaAnggota([]);
      } finally {
        setLoadingAnggota(false);
      }
    };
    fetchAnggota();
  }, [selectedPenduduk]);

  // Validation
  const tanggalError = tanggalPerceraian === ''
    ? 'Tanggal perceraian wajib diisi'
    : tanggalPerceraian && new Date(tanggalPerceraian) > new Date()
      ? 'Tanggal perceraian tidak boleh lebih dari hari ini'
      : '';

  const isTercatat = statusPerkawinanTarget === 'CERAI_HIDUP_TERCATAT';
  const aktaError = isTercatat && aktaPerceraian.trim() === '' ? 'No. Akta perceraian wajib diisi untuk perceraian tercatat' : '';

  const step1Valid = !!selectedPenduduk;
  const step2Valid = !tanggalError && !aktaError;
  const step3Valid = isKepalaKK
    ? (opsiKK === 'TETAP_GANTI_KEPALA'
        ? sisaAnggota.length === 0 || gantiKepalaId !== ''
        : opsiKK === 'BUAT_KK_BARU'
          ? (alamatKKBaru.trim() !== '' && (sisaAnggota.length === 0 || gantiKepalaId !== ''))
          : opsiKK === 'PINDAH_KK_LAIN'
            ? (!!selectedKKTujuan && (sisaAnggota.length === 0 || gantiKepalaId !== ''))
            : false)
    : true;

  const canNext = currentStep === 1 ? step1Valid
    : currentStep === 2 ? step2Valid
    : currentStep === 3 ? step3Valid
    : true;

  // If not kepala KK, skip step 3
  const totalSteps = isKepalaKK ? 4 : 3;

  const handleNext = () => {
    if (currentStep < totalSteps && canNext) {
      if (currentStep === 2 && !isKepalaKK) {
        setCurrentStep(4); // Skip step 3
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      if (currentStep === 4 && !isKepalaKK) {
        setCurrentStep(2); // Skip back over step 3
      } else {
        setCurrentStep(prev => prev - 1);
      }
    }
  };

  const handleSubmit = () => {
    onSubmit({
      pendudukId: selectedPenduduk!.id,
      kkId: selectedPenduduk!.kkId || '',
      tanggalPerceraian,
      statusPerkawinanTarget,
      aktaPerceraian: isTercatat ? aktaPerceraian : null,
      keterangan,
      opsiKKPerceraian: isKepalaKK ? opsiKK : null,
      gantiKepalaPerceraianId: isKepalaKK && gantiKepalaId ? gantiKepalaId : null,
      hubunganKepalaLamaPerceraian: isKepalaKK ? hubunganLama : null,
      alamatKKBaru: isKepalaKK && opsiKK === 'BUAT_KK_BARU' ? alamatKKBaru : null,
      rtIdKKBaru: isKepalaKK && opsiKK === 'BUAT_KK_BARU' ? rtIdKKBaru : null,
      dusunIdKKBaru: isKepalaKK && opsiKK === 'BUAT_KK_BARU' ? dusunIdKKBaru : null,
      pindahKKTujuanId: isKepalaKK && opsiKK === 'PINDAH_KK_LAIN' && selectedKKTujuan ? selectedKKTujuan.kkId : null,
    });
  };

  // Step indicators (hide step 3 if not kepala)
  const visibleSteps = isKepalaKK ? STEPS : STEPS.filter(s => s.id !== 3);

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {visibleSteps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id || (currentStep === 4 && step.id === 3);
          const isDone = currentStep > step.id;
          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isDone ? 'bg-emerald-600 text-white' :
                  isActive ? 'bg-purple-100 text-purple-700 border-2 border-purple-500' :
                  'bg-gray-100 text-gray-400 border-2 border-gray-200'
                )}>
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={cn('text-xs font-medium hidden sm:block', {
                  'text-purple-700': isActive,
                  'text-emerald-600': isDone,
                  'text-gray-400': !isActive && !isDone,
                })}>
                  {step.label}
                </span>
              </div>
              {idx < visibleSteps.length - 1 && (
                <div className={cn('w-8 h-0.5', currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200')} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1: Pilih Penduduk */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-800">
              <strong>Step 1:</strong> Pilih penduduk yang bercerai. Status perkawinan penduduk dan pasangannya akan diubah menjadi CERAI.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Cari Penduduk <span className="text-red-500">*</span></Label>
            <NIKSearch
              onSelect={(p) => setSelectedPenduduk(p)}
              selectedPenduduk={selectedPenduduk}
              onClear={() => {
                setSelectedPenduduk(null);
                setPasanganData(null);
                setIsKepalaKK(false);
                setSisaAnggota([]);
                setGantiKepalaId('');
                setOpsiKK('TETAP_GANTI_KEPALA');
              }}
              placeholder="Cari NIK atau nama penduduk..."
            />
          </div>

          {selectedPenduduk && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{selectedPenduduk.namaLengkap}</p>
                    {selectedPenduduk.hubunganKeluarga === 'KEPALA_KELUARGA' && (
                      <Badge className="bg-orange-100 text-orange-700 text-xs">Kepala KK</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 font-mono">NIK: {selectedPenduduk.nik}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">Status Kawin</span><p className="font-medium">{selectedPenduduk.statusPerkawinan?.replace(/_/g, ' ') || '-'}</p></div>
                <div><span className="text-gray-400">No. KK</span><p className="font-mono text-xs font-medium">{selectedPenduduk.nomorKK || '-'}</p></div>
              </div>

              {/* Pasangan info */}
              {pasanganData ? (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">Pasangan Terhubung</p>
                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                      <HeartCrack className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-blue-900">{pasanganData.namaLengkap}</p>
                      <p className="text-xs text-blue-700 font-mono">{pasanganData.nik}</p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 text-xs">Juga ikut diupdate</Badge>
                  </div>
                </div>
              ) : selectedPenduduk.statusPerkawinan?.startsWith('KAWIN') ? (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
                  <strong>Perhatian:</strong> Tidak ada data pasangan terhubung di sistem. Hanya penduduk yang dipilih yang akan diupdate.
                </div>
              ) : null}

              {/* Kepala KK warning */}
              {isKepalaKK && (
                <div className="p-2 bg-orange-50 rounded-lg border border-orange-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
                  <span className="text-xs text-orange-700">
                    Kepala Keluarga — perlu atur tindakan KK di step selanjutnya
                    {sisaAnggota.length > 0 ? ` (${sisaAnggota.length} anggota tersisa)` : ' (KK akan dinonaktifkan)'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Data Perceraian */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-800">
              <strong>Step 2:</strong> Lengkapi data perceraian. Tanggal dan jenis perceraian wajib diisi.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">
              Tanggal Perceraian <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={tanggalPerceraian}
              onChange={(e) => setTanggalPerceraian(e.target.value)}
              className={cn('h-10', tanggalError ? 'border-red-500 focus-visible:ring-red-500' : '')}
              max={new Date().toISOString().split('T')[0]}
            />
            {tanggalError && <p className="text-xs text-red-500">{tanggalError}</p>}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">
              Jenis Perceraian <span className="text-red-500">*</span>
            </Label>
            <div className="space-y-1.5">
              {statusPerkawinanOptions.map(opt => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    statusPerkawinanTarget === opt.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:bg-gray-50'
                  )}
                >
                  <input
                    type="radio"
                    name="status-perceraian"
                    checked={statusPerkawinanTarget === opt.value}
                    onChange={() => {
                      setStatusPerkawinanTarget(opt.value);
                      if (opt.value !== 'CERAI_HIDUP_TERCATAT') setAktaPerceraian('');
                    }}
                    className="accent-purple-600 mt-0.5"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                    <p className="text-xs text-gray-500">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {isTercatat && (
            <div className="space-y-2">
              <Label className="text-sm">
                No. Akta Perceraian <span className="text-red-500">*</span>
              </Label>
              <Input
                value={aktaPerceraian}
                onChange={(e) => setAktaPerceraian(e.target.value)}
                placeholder="Nomor akta perceraian dari pengadilan"
                className={cn('h-10', aktaError ? 'border-red-500 focus-visible:ring-red-500' : '')}
              />
              {aktaError && <p className="text-xs text-red-500">{aktaError}</p>}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Keterangan</Label>
            <Textarea
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Keterangan tambahan (opsional)"
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
      )}

      {/* Step 3: Opsi KK (hanya jika Kepala KK) */}
      {currentStep === 3 && isKepalaKK && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-800">
              <strong>Step 3:</strong> Karena penduduk adalah Kepala Keluarga, atur tindakan untuk KK.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-purple-900">Tindakan untuk Kartu Keluarga:</label>
            <div className="space-y-1.5">
              {/* Opsi A */}
              {sisaAnggota.length > 0 && (
                <label className={cn(
                  'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all',
                  opsiKK === 'TETAP_GANTI_KEPALA' ? 'border-purple-500 bg-purple-100' : 'border-purple-300 hover:bg-purple-100'
                )}>
                  <input type="radio" name="opsi-kk" checked={opsiKK === 'TETAP_GANTI_KEPALA'} onChange={() => setOpsiKK('TETAP_GANTI_KEPALA')} className="accent-purple-600" />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-purple-900">Tetap di KK, ganti kepala</span>
                    <p className="text-xs text-purple-600">Kepala lama tetap anggota dengan hubungan baru</p>
                  </div>
                </label>
              )}
              {/* Opsi B */}
              <label className={cn(
                'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all',
                opsiKK === 'BUAT_KK_BARU' ? 'border-purple-500 bg-purple-100' : 'border-purple-300 hover:bg-purple-100'
              )}>
                <input type="radio" name="opsi-kk" checked={opsiKK === 'BUAT_KK_BARU'} onChange={() => setOpsiKK('BUAT_KK_BARU')} className="accent-purple-600" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-purple-900">Buat KK baru</span>
                  <p className="text-xs text-purple-600">Kepala lama keluar dan menjadi kepala KK baru</p>
                </div>
              </label>
              {/* Opsi C */}
              <label className={cn(
                'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all',
                opsiKK === 'PINDAH_KK_LAIN' ? 'border-purple-500 bg-purple-100' : 'border-purple-300 hover:bg-purple-100'
              )}>
                <input type="radio" name="opsi-kk" checked={opsiKK === 'PINDAH_KK_LAIN'} onChange={() => setOpsiKK('PINDAH_KK_LAIN')} className="accent-purple-600" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-purple-900">Pindah ke KK lain</span>
                  <p className="text-xs text-purple-600">Kepala lama pindah ke KK yang sudah ada</p>
                </div>
              </label>
            </div>
          </div>

          {/* Pengganti kepala (jika ada sisa anggota) */}
          {sisaAnggota.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-purple-900">
                Pilih Pengganti Kepala KK <span className="text-red-500">*</span>
              </label>
              {loadingAnggota ? (
                <div className="text-center py-3 text-sm text-purple-700">Memuat...</div>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {sisaAnggota.map(a => (
                    <label key={a.id} className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all',
                      gantiKepalaId === a.id ? 'border-purple-500 bg-purple-100' : 'border-gray-200 hover:border-purple-400'
                    )}>
                      <input type="radio" name="pengganti" checked={gantiKepalaId === a.id} onChange={() => setGantiKepalaId(a.id)} className="accent-purple-600" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{a.namaLengkap}</p>
                        <p className="text-xs text-gray-500">{a.nik} · {a.hubunganKeluarga.replace(/_/g, ' ')}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Hubungan kepala lama (selain BUAT_KK_BARU tanpa sisa) */}
          {(opsiKK === 'TETAP_GANTI_KEPALA' || opsiKK === 'PINDAH_KK_LAIN') && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-purple-900">
                Hubungan {selectedPenduduk?.namaLengkap} di KK {opsiKK === 'PINDAH_KK_LAIN' ? 'tujuan' : 'setelah diganti'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {hubunganOptions.map(h => (
                  <button
                    key={h.value}
                    type="button"
                    onClick={() => setHubunganLama(h.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-xs border transition-all',
                      hubunganLama === h.value
                        ? 'border-purple-500 bg-purple-200 text-purple-900 font-medium'
                        : 'border-purple-300 text-purple-700 hover:bg-purple-100'
                    )}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opsi B: Form KK Baru */}
          {opsiKK === 'BUAT_KK_BARU' && (
            <div className="space-y-3 pt-2 border-t border-purple-200">
              <p className="text-sm font-medium text-purple-900">Data KK Baru</p>
              <div className="space-y-2">
                <Label className="text-sm">Alamat KK Baru <span className="text-red-500">*</span></Label>
                <Input value={alamatKKBaru} onChange={(e) => setAlamatKKBaru(e.target.value)} placeholder="Alamat untuk KK baru" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">RT/RW/Dusun</Label>
                <Select value={rtIdKKBaru} onValueChange={(v) => { setRtIdKKBaru(v); const opt = wilayahOptions.find(w => w.id === v); setDusunIdKKBaru(opt?.dusunId || ''); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih RT/RW/Dusun" /></SelectTrigger>
                  <SelectContent>
                    {wilayahOptions.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Opsi C: Pilih KK Tujuan via NIKSearch */}
          {opsiKK === 'PINDAH_KK_LAIN' && (
            <div className="space-y-3 pt-2 border-t border-purple-200">
              <p className="text-sm font-medium text-purple-900">Pindah ke KK Lain</p>
              <div className="space-y-2">
                <Label className="text-sm">Cari KK Tujuan <span className="text-red-500">*</span></Label>
                <NIKSearch
                  onSelect={(p) => setSelectedKKTujuan(p)}
                  selectedPenduduk={selectedKKTujuan}
                  onClear={() => setSelectedKKTujuan(null)}
                  placeholder="Cari anggota KK tujuan..."
                  showLabel={false}
                />
              </div>
              {selectedKKTujuan && (
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                  <p className="font-medium text-blue-900">{selectedKKTujuan.nomorKK}</p>
                  <p className="text-xs text-blue-700">Kepala: {selectedKKTujuan.displayText}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 4: Konfirmasi */}
      {currentStep === 4 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-800">
              <strong>Step {isKepalaKK ? '4' : '3'}:</strong> Periksa kembali data sebelum menyimpan.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
            {/* Penduduk & Pasangan */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <HeartCrack className="w-4 h-4 text-purple-500" />
                Data Perceraian
              </h4>
              <div className="space-y-2">
                <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <div><span className="text-gray-400">Penduduk</span><p className="font-medium">{selectedPenduduk?.namaLengkap}</p></div>
                    <div><span className="text-gray-400">NIK</span><p className="font-mono text-xs">{selectedPenduduk?.nik}</p></div>
                    <div><span className="text-gray-400">Status Baru</span>
                      <Badge className="bg-purple-200 text-purple-800 text-xs">{statusPerkawinanTarget.replace(/_/g, ' ')}</Badge>
                    </div>
                    <div><span className="text-gray-400">Tanggal</span><p className="font-medium">{tanggalPerceraian ? new Date(tanggalPerceraian).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p></div>
                  </div>
                </div>
                {pasanganData && (
                  <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs font-medium text-blue-700 mb-1">Pasangan Juga Diupdate</p>
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      <div><span className="text-gray-400">Nama</span><p className="font-medium">{pasanganData.namaLengkap}</p></div>
                      <div><span className="text-gray-400">NIK</span><p className="font-mono text-xs">{pasanganData.nik}</p></div>
                    </div>
                  </div>
                )}
                {isTercatat && aktaPerceraian && (
                  <div><span className="text-gray-400 text-xs">No. Akta</span><p className="font-mono text-sm">{aktaPerceraian}</p></div>
                )}
                {keterangan && <div><span className="text-gray-400 text-xs">Keterangan</span><p className="text-sm">{keterangan}</p></div>}
              </div>
            </div>

            {/* KK Action */}
            {isKepalaKK && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  Tindakan KK
                </h4>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-gray-400">Opsi: </span>
                    <Badge className="bg-purple-100 text-purple-700 text-xs">
                      {opsiKK === 'TETAP_GANTI_KEPALA' ? 'Tetap, Ganti Kepala' : opsiKK === 'BUAT_KK_BARU' ? 'Buat KK Baru' : 'Pindah ke KK Lain'}
                    </Badge>
                  </div>
                  {sisaAnggota.length > 0 && gantiKepalaId && (
                    <div className="text-sm">
                      <span className="text-gray-400">Pengganti: </span>
                      <span className="font-medium">{sisaAnggota.find(a => a.id === gantiKepalaId)?.namaLengkap}</span>
                    </div>
                  )}
                  {opsiKK === 'BUAT_KK_BARU' && (
                    <div className="text-sm"><span className="text-gray-400">Alamat KK Baru: </span><span className="font-medium">{alamatKKBaru}</span></div>
                  )}
                  {opsiKK === 'PINDAH_KK_LAIN' && selectedKKTujuan && (
                    <div className="text-sm"><span className="text-gray-400">KK Tujuan: </span><span className="font-mono font-medium">{selectedKKTujuan.nomorKK}</span></div>
                  )}
                </div>
              </div>
            )}

            {/* Auto action */}
            <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-700">
                <strong>Otomatis:</strong> Status Perkawinan → <Badge className="bg-purple-200 text-purple-800 text-[10px] px-1.5 py-0 ml-1">{statusPerkawinanTarget.replace(/_/g, ' ')}</Badge> · pasanganId dihapus
                {pasanganData ? ' · Status pasangan juga diupdate' : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
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
          {currentStep < totalSteps ? (
            <Button type="button" onClick={handleNext} disabled={!canNext} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={submitting} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              Simpan Perceraian
            </Button>
          )}
        </div>
      </DialogFooter>
    </div>
  );
}
