'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  WilayahOption,
  KKSearchResult,
} from '@/lib/penduduk-form-types';
import { NomorKKCheckState } from '@/lib/penduduk-form-utils';

interface PendudukKKSelectorProps {
  kkStatus: 'belum-punya' | 'sudah-punya' | null;
  setKkStatus: React.Dispatch<React.SetStateAction<'belum-punya' | 'sudah-punya' | null>>;
  selectedKK: KKSearchResult | null;
  newKKData: { nomorKK: string; alamat: string; rtId: string; dusunId: string };
  setNewKKData: React.Dispatch<React.SetStateAction<{ nomorKK: string; alamat: string; rtId: string; dusunId: string }>>;
  kkSearchQuery: string;
  setKkSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  kkSearchResults: KKSearchResult[];
  kkSearching: boolean;
  nomorKKCheck: NomorKKCheckState;
  wilayahOptions: WilayahOption[];
  onSelectKK: (kk: KKSearchResult) => void;
  onProceedToForm: () => void;
  onWilayahChange: (rtId: string) => void;
  onKkStatusSelect: (status: 'belum-punya' | 'sudah-punya') => void;
}

export function PendudukKKSelector({
  kkStatus,
  setKkStatus,
  selectedKK,
  newKKData,
  setNewKKData,
  kkSearchQuery,
  setKkSearchQuery,
  kkSearchResults,
  kkSearching,
  nomorKKCheck,
  wilayahOptions,
  onSelectKK,
  onProceedToForm,
  onWilayahChange,
  onKkStatusSelect,
}: PendudukKKSelectorProps) {
  return (
    <div className="flex-1 p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Apakah penduduk ini sudah memiliki Kartu Keluarga?
          </h2>
          <p className="text-gray-500">
            Pilih salah satu opsi di bawah ini untuk melanjutkan
          </p>
        </div>

        {/* KK Status Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => onKkStatusSelect('belum-punya')}
            className={cn(
              'p-6 rounded-xl border-2 text-left transition-all',
              kkStatus === 'belum-punya'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 bg-white hover:border-emerald-300'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                kkStatus === 'belum-punya' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                <Plus className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">Belum Punya KK</h3>
            </div>
            <p className="text-sm text-gray-500">
              Buat Kartu Keluarga baru untuk penduduk ini sebagai Kepala Keluarga
            </p>
          </button>

          <button
            onClick={() => onKkStatusSelect('sudah-punya')}
            className={cn(
              'p-6 rounded-xl border-2 text-left transition-all',
              kkStatus === 'sudah-punya'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 bg-white hover:border-emerald-300'
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                kkStatus === 'sudah-punya' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'
              )}>
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-gray-900">Sudah Punya KK</h3>
            </div>
            <p className="text-sm text-gray-500">
              Pilih KK yang sudah ada dan tambahkan sebagai anggota keluarga
            </p>
          </button>
        </div>

        {/* Belum Punya KK - Form */}
        <AnimatePresence>
          {kkStatus === 'belum-punya' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-xl border p-6 mb-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Data Kartu Keluarga Baru
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Nomor KK</Label>
                    <Input
                      value={newKKData.nomorKK}
                      onChange={(e) => setNewKKData(prev => ({ ...prev, nomorKK: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
                      placeholder="Masukkan 16 digit Nomor KK"
                      className={cn('font-mono', nomorKKCheck.exists && 'border-red-500')}
                    />
                    {nomorKKCheck.checking && newKKData.nomorKK.length === 16 && (
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Mengecek Nomor KK...
                      </p>
                    )}
                    {nomorKKCheck.exists && nomorKKCheck.kepalaKeluarga && (
                      <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" /> Nomor KK sudah digunakan oleh KK <span className="font-semibold">{nomorKKCheck.kepalaKeluarga}</span>
                      </p>
                    )}
                    {!nomorKKCheck.checking && !nomorKKCheck.exists && newKKData.nomorKK.length === 16 && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Nomor KK tersedia
                      </p>
                    )}
                    {!nomorKKCheck.checking && newKKData.nomorKK.length < 16 && (
                      <p className="text-xs text-gray-500">Masukkan 16 digit angka Nomor Kartu Keluarga</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>RT/RW/Dusun <span className="text-red-500">*</span></Label>
                    <Select
                      value={newKKData.rtId}
                      onValueChange={(v) => onWilayahChange(v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih RT/RW/Dusun" />
                      </SelectTrigger>
                      <SelectContent>
                        {wilayahOptions.map(opt => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Alamat <span className="text-red-500">*</span></Label>
                  <Textarea
                    value={newKKData.alamat}
                    onChange={(e) => setNewKKData(prev => ({ ...prev, alamat: e.target.value }))}
                    placeholder="Alamat lengkap"
                    rows={2}
                  />
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-800">
                  <strong>Catatan:</strong> Penduduk ini akan otomatis menjadi Kepala Keluarga dari KK baru.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sudah Punya KK - Search */}
        <AnimatePresence>
          {kkStatus === 'sudah-punya' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white rounded-xl border p-6 mb-6"
            >
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-emerald-600" />
                Cari Kartu Keluarga
              </h3>

              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={kkSearchQuery}
                    onChange={(e) => setKkSearchQuery(e.target.value)}
                    placeholder="Cari berdasarkan Nomor KK atau Nama Kepala Keluarga..."
                    className="pl-10"
                  />
                </div>

                {kkSearching && (
                  <div className="text-center py-4 text-gray-500">
                    Mencari...
                  </div>
                )}

                {!kkSearching && kkSearchResults.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {kkSearchResults.map(kk => (
                      <button
                        key={kk.id}
                        onClick={() => onSelectKK(kk)}
                        className={cn(
                          'w-full p-3 rounded-lg border text-left transition-all',
                          selectedKK?.id === kk.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-emerald-300'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono text-sm text-gray-600">{kk.nomorKK || 'Belum ada Nomor KK'}</p>
                            <p className="font-medium text-gray-900">{kk.kepalaKeluarga}</p>
                            <p className="text-xs text-gray-500">{kk.alamat || '-'}, {kk.dusun} RT {kk.rt}/RW {kk.rw}</p>
                          </div>
                          <Badge variant="outline">{kk.jumlahAnggota} anggota</Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {!kkSearching && kkSearchQuery && kkSearchResults.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Tidak ditemukan KK dengan kata kunci &quot;{kkSearchQuery}&quot;
                  </div>
                )}

                {selectedKK && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-sm font-medium text-emerald-800">KK Terpilih:</p>
                    <p className="font-mono text-emerald-900">{selectedKK.nomorKK || 'Belum ada Nomor KK'}</p>
                    <p className="text-emerald-700">{selectedKK.kepalaKeluarga}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Proceed Button */}
        <div className="flex justify-end">
          <Button
            onClick={onProceedToForm}
            disabled={!kkStatus || (kkStatus === 'sudah-punya' && !selectedKK)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Lanjutkan
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
