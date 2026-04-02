'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, Users, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Check, AlertTriangle, MapPin, ArrowRightLeft, ClipboardList } from 'lucide-react';
import { NIKSearch, PendudukSearchResult } from './nik-search';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PindahKeluarSubmitData {
  pindahKeluarIds: string[];
  kkId: string;
  gantiKepalaPindahId: string | null;
}

export interface PindahKeluarFormProps {
  tanggalPeristiwa: string;
  alamatTujuan: string;
  keterangan: string;
  setTanggalPeristiwa: (v: string) => void;
  setAlamatTujuan: (v: string) => void;
  setKeterangan: (v: string) => void;
  submitting: boolean;
  onSubmit: (data: PindahKeluarSubmitData) => Promise<void>;
  onCancel: () => void;
}

interface KKAnggota {
  id: string;
  namaLengkap: string;
  nik: string;
  hubunganKeluarga: string;
  status: string;
}

const hubunganLabels: Record<string, string> = {
  KEPALA_KELUARGA: 'Kepala Keluarga',
  ISTRI: 'Istri',
  SUAMI: 'Suami',
  ANAK: 'Anak',
  ANAK_TIRI: 'Anak Tiri',
  ANAK_ANGKAT: 'Anak Angkat',
  MENANTU: 'Menantu',
  CUCU: 'Cucu',
  KAKEK: 'Kakek',
  NENEK: 'Nenek',
  ORANG_TUA: 'Orang Tua',
  MERTUA: 'Mertua',
  FAMILI_LAIN: 'Famili Lain',
  PEMBANTU: 'Pembantu',
  LAINNYA: 'Lainnya',
};

const STEPS = [
  { id: 1, label: 'Pilih Penduduk', icon: Users },
  { id: 2, label: 'Data Pindah', icon: ArrowRightLeft },
  { id: 3, label: 'Konfirmasi', icon: ClipboardList },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function PindahKeluarForm({
  tanggalPeristiwa,
  alamatTujuan,
  keterangan,
  setTanggalPeristiwa,
  setAlamatTujuan,
  setKeterangan,
  submitting,
  onSubmit,
  onCancel,
}: PindahKeluarFormProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Mode: individu atau keluarga
  const [mode, setMode] = useState<'individu' | 'keluarga'>('keluarga');

  // Individu mode
  const [selectedPenduduk, setSelectedPenduduk] = useState<PendudukSearchResult | null>(null);

  // Keluarga mode
  const [selectedKKMember, setSelectedKKMember] = useState<PendudukSearchResult | null>(null);
  const [kkAnggota, setKkAnggota] = useState<KKAnggota[]>([]);
  const [loadingKK, setLoadingKK] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [kepalaPindah, setKepalaPindah] = useState(false);
  const [sisaAnggota, setSisaAnggota] = useState<{ id: string; namaLengkap: string; nik: string; hubunganKeluarga: string }[]>([]);
  const [adaPengganti, setAdaPengganti] = useState(false);
  const [gantiKepalaId, setGantiKepalaId] = useState('');

  // Reset when mode changes
  const handleModeChange = (newMode: 'individu' | 'keluarga') => {
    setMode(newMode);
    setSelectedPenduduk(null);
    setSelectedKKMember(null);
    setKkAnggota([]);
    setCheckedIds([]);
    setKepalaPindah(false);
    setSisaAnggota([]);
    setAdaPengganti(false);
    setGantiKepalaId('');
  };

  // Fetch KK members when keluarga mode selects a member
  useEffect(() => {
    if (mode !== 'keluarga' || !selectedKKMember?.kkId) {
      setKkAnggota([]);
      setCheckedIds([]);
      setKepalaPindah(false);
      setSisaAnggota([]);
      setAdaPengganti(false);
      setGantiKepalaId('');
      return;
    }

    const fetchKKMembers = async () => {
      setLoadingKK(true);
      try {
        const res = await fetch(`/api/kependudukan/kk/${selectedKKMember.kkId}`);
        const data = await res.json();
        if (data.success && data.data?.anggota) {
          const anggota: KKAnggota[] = data.data.anggota
            .filter((a: any) => a.status !== 'MENINGGAL' && a.isActive !== false)
            .map((a: any) => ({
              id: a.id,
              namaLengkap: a.namaLengkap,
              nik: a.nik || '',
              hubunganKeluarga: a.hubunganKeluarga,
              status: a.status,
            }));
          setKkAnggota(anggota);
          setCheckedIds([]);
          setKepalaPindah(false);
          setSisaAnggota([]);
          setAdaPengganti(false);
          setGantiKepalaId('');
        }
      } catch {
        setKkAnggota([]);
      } finally {
        setLoadingKK(false);
      }
    };

    fetchKKMembers();
  }, [mode, selectedKKMember?.kkId]);

  // Handle checkbox toggle
  const handleCheckToggle = (anggotaId: string) => {
    setCheckedIds(prev => {
      const next = prev.includes(anggotaId)
        ? prev.filter(id => id !== anggotaId)
        : [...prev, anggotaId];

      // Cek kepala KK
      const kepalaId = kkAnggota.find(a => a.hubunganKeluarga === 'KEPALA_KELUARGA')?.id;
      const kepalaIkut = next.includes(kepalaId || '');
      setKepalaPindah(kepalaIkut);

      if (kepalaIkut) {
        const sisa = kkAnggota.filter(a => !next.includes(a.id));
        setSisaAnggota(sisa);
        setAdaPengganti(sisa.length > 0);
        if (sisa.length === 0) setGantiKepalaId('');
      } else {
        setSisaAnggota([]);
        setAdaPengganti(false);
        setGantiKepalaId('');
      }

      return next;
    });
  };

  // Handle select all
  const handleCheckAll = () => {
    const allIds = kkAnggota.map(a => a.id);
    setCheckedIds(allIds);

    const kepalaId = kkAnggota.find(a => a.hubunganKeluarga === 'KEPALA_KELUARGA')?.id;
    const kepalaIkut = allIds.includes(kepalaId || '');
    setKepalaPindah(kepalaIkut);

    if (kepalaIkut) {
      const sisa = kkAnggota.filter(a => !allIds.includes(a.id));
      setSisaAnggota(sisa);
      setAdaPengganti(sisa.length > 0);
      if (sisa.length === 0) setGantiKepalaId('');
    } else {
      setSisaAnggota([]);
      setAdaPengganti(false);
      setGantiKepalaId('');
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    setCheckedIds([]);
    setKepalaPindah(false);
    setSisaAnggota([]);
    setAdaPengganti(false);
    setGantiKepalaId('');
  };

  // Validation
  const tanggalPindahError = tanggalPeristiwa === ''
    ? 'Tanggal pindah wajib diisi'
    : tanggalPeristiwa && new Date(tanggalPeristiwa) > new Date()
      ? 'Tanggal pindah tidak boleh lebih dari hari ini'
      : '';
  const alamatError = alamatTujuan.trim() === '' ? 'Alamat tujuan wajib diisi' : '';

  const step1Valid = mode === 'individu'
    ? !!selectedPenduduk
    : checkedIds.length > 0 && (!kepalaPindah || !adaPengganti || gantiKepalaId !== '');

  const step2Valid = tanggalPeristiwa !== '' && !tanggalPindahError && alamatTujuan.trim() !== '';

  const canNext = currentStep === 1 ? step1Valid : currentStep === 2 ? step2Valid : true;

  const handleNext = () => {
    if (currentStep < 3 && canNext) setCurrentStep(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    if (mode === 'individu' && selectedPenduduk) {
      onSubmit({
        pindahKeluarIds: [selectedPenduduk.id],
        kkId: selectedPenduduk.kkId || '',
        gantiKepalaPindahId: null,
      });
    } else {
      onSubmit({
        pindahKeluarIds: checkedIds,
        kkId: selectedKKMember?.kkId || '',
        gantiKepalaPindahId: kepalaPindah && adaPengganti ? gantiKepalaId : null,
      });
    }
  };

  // Compute summary data
  const summaryPindah = mode === 'individu' && selectedPenduduk
    ? [{ id: selectedPenduduk.id, namaLengkap: selectedPenduduk.namaLengkap, nik: selectedPenduduk.nik, hubunganKeluarga: selectedPenduduk.hubunganKeluarga }]
    : kkAnggota.filter(a => checkedIds.includes(a.id));

  const kkInfo = mode === 'individu'
    ? { nomorKK: selectedPenduduk?.nomorKK || '-', kepalaKK: selectedPenduduk?.displayText || '-' }
    : { nomorKK: selectedKKMember?.nomorKK || '-', kepalaKK: selectedKKMember?.displayText || '-' };

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
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isDone ? 'bg-emerald-600 text-white' :
                  isActive ? 'bg-amber-100 text-amber-700 border-2 border-amber-500' :
                  'bg-gray-100 text-gray-400 border-2 border-gray-200'
                )}>
                  {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={cn('text-xs font-medium hidden sm:block', {
                  'text-amber-700': isActive,
                  'text-emerald-600': isDone,
                  'text-gray-400': !isActive && !isDone,
                })}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn('w-8 h-0.5', currentStep > step.id ? 'bg-emerald-500' : 'bg-gray-200')} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Step 1: Pilih Penduduk */}
      {currentStep === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Step 1:</strong> Pilih penduduk yang pindah keluar. Status penduduk akan diubah menjadi{' '}
              <Badge className="ml-1 bg-amber-100 text-amber-700">PINDAH</Badge> dan dikeluarkan dari KK.
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleModeChange('individu')}
              className={cn(
                'flex-1 p-3 rounded-lg border-2 text-center transition-all',
                mode === 'individu' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <User className="w-5 h-5 mx-auto mb-1 text-gray-600" />
              <p className="text-sm font-medium">Individu</p>
              <p className="text-xs text-gray-500">1 penduduk</p>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('keluarga')}
              className={cn(
                'flex-1 p-3 rounded-lg border-2 text-center transition-all',
                mode === 'keluarga' ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <Users className="w-5 h-5 mx-auto mb-1 text-gray-600" />
              <p className="text-sm font-medium">Keluarga</p>
              <p className="text-xs text-gray-500">Pilih dari KK</p>
            </button>
          </div>

          {/* Individu Mode */}
          {mode === 'individu' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Cari Penduduk <span className="text-red-500">*</span></Label>
                <NIKSearch
                  onSelect={(p) => setSelectedPenduduk(p)}
                  selectedPenduduk={selectedPenduduk}
                  onClear={() => setSelectedPenduduk(null)}
                  placeholder="Cari NIK atau nama penduduk..."
                />
              </div>

              {selectedPenduduk && selectedPenduduk.hubunganKeluarga === 'KEPALA_KELUARGA' && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-orange-900">Penduduk ini adalah Kepala Keluarga</p>
                    <p className="text-sm text-orange-700 mt-0.5">
                      KK akan dinonaktifkan karena tidak ada opsi ganti kepala pada mode individu.
                      Gunakan <strong>mode Keluarga</strong> untuk memilih pengganti kepala KK.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Keluarga Mode */}
          {mode === 'keluarga' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Cari Anggota KK <span className="text-red-500">*</span></Label>
                <NIKSearch
                  onSelect={(p) => {
                    setSelectedKKMember(p);
                  }}
                  selectedPenduduk={selectedKKMember}
                  onClear={() => {
                    setSelectedKKMember(null);
                    setKkAnggota([]);
                    setCheckedIds([]);
                    setKepalaPindah(false);
                    setSisaAnggota([]);
                    setAdaPengganti(false);
                    setGantiKepalaId('');
                  }}
                  placeholder="Cari NIK atau nama anggota KK..."
                />
              </div>

              {/* KK info */}
              {selectedKKMember && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-400">No. KK</span><p className="font-mono font-medium">{selectedKKMember.nomorKK || '-'}</p></div>
                    <div><span className="text-gray-400">Kepala KK</span><p className="font-medium text-xs">{selectedKKMember.displayText || '-'}</p></div>
                  </div>
                </div>
              )}

              {/* Anggota KK list */}
              {loadingKK ? (
                <div className="text-center py-6 text-sm text-gray-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Memuat daftar anggota KK...
                </div>
              ) : kkAnggota.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Anggota yang Ikut Pindah <span className="text-red-500">*</span></Label>
                    <div className="flex gap-2">
                      <button type="button" onClick={handleCheckAll} className="text-xs text-emerald-600 hover:underline">
                        Pilih Semua
                      </button>
                      <button type="button" onClick={handleClearAll} className="text-xs text-gray-500 hover:underline">
                        Bersihkan
                      </button>
                    </div>
                  </div>

                  {checkedIds.length > 0 && (
                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-sm text-emerald-700">
                      <strong>{checkedIds.length}</strong> anggota dipilih untuk pindah
                    </div>
                  )}

                  <div className="space-y-1 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {kkAnggota.map(anggota => (
                      <label
                        key={anggota.id}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all',
                          checkedIds.includes(anggota.id) ? 'bg-amber-50' : 'hover:bg-gray-50'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checkedIds.includes(anggota.id)}
                          onChange={() => handleCheckToggle(anggota.id)}
                          className="w-4 h-4 accent-amber-600 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 truncate">{anggota.namaLengkap}</p>
                            {anggota.hubunganKeluarga === 'KEPALA_KELUARGA' && (
                              <Badge className="bg-orange-100 text-orange-700 text-xs">Kepala</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{anggota.nik} · {hubunganLabels[anggota.hubunganKeluarga] || anggota.hubunganKeluarga}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  {/* Kepala KK handling */}
                  {kepalaPindah && (
                    <div className="space-y-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-orange-900">Kepala Keluarga Ikut Pindah</p>
                          <p className="text-sm text-orange-700 mt-0.5">
                            {sisaAnggota.length === 0
                              ? 'Seluruh anggota KK ikut pindah. KK akan dinonaktifkan.'
                              : `Masih ada ${sisaAnggota.length} anggota yang tidak ikut pindah.`}
                          </p>
                        </div>
                      </div>

                      {sisaAnggota.length > 0 && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-orange-900">Tindakan untuk KK:</label>
                            <div className="space-y-1.5">
                              <label className={cn(
                                'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all',
                                adaPengganti ? 'border-orange-500 bg-orange-100' : 'border-orange-300 hover:bg-orange-100'
                              )}>
                                <input
                                  type="radio"
                                  name="opsi-pindah-kk"
                                  checked={adaPengganti}
                                  onChange={() => setAdaPengganti(true)}
                                  className="accent-orange-600"
                                />
                                <span className="text-sm text-orange-900">Pilih pengganti dari anggota yang tidak ikut</span>
                              </label>
                              <label className={cn(
                                'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all',
                                !adaPengganti ? 'border-orange-500 bg-orange-100' : 'border-orange-300 hover:bg-orange-100'
                              )}>
                                <input
                                  type="radio"
                                  name="opsi-pindah-kk"
                                  checked={!adaPengganti}
                                  onChange={() => { setAdaPengganti(false); setGantiKepalaId(''); }}
                                  className="accent-orange-600"
                                />
                                <span className="text-sm text-orange-900">Tidak ada pengganti <span className="text-orange-600">(KK dinonaktifkan)</span></span>
                              </label>
                            </div>
                          </div>

                          {adaPengganti && (
                            <div className="space-y-1.5">
                              <label className="text-sm font-medium text-orange-900">Pilih Pengganti <span className="text-red-500">*</span></label>
                              <div className="space-y-1 max-h-36 overflow-y-auto">
                                {sisaAnggota.map(anggota => (
                                  <label
                                    key={anggota.id}
                                    className={cn(
                                      'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all',
                                      gantiKepalaId === anggota.id ? 'border-orange-500 bg-orange-100' : 'border-gray-200 hover:bg-orange-50'
                                    )}
                                  >
                                    <input
                                      type="radio"
                                      name="pengganti-pindah"
                                      checked={gantiKepalaId === anggota.id}
                                      onChange={() => setGantiKepalaId(anggota.id)}
                                      className="accent-orange-600"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900">{anggota.namaLengkap}</p>
                                      <p className="text-xs text-gray-500">{anggota.nik} · {hubunganLabels[anggota.hubunganKeluarga] || anggota.hubunganKeluarga}</p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : selectedKKMember ? (
                <div className="text-center py-6 text-sm text-gray-500">
                  Tidak ada anggota aktif di KK ini
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Data Pindah */}
      {currentStep === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Step 2:</strong> Lengkapi data pindah. Tanggal pindah dan alamat tujuan wajib diisi.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">
              Tanggal Pindah <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              value={tanggalPeristiwa}
              onChange={(e) => setTanggalPeristiwa(e.target.value)}
              className={cn('h-10', tanggalPindahError ? 'border-red-500 focus-visible:ring-red-500' : '')}
              max={new Date().toISOString().split('T')[0]}
            />
            {tanggalPindahError && (
              <p className="text-xs text-red-500">{tanggalPindahError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm">
              Alamat Tujuan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={alamatTujuan}
              onChange={(e) => setAlamatTujuan(e.target.value)}
              placeholder="Alamat tujuan pindah (desa/kecamatan/kabupaten/kota)"
              className={cn('min-h-[80px] text-sm', alamatError ? 'border-red-500 focus-visible:ring-red-500' : '')}
            />
            {alamatError && (
              <p className="text-xs text-red-500">{alamatError}</p>
            )}
          </div>

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

      {/* Step 3: Konfirmasi */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Step 3:</strong> Periksa kembali data sebelum menyimpan. Status penduduk akan diubah menjadi PINDAH dan dikeluarkan dari KK.
            </p>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-4">
            {/* KK Info */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                Kartu Keluarga
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400">No. KK</span><p className="font-mono font-medium">{kkInfo.nomorKK}</p></div>
                <div><span className="text-gray-400">Kepala KK</span><p className="font-medium">{kkInfo.kepalaKK}</p></div>
              </div>
            </div>

            {/* Daftar Pindah */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                Penduduk yang Pindah ({summaryPindah.length} orang)
              </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {summaryPindah.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg border border-amber-100">
                    <User className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.namaLengkap}</p>
                        {p.hubunganKeluarga === 'KEPALA_KELUARGA' && (
                          <Badge className="bg-orange-100 text-orange-700 text-xs">Kepala</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono">{p.nik} · {hubunganLabels[p.hubunganKeluarga] || p.hubunganKeluarga}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KK Action */}
            {kepalaPindah && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  Tindakan KK
                </h4>
                {adaPengganti && gantiKepalaId ? (
                  <div className="p-2 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-700">
                    Kepala KK diganti ke <strong>{sisaAnggota.find(a => a.id === gantiKepalaId)?.namaLengkap}</strong>
                  </div>
                ) : (
                  <div className="p-2 bg-red-50 rounded-lg border border-red-200 text-sm text-red-700">
                    KK akan <strong>dinonaktifkan</strong>{sisaAnggota.length === 0 ? ' (seluruh anggota ikut pindah)' : ' (tidak ada pengganti kepala)'}
                  </div>
                )}
              </div>
            )}

            {/* Data Pindah */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-500" />
                Data Pindah
              </h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div><span className="text-gray-400">Tanggal Pindah</span><p className="font-medium">{tanggalPeristiwa ? new Date(tanggalPeristiwa).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</p></div>
                <div><span className="text-gray-400">Alamat Tujuan</span><p className="font-medium">{alamatTujuan}</p></div>
                {keterangan && <div><span className="text-gray-400">Keterangan</span><p className="font-medium">{keterangan}</p></div>}
              </div>
            </div>

            {/* Auto action info */}
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-700">
                <strong>Otomatis:</strong> Status Penduduk → <Badge className="bg-amber-200 text-amber-800 text-[10px] px-1.5 py-0 ml-1">PINDAH</Badge> • Dikeluarkan dari KK • isActive = false
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <DialogFooter className="flex-row gap-2 sm:justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel} className="gap-1">
            Batal
          </Button>
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={handlePrev} className="gap-1">
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
              disabled={submitting}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              Simpan Pindah Keluar
            </Button>
          )}
        </div>
      </DialogFooter>
    </div>
  );
}
