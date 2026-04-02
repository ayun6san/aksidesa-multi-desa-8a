'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search, FileText, User, CheckCircle2, ChevronRight,
  Loader2, AlertCircle, ArrowLeft, Info, FileCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getKategoriLabel } from '@/lib/surat-utils';
import { motion, AnimatePresence } from 'framer-motion';

// ============ TYPES ============

interface SuratJenis {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  tingkatApproval: string;
  deskripsi: string | null;
  persyaratan: string | null;
  fieldTemplate: string | null;
}

interface PendudukItem {
  id: string;
  nik: string;
  namaLengkap: string;
  alamat: string | null;
  rt: string | null;
  rw: string | null;
  dusun: string | null;
  noHP: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: string | null;
  agama: string | null;
  pekerjaan: string | null;
  statusPerkawinan: string | null;
}

interface FieldTemplate {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'select';
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

interface SuratAjukanFormProps {
  onNavigate?: (menu: string) => void;
  onSuccess?: () => void;
}

// ============ CONSTANTS ============

const KATEGORI_ORDER = [
  'KEPENDUDUKAN',
  'PENGANTAR',
  'KETERANGAN',
  'PERNYATAAN',
  'TANAH_PROPERTI',
  'KEUANGAN',
  'LEMBAGA',
];

// ============ PENDUDUK SEARCH DIALOG ============

function PendudukSearchDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (p: PendudukItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<PendudukItem[]>([]);
  const [loading, setLoading] = useState(false);

  const searchPenduduk = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(`/api/penduduk?search=${encodeURIComponent(query)}&limit=10`);
      if (!response.ok) throw new Error('Gagal');
      const result = await response.json();
      if (result.success) {
        setResults(result.data || []);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchPenduduk(search), 300);
    return () => clearTimeout(timer);
  }, [search, searchPenduduk]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-500" />
            Cari Data Penduduk
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari berdasarkan NIK atau nama..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {loading && <Skeleton className="h-10 w-full" />}
            {!loading && results.length === 0 && search.length >= 2 && (
              <p className="text-sm text-gray-400 text-center py-6">Tidak ditemukan data penduduk</p>
            )}
            {results.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelect(p); onClose(); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{p.namaLengkap}</p>
                  <p className="text-[11px] text-gray-400 font-mono">NIK: {p.nik}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ MAIN COMPONENT ============

export function SuratAjukanForm({ onNavigate, onSuccess }: SuratAjukanFormProps) {
  const [jenisSuratList, setJenisSuratList] = useState<SuratJenis[]>([]);
  const [loadingJenis, setLoadingJenis] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedJenisId, setSelectedJenisId] = useState('');
  const [pemohonNama, setPemohonNama] = useState('');
  const [pemohonNIK, setPemohonNIK] = useState('');
  const [pemohonAlamat, setPemohonAlamat] = useState('');
  const [pemohonRT, setPemohonRT] = useState('');
  const [pemohonRW, setPemohonRW] = useState('');
  const [pemohonDusun, setPemohonDusun] = useState('');
  const [pemohonTelepon, setPemohonTelepon] = useState('');
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});
  const [catatan, setCatatan] = useState('');

  // Penduduk search dialog
  const [showPendudukSearch, setShowPendudukSearch] = useState(false);

  // Selected jenis detail
  const selectedJenis = jenisSuratList.find((j) => j.id === selectedJenisId);

  // Parse field template
  const fieldTemplates: FieldTemplate[] = [];
  if (selectedJenis?.fieldTemplate) {
    try {
      const parsed = JSON.parse(selectedJenis.fieldTemplate);
      if (Array.isArray(parsed)) {
        fieldTemplates.push(...parsed);
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  // Parse persyaratan
  const persyaratanList: string[] = [];
  if (selectedJenis?.persyaratan) {
    try {
      const parsed = JSON.parse(selectedJenis.persyaratan);
      if (Array.isArray(parsed)) {
        persyaratanList.push(...parsed);
      }
    } catch {
      // Try newline-separated
      const lines = selectedJenis.persyaratan.split('\n').filter(Boolean);
      persyaratanList.push(...lines);
    }
  }

  // Group jenis surat by kategori
  const groupedJenis = jenisSuratList.reduce<Record<string, SuratJenis[]>>((acc, j) => {
    if (!acc[j.kategori]) acc[j.kategori] = [];
    acc[j.kategori].push(j);
    return acc;
  }, {});

  // Fetch jenis surat
  useEffect(() => {
    const fetchJenis = async () => {
      try {
        setLoadingJenis(true);
        const response = await fetch('/api/surat/jenis?limit=100&isActive=true');
        if (!response.ok) throw new Error('Gagal');
        const result = await response.json();
        if (result.success) {
          setJenisSuratList(result.data || []);
        }
      } catch {
        toast.error('Gagal memuat jenis surat');
      } finally {
        setLoadingJenis(false);
      }
    };
    fetchJenis();
  }, []);

  // Handle penduduk select
  const handlePendudukSelect = (p: PendudukItem) => {
    setPemohonNama(p.namaLengkap);
    setPemohonNIK(p.nik);
    setPemohonAlamat(p.alamat || '');
    setPemohonRT(p.rt || '');
    setPemohonRW(p.rw || '');
    setPemohonDusun(p.dusun || '');
    setPemohonTelepon(p.noHP || '');
  };

  // Handle jenis surat select
  const handleJenisSelect = (jenisId: string) => {
    setSelectedJenisId(jenisId);
    setDynamicFields({});
  };

  // Submit form
  const handleSubmit = async () => {
    if (!selectedJenisId) {
      toast.error('Pilih jenis surat terlebih dahulu');
      return;
    }
    if (!pemohonNama.trim()) {
      toast.error('Nama pemohon wajib diisi');
      return;
    }

    // NIK validation - must be exactly 16 digits
    if (pemohonNIK.trim() && !/^\d{16}$/.test(pemohonNIK.trim())) {
      toast.error('NIK harus berupa 16 digit angka');
      return;
    }

    // Check required dynamic fields
    for (const ft of fieldTemplates) {
      if (ft.required && !dynamicFields[ft.key]?.trim()) {
        toast.error(`${ft.label} wajib diisi`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const body: Record<string, unknown> = {
        jenisSuratId: selectedJenisId,
        pemohonNama: pemohonNama.trim(),
        pemohonNIK: pemohonNIK.trim() || null,
        pemohonAlamat: pemohonAlamat.trim() || null,
        pemohonRT: pemohonRT.trim() || null,
        pemohonRW: pemohonRW.trim() || null,
        pemohonDusun: pemohonDusun.trim() || null,
        pemohonTelepon: pemohonTelepon.trim() || null,
        isiSurat: JSON.stringify(dynamicFields),
        catatanOperator: catatan.trim() || null,
      };

      const response = await fetch('/api/surat/ajukan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Surat berhasil diajukan!');
        if (onSuccess) {
          onSuccess();
        } else if (onNavigate) {
          onNavigate('surat-list');
        }
      } else {
        toast.error(result.error || 'Gagal mengajukan surat');
      }
    } catch {
      toast.error('Terjadi kesalahan saat mengajukan surat');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => onNavigate?.('surat-dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Kembali
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Ajukan Surat</h2>
          <p className="text-sm text-gray-500 mt-0.5">Isi form berikut untuk mengajukan surat baru</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Jenis Surat */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Pilih Jenis Surat
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingJenis ? (
                <Skeleton className="h-10 w-full" />
              ) : jenisSuratList.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Belum ada jenis surat yang tersedia</p>
                </div>
              ) : (
                <Select value={selectedJenisId} onValueChange={handleJenisSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis surat..." />
                  </SelectTrigger>
                  <SelectContent>
                    {KATEGORI_ORDER.filter((k) => groupedJenis[k]).map((kategori) => (
                      <div key={kategori}>
                        <SelectItem value={`__group_${kategori}`} disabled className="pointer-events-none font-semibold text-gray-400 text-xs uppercase">
                          {getKategoriLabel(kategori)}
                        </SelectItem>
                        {groupedJenis[kategori].map((j) => (
                          <SelectItem key={j.id} value={j.id}>
                            {j.nama}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Selected jenis info */}
              <AnimatePresence>
                {selectedJenis && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="rounded-lg bg-emerald-50 border border-emerald-200 p-3"
                  >
                    <p className="text-sm text-emerald-800">{selectedJenis.deskripsi || selectedJenis.nama}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px] bg-white">
                        {getKategoriLabel(selectedJenis.kategori)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] bg-white',
                          selectedJenis.tingkatApproval === 'PERLU_APPROVAL'
                            ? 'border-amber-300 text-amber-700'
                            : 'border-emerald-300 text-emerald-700',
                        )}
                      >
                        {selectedJenis.tingkatApproval === 'PERLU_APPROVAL'
                          ? 'Perlu Approval Kades'
                          : 'Langsung Diproses'}
                      </Badge>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Data Pemohon */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500" />
                Data Pemohon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPendudukSearch(true)}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Cari dari Data Penduduk
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm">
                    Nama Pemohon <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="Masukkan nama lengkap pemohon"
                    value={pemohonNama}
                    onChange={(e) => setPemohonNama(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">NIK</Label>
                  <Input
                    placeholder="16 digit NIK"
                    value={pemohonNIK}
                    onChange={(e) => setPemohonNIK(e.target.value)}
                    maxLength={16}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm">No. Telepon</Label>
                  <Input
                    placeholder="08xxxxxxxxxx"
                    value={pemohonTelepon}
                    onChange={(e) => setPemohonTelepon(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-sm">Alamat</Label>
                  <Textarea
                    placeholder="Alamat lengkap pemohon"
                    value={pemohonAlamat}
                    onChange={(e) => setPemohonAlamat(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">RT</Label>
                    <Input
                      placeholder="RT"
                      value={pemohonRT}
                      onChange={(e) => setPemohonRT(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">RW</Label>
                    <Input
                      placeholder="RW"
                      value={pemohonRW}
                      onChange={(e) => setPemohonRW(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Dusun</Label>
                    <Input
                      placeholder="Dusun"
                      value={pemohonDusun}
                      onChange={(e) => setPemohonDusun(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Fields */}
          {fieldTemplates.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  Isi Surat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fieldTemplates.map((ft) => (
                  <div key={ft.key} className="space-y-1.5">
                    <Label className="text-sm">
                      {ft.label}
                      {ft.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {ft.type === 'textarea' ? (
                      <Textarea
                        placeholder={ft.placeholder || `Masukkan ${ft.label.toLowerCase()}`}
                        value={dynamicFields[ft.key] || ''}
                        onChange={(e) =>
                          setDynamicFields((prev) => ({ ...prev, [ft.key]: e.target.value }))
                        }
                        rows={3}
                      />
                    ) : ft.type === 'select' && ft.options ? (
                      <Select
                        value={dynamicFields[ft.key] || ''}
                        onValueChange={(v) =>
                          setDynamicFields((prev) => ({ ...prev, [ft.key]: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={ft.placeholder || `Pilih ${ft.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {ft.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : ft.type === 'date' ? (
                      <Input
                        type="date"
                        value={dynamicFields[ft.key] || ''}
                        onChange={(e) =>
                          setDynamicFields((prev) => ({ ...prev, [ft.key]: e.target.value }))
                        }
                      />
                    ) : (
                      <Input
                        placeholder={ft.placeholder || `Masukkan ${ft.label.toLowerCase()}`}
                        value={dynamicFields[ft.key] || ''}
                        onChange={(e) =>
                          setDynamicFields((prev) => ({ ...prev, [ft.key]: e.target.value }))
                        }
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Catatan */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Info className="w-4 h-4 text-emerald-500" />
                Catatan Tambahan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Catatan atau keterangan tambahan (opsional)"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onNavigate?.('surat-dashboard')}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedJenisId || !pemohonNama.trim()}
              className="min-w-[160px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengajukan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Ajukan Surat
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Right: Sidebar Info */}
        <div className="space-y-4">
          {/* Persyaratan */}
          {persyaratanList.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-amber-500" />
                  Persyaratan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {persyaratanList.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-[10px] font-medium text-gray-500">{idx + 1}</span>
                      </div>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Status Form */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Status Pengajuan</h4>
              <div className="space-y-3">
                <div className={cn(
                  'flex items-center gap-2 text-sm',
                  selectedJenisId ? 'text-emerald-600' : 'text-gray-400',
                )}>
                  <CheckCircle2 className={cn('w-4 h-4', selectedJenisId ? 'text-emerald-500' : 'text-gray-300')} />
                  <span>Pilih jenis surat</span>
                </div>
                <div className={cn(
                  'flex items-center gap-2 text-sm',
                  pemohonNama.trim() ? 'text-emerald-600' : 'text-gray-400',
                )}>
                  <CheckCircle2 className={cn('w-4 h-4', pemohonNama.trim() ? 'text-emerald-500' : 'text-gray-300')} />
                  <span>Isi data pemohon</span>
                </div>
                <div className={cn(
                  'flex items-center gap-2 text-sm',
                  fieldTemplates.every((ft) => !ft.required || dynamicFields[ft.key]?.trim())
                    ? 'text-emerald-600'
                    : 'text-gray-400',
                )}>
                  <CheckCircle2 className={cn(
                    'w-4 h-4',
                    fieldTemplates.every((ft) => !ft.required || dynamicFields[ft.key]?.trim())
                      ? 'text-emerald-500'
                      : 'text-gray-300',
                  )} />
                  <span>Lengkapi isi surat</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700 space-y-1">
                  <p className="font-medium">Informasi</p>
                  <p className="text-blue-600">
                    Surat yang diajukan akan diproses oleh operator desa.
                    {selectedJenis?.tingkatApproval === 'PERLU_APPROVAL' && (
                      <span className="block mt-1 font-medium">
                        Surat ini memerlukan approval Kepala Desa.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Penduduk Search Dialog */}
      <PendudukSearchDialog
        open={showPendudukSearch}
        onClose={() => setShowPendudukSearch(false)}
        onSelect={handlePendudukSelect}
      />
    </div>
  );
}
