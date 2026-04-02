'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
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

export interface KematianFormProps {
  kematianForm: {
    tempat: string;
    penyebabKematian: string;
    tanggalPeristiwa: string;
    keterangan: string;
  };
  setKematianForm: React.Dispatch<React.SetStateAction<{ tempat: string; penyebabKematian: string; tanggalPeristiwa: string; keterangan: string }>>;
  selectedPenduduk: PendudukSearchResult | null;
  setSelectedPenduduk: (p: PendudukSearchResult) => void;
  isKepalaKK: boolean;
  anggotaKK: { id: string; namaLengkap: string; nik: string; hubunganKeluarga: string }[];
  loadingAnggota: boolean;
  adaPengganti: boolean;
  setAdaPengganti: (v: boolean) => void;
  gantiKepalaKeluargaId: string;
  setGantiKepalaKeluargaId: (v: string) => void;
  hubunganKepalaLama: string;
  setHubunganKepalaLama: (v: string) => void;
  submitting: boolean;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  onClearPenduduk: () => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const hubunganOptions = ['SUAMI', 'ISTRI', 'ANAK', 'ANAK_TIRI', 'ANAK_ANGKAT', 'ORANG_TUA', 'MENANTU', 'MERTUA', 'CUCU', 'FAMILI_LAIN', 'LAINNYA'];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function KematianForm({
  kematianForm,
  setKematianForm,
  selectedPenduduk,
  setSelectedPenduduk,
  isKepalaKK,
  anggotaKK,
  loadingAnggota,
  adaPengganti,
  setAdaPengganti,
  gantiKepalaKeluargaId,
  setGantiKepalaKeluargaId,
  hubunganKepalaLama,
  setHubunganKepalaLama,
  submitting,
  onSubmit,
  onCancel,
  onClearPenduduk,
}: KematianFormProps) {
  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="p-3 bg-gray-50 rounded-lg border">
        <p className="text-sm text-gray-700">
          <strong>Info:</strong> Status penduduk akan diubah menjadi{' '}
          <Badge className="ml-1 bg-gray-200 text-gray-700">MENINGGAL</Badge>
        </p>
      </div>

      {/* NIKSearch for penduduk */}
      <div className="space-y-2">
        <Label>
          Pilih Penduduk <span className="text-red-500">*</span>
        </Label>
        <NIKSearch
          onSelect={setSelectedPenduduk}
          selectedPenduduk={selectedPenduduk}
          onClear={onClearPenduduk}
          placeholder="Cari NIK atau nama penduduk..."
        />
      </div>

      {/* Penduduk info card */}
      {selectedPenduduk && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="font-medium text-blue-900">{selectedPenduduk.namaLengkap}</p>
          <p className="text-sm text-blue-700">NIK: {selectedPenduduk.nik}</p>
        </div>
      )}

      {/* Ganti Kepala KK section — only when isKepalaKK */}
      {isKepalaKK && (
        <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-900">Penduduk ini adalah Kepala Keluarga</p>
              <p className="text-sm text-amber-700 mt-0.5">
                {selectedPenduduk?.nomorKK && `No. KK: ${selectedPenduduk.nomorKK}`}
              </p>
            </div>
          </div>

          {loadingAnggota ? (
            <div className="text-center py-3 text-sm text-amber-700">
              Memuat daftar anggota...
            </div>
          ) : (
            <>
              {/* Radio: pengganti vs tidak ada pengganti */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-amber-900">Tindakan untuk KK:</label>
                <div className="space-y-1.5">
                  <label
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all',
                      adaPengganti
                        ? 'border-amber-500 bg-amber-100'
                        : 'border-amber-300 hover:bg-amber-100'
                    )}
                  >
                    <input
                      type="radio"
                      name="opsi-kk"
                      checked={adaPengganti}
                      onChange={() => setAdaPengganti(true)}
                      className="accent-amber-600"
                    />
                    <span className="text-sm text-amber-900">Pilih pengganti dari anggota KK</span>
                  </label>
                  <label
                    className={cn(
                      'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all',
                      !adaPengganti
                        ? 'border-amber-500 bg-amber-100'
                        : 'border-amber-300 hover:bg-amber-100'
                    )}
                  >
                    <input
                      type="radio"
                      name="opsi-kk"
                      checked={!adaPengganti}
                      onChange={() => {
                        setAdaPengganti(false);
                        setGantiKepalaKeluargaId('');
                      }}
                      className="accent-amber-600"
                    />
                    <span className="text-sm text-amber-900">
                      Tidak ada pengganti{' '}
                      <span className="text-amber-600">(KK dinonaktifkan)</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Pengganti list + hubungan kepala lama */}
              {adaPengganti && anggotaKK.length > 0 && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-amber-900">
                      Pilih Pengganti <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {anggotaKK.map((anggota) => (
                        <label
                          key={anggota.id}
                          className={cn(
                            'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-sm',
                            gantiKepalaKeluargaId === anggota.id
                              ? 'border-amber-500 bg-amber-100 text-amber-900'
                              : 'border-amber-200 hover:border-amber-400 text-amber-800'
                          )}
                        >
                          <input
                            type="radio"
                            name="pengganti"
                            value={anggota.id}
                            checked={gantiKepalaKeluargaId === anggota.id}
                            onChange={() => setGantiKepalaKeluargaId(anggota.id)}
                            className="accent-amber-600"
                          />
                          <span className="font-medium">{anggota.namaLengkap}</span>
                          <span className="text-xs text-amber-600">
                            {anggota.hubunganKeluarga || '-'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Hubungan kepala lama di KK */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-amber-900">
                      Hubungan {selectedPenduduk?.namaLengkap} di KK
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {hubunganOptions.map((hub) => (
                        <button
                          key={hub}
                          type="button"
                          onClick={() => setHubunganKepalaLama(hub)}
                          className={cn(
                            'px-2.5 py-1 rounded-md text-xs border transition-all',
                            hubunganKepalaLama === hub
                              ? 'border-amber-500 bg-amber-200 text-amber-900 font-medium'
                              : 'border-amber-300 text-amber-700 hover:bg-amber-100'
                          )}
                        >
                          {hub.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {adaPengganti && anggotaKK.length === 0 && !loadingAnggota && (
                <div className="text-center py-3 text-sm text-amber-700">
                  Tidak ada anggota KK lain yang tersedia.
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tanggal Kematian & Tempat */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tanggal Kematian</Label>
          <Input
            type="date"
            value={kematianForm.tanggalPeristiwa}
            onChange={(e) =>
              setKematianForm({ ...kematianForm, tanggalPeristiwa: e.target.value })
            }
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="space-y-2">
          <Label>Tempat</Label>
          <Input
            value={kematianForm.tempat}
            onChange={(e) =>
              setKematianForm({ ...kematianForm, tempat: e.target.value })
            }
            placeholder="RS/Rumah/etc"
          />
        </div>
      </div>

      {/* Penyebab Kematian */}
      <div className="space-y-2">
        <Label>Penyebab Kematian</Label>
        <Input
          value={kematianForm.penyebabKematian}
          onChange={(e) =>
            setKematianForm({ ...kematianForm, penyebabKematian: e.target.value })
          }
          placeholder="Penyebab kematian"
        />
      </div>

      {/* Keterangan */}
      <div className="space-y-2">
        <Label>Keterangan</Label>
        <Textarea
          value={kematianForm.keterangan}
          onChange={(e) =>
            setKematianForm({ ...kematianForm, keterangan: e.target.value })
          }
          placeholder="Keterangan tambahan"
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
          disabled={submitting || !selectedPenduduk}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
          Simpan Kematian
        </Button>
      </DialogFooter>
    </div>
  );
}
