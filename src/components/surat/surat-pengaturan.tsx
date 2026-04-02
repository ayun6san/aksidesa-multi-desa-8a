'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Save,
  RotateCcw,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  FileText,
  Hash,
  Building2,
  Info,
  Sparkles,
  Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { toRoman, generateNomorSurat, generateNomorRegister, padNumber } from '@/lib/surat-utils';

// ============ TYPES ============

interface SuratKonfigurasi {
  id: string;
  desaId: string;
  formatNomorSurat: string;
  digitPadding: number;
  formatBulan: 'ROMAWI' | 'ANGKA' | 'TANPA';
  resetNomorPer: string;
  formatNomorRegister: string;
  digitPaddingReg: number;
  kodeDesaSurat: string;
  kepalaDesaNama: string | null;
  kepalaDesaNIP: string | null;
  sekretarisNama: string | null;
  sekretarisNIP: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SuratPengaturanProps {
  onNavigate?: (menu: string) => void;
}

// ============ DEFAULT VALUES ============

const DEFAULTS = {
  formatNomorSurat: '{nomor}/{kodeDesa}/{bulan}/{tahun}',
  digitPadding: 3,
  formatBulan: 'ROMAWI' as const,
  resetNomorPer: 'PER_TAHUN',
  formatNomorRegister: '{nomor}/{kodeDesa}/Reg/{tahun}',
  digitPaddingReg: 4,
  kodeDesaSurat: '',
  kepalaDesaNama: '',
  kepalaDesaNIP: '',
  sekretarisNama: '',
  sekretarisNIP: '',
};

// ============ MAIN COMPONENT ============

export function SuratPengaturan({ onNavigate }: SuratPengaturanProps) {
  const [originalConfig, setOriginalConfig] = useState<SuratKonfigurasi | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('nomor-surat');
  const [copiedPreview, setCopiedPreview] = useState<string | null>(null);

  // Form state
  const [formatNomorSurat, setFormatNomorSurat] = useState(DEFAULTS.formatNomorSurat);
  const [digitPadding, setDigitPadding] = useState(DEFAULTS.digitPadding);
  const [formatBulan, setFormatBulan] = useState<string>(DEFAULTS.formatBulan);
  const [resetNomorPer, setResetNomorPer] = useState(DEFAULTS.resetNomorPer);
  const [formatNomorRegister, setFormatNomorRegister] = useState(DEFAULTS.formatNomorRegister);
  const [digitPaddingReg, setDigitPaddingReg] = useState(DEFAULTS.digitPaddingReg);
  const [kodeDesaSurat, setKodeDesaSurat] = useState(DEFAULTS.kodeDesaSurat);
  const [kepalaDesaNama, setKepalaDesaNama] = useState(DEFAULTS.kepalaDesaNama);
  const [kepalaDesaNIP, setKepalaDesaNIP] = useState(DEFAULTS.kepalaDesaNIP);
  const [sekretarisNama, setSekretarisNama] = useState(DEFAULTS.sekretarisNama);
  const [sekretarisNIP, setSekretarisNIP] = useState(DEFAULTS.sekretarisNIP);

  // ============ FETCH CONFIG ============

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/surat/konfigurasi');
      const result = await response.json();

      if (result.success && result.data) {
        const cfg = result.data as SuratKonfigurasi;
        setOriginalConfig(cfg);
        setFormatNomorSurat(cfg.formatNomorSurat);
        setDigitPadding(cfg.digitPadding);
        setFormatBulan(cfg.formatBulan);
        setResetNomorPer(cfg.resetNomorPer);
        setFormatNomorRegister(cfg.formatNomorRegister);
        setDigitPaddingReg(cfg.digitPaddingReg);
        setKodeDesaSurat(cfg.kodeDesaSurat);
        setKepalaDesaNama(cfg.kepalaDesaNama || '');
        setKepalaDesaNIP(cfg.kepalaDesaNIP || '');
        setSekretarisNama(cfg.sekretarisNama || '');
        setSekretarisNIP(cfg.sekretarisNIP || '');
      } else if (response.status === 404) {
        // No config yet - use defaults
        setOriginalConfig(null);
      } else {
        setError(result.error || 'Gagal memuat konfigurasi');
      }
    } catch {
      setError('Terjadi kesalahan saat memuat konfigurasi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ============ LIVE PREVIEW ============

  const previewNomorSurat = useMemo(() => {
    const now = new Date();
    try {
      return generateNomorSurat(
        1,
        kodeDesaSurat || 'Ds.Contoh',
        now.getFullYear(),
        now.getMonth() + 1,
        formatNomorSurat,
        digitPadding,
        formatBulan as 'ROMAWI' | 'ANGKA' | 'TANPA'
      );
    } catch {
      return 'Format tidak valid';
    }
  }, [formatNomorSurat, digitPadding, formatBulan, kodeDesaSurat]);

  const previewNomorRegister = useMemo(() => {
    const now = new Date();
    try {
      return generateNomorRegister(
        1,
        kodeDesaSurat || 'Ds.Contoh',
        now.getFullYear(),
        formatNomorRegister,
        digitPaddingReg
      );
    } catch {
      return 'Format tidak valid';
    }
  }, [formatNomorRegister, digitPaddingReg, kodeDesaSurat]);

  const previewNomorSuratLast = useMemo(() => {
    const now = new Date();
    try {
      return generateNomorSurat(
        15,
        kodeDesaSurat || 'Ds.Contoh',
        now.getFullYear(),
        now.getMonth() + 1,
        formatNomorSurat,
        digitPadding,
        formatBulan as 'ROMAWI' | 'ANGKA' | 'TANPA'
      );
    } catch {
      return 'Format tidak valid';
    }
  }, [formatNomorSurat, digitPadding, formatBulan, kodeDesaSurat]);

  // ============ VALIDATION ============

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formatNomorSurat.includes('{nomor}')) {
      errors.formatNomorSurat = 'Format harus mengandung {nomor}';
    }
    if (digitPadding < 1 || digitPadding > 6) {
      errors.digitPadding = 'Digit padding harus antara 1-6';
    }
    if (!formatNomorRegister.includes('{nomor}')) {
      errors.formatNomorRegister = 'Format harus mengandung {nomor}';
    }
    if (digitPaddingReg < 1 || digitPaddingReg > 6) {
      errors.digitPaddingReg = 'Digit padding register harus antara 1-6';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formatNomorSurat, digitPadding, formatNomorRegister, digitPaddingReg]);

  // ============ HAS CHANGES ============

  const hasChanges = useMemo(() => {
    if (!originalConfig) {
      return (
        formatNomorSurat !== DEFAULTS.formatNomorSurat ||
        digitPadding !== DEFAULTS.digitPadding ||
        formatBulan !== DEFAULTS.formatBulan ||
        resetNomorPer !== DEFAULTS.resetNomorPer ||
        formatNomorRegister !== DEFAULTS.formatNomorRegister ||
        digitPaddingReg !== DEFAULTS.digitPaddingReg ||
        kodeDesaSurat !== DEFAULTS.kodeDesaSurat ||
        kepalaDesaNama !== DEFAULTS.kepalaDesaNama ||
        kepalaDesaNIP !== DEFAULTS.kepalaDesaNIP ||
        sekretarisNama !== DEFAULTS.sekretarisNama ||
        sekretarisNIP !== DEFAULTS.sekretarisNIP
      );
    }

    return (
      formatNomorSurat !== originalConfig.formatNomorSurat ||
      digitPadding !== originalConfig.digitPadding ||
      formatBulan !== originalConfig.formatBulan ||
      resetNomorPer !== originalConfig.resetNomorPer ||
      formatNomorRegister !== originalConfig.formatNomorRegister ||
      digitPaddingReg !== originalConfig.digitPaddingReg ||
      kodeDesaSurat !== originalConfig.kodeDesaSurat ||
      kepalaDesaNama !== (originalConfig.kepalaDesaNama || '') ||
      kepalaDesaNIP !== (originalConfig.kepalaDesaNIP || '') ||
      sekretarisNama !== (originalConfig.sekretarisNama || '') ||
      sekretarisNIP !== (originalConfig.sekretarisNIP || '')
    );
  }, [originalConfig, formatNomorSurat, digitPadding, formatBulan, resetNomorPer, formatNomorRegister, digitPaddingReg, kodeDesaSurat, kepalaDesaNama, kepalaDesaNIP, sekretarisNama, sekretarisNIP]);

  // ============ SAVE ============

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Perbaiki error validasi terlebih dahulu');
      return;
    }

    if (!kodeDesaSurat.trim()) {
      toast.error('Kode desa surat wajib diisi');
      setValidationErrors((prev) => ({ ...prev, kodeDesaSurat: 'Kode desa surat wajib diisi' }));
      setActiveTab('informasi-desa');
      return;
    }

    try {
      setSaving(true);
      const body: Record<string, unknown> = {
        formatNomorSurat,
        digitPadding,
        formatBulan,
        resetNomorPer,
        formatNomorRegister,
        digitPaddingReg,
        kodeDesaSurat: kodeDesaSurat.trim(),
        kepalaDesaNama: kepalaDesaNama.trim() || null,
        kepalaDesaNIP: kepalaDesaNIP.trim() || null,
        sekretarisNama: sekretarisNama.trim() || null,
        sekretarisNIP: sekretarisNIP.trim() || null,
      };

      const response = await fetch('/api/surat/konfigurasi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Konfigurasi berhasil disimpan!');
        setOriginalConfig(result.data as SuratKonfigurasi);
      } else {
        toast.error(result.error || 'Gagal menyimpan konfigurasi');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan konfigurasi');
    } finally {
      setSaving(false);
    }
  };

  // ============ RESET ============

  const handleReset = () => {
    if (originalConfig) {
      setFormatNomorSurat(originalConfig.formatNomorSurat);
      setDigitPadding(originalConfig.digitPadding);
      setFormatBulan(originalConfig.formatBulan);
      setResetNomorPer(originalConfig.resetNomorPer);
      setFormatNomorRegister(originalConfig.formatNomorRegister);
      setDigitPaddingReg(originalConfig.digitPaddingReg);
      setKodeDesaSurat(originalConfig.kodeDesaSurat);
      setKepalaDesaNama(originalConfig.kepalaDesaNama || '');
      setKepalaDesaNIP(originalConfig.kepalaDesaNIP || '');
      setSekretarisNama(originalConfig.sekretarisNama || '');
      setSekretarisNIP(originalConfig.sekretarisNIP || '');
      toast.info('Kembalikan ke konfigurasi tersimpan');
    } else {
      setFormatNomorSurat(DEFAULTS.formatNomorSurat);
      setDigitPadding(DEFAULTS.digitPadding);
      setFormatBulan(DEFAULTS.formatBulan);
      setResetNomorPer(DEFAULTS.resetNomorPer);
      setFormatNomorRegister(DEFAULTS.formatNomorRegister);
      setDigitPaddingReg(DEFAULTS.digitPaddingReg);
      setKodeDesaSurat(DEFAULTS.kodeDesaSurat);
      setKepalaDesaNama(DEFAULTS.kepalaDesaNama);
      setKepalaDesaNIP(DEFAULTS.kepalaDesaNIP);
      setSekretarisNama(DEFAULTS.sekretarisNama);
      setSekretarisNIP(DEFAULTS.sekretarisNIP);
      toast.info('Kembalikan ke nilai default');
    }
    setValidationErrors({});
  };

  // ============ COPY PREVIEW ============

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedPreview(label);
      toast.success('Disalin ke clipboard');
      setTimeout(() => setCopiedPreview(null), 2000);
    }).catch(() => {
      toast.error('Gagal menyalin ke clipboard');
    });
  };

  // ============ FORMAT HELPERS ============

  const getFormatBulanLabel = (val: string) => {
    const labels: Record<string, string> = {
      ROMAWI: 'Romawi (I, II, III, ...)',
      ANGKA: 'Angka (01, 02, 03, ...)',
      TANPA: 'Tanpa Bulan',
    };
    return labels[val] || val;
  };

  const getResetLabel = (val: string) => {
    const labels: Record<string, string> = {
      PER_TAHUN: 'Per Tahun',
      PER_BULAN: 'Per Bulan',
      BERKELANJUTAN: 'Berkelanjutan',
    };
    return labels[val] || val;
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // ============ LOADING STATE ============

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ============ ERROR STATE ============

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('surat-dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Kembali
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pengaturan Surat</h2>
            <p className="text-sm text-gray-500 mt-0.5">Konfigurasi format dan informasi surat desa</p>
          </div>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat Data</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchConfig} variant="outline">
            <Loader2 className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  // ============ MAIN RENDER ============

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('surat-dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pengaturan Surat</h2>
            <p className="text-sm text-gray-500 mt-0.5">Konfigurasi format dan informasi surat desa</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
              <Sparkles className="w-3 h-3 mr-1" />
              Ada perubahan
            </Badge>
          )}
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || (!hasChanges && originalConfig !== null)}
            className="min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tabs Form */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="nomor-surat" className="text-xs sm:text-sm">
                  <Hash className="w-3.5 h-3.5 mr-1.5 hidden sm:inline-flex" />
                  Nomor Surat
                </TabsTrigger>
                <TabsTrigger value="nomor-register" className="text-xs sm:text-sm">
                  <Hash className="w-3.5 h-3.5 mr-1.5 hidden sm:inline-flex" />
                  Nomor Register
                </TabsTrigger>
                <TabsTrigger value="informasi-desa" className="text-xs sm:text-sm">
                  <Building2 className="w-3.5 h-3.5 mr-1.5 hidden sm:inline-flex" />
                  Informasi Desa
                </TabsTrigger>
              </TabsList>

              {/* Tab: Format Nomor Surat */}
              <TabsContent value="nomor-surat" className="mt-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-500" />
                      Format Nomor Surat
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Format Nomor Surat */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Format Nomor Surat <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formatNomorSurat}
                        onChange={(e) => {
                          setFormatNomorSurat(e.target.value);
                          if (validationErrors.formatNomorSurat) {
                            setValidationErrors((prev) => {
                              const next = { ...prev };
                              delete next.formatNomorSurat;
                              return next;
                            });
                          }
                        }}
                        placeholder="{nomor}/{kodeDesaSurat || 'Ds.Contoh'}/{bulan}/{tahun}"
                        className={cn(
                          'font-mono text-sm',
                          validationErrors.formatNomorSurat && 'border-red-300 focus-visible:ring-red-200'
                        )}
                      />
                      {validationErrors.formatNomorSurat && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.formatNomorSurat}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        Placeholder: {'{nomor}'}, {'{kodeDesa}'}, {'{bulan}'}, {'{tahun}'}
                      </p>
                    </div>

                    {/* Digit Padding */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          Digit Padding <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={6}
                          value={digitPadding}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1 && val <= 6) {
                              setDigitPadding(val);
                            }
                          }}
                          className={cn(
                            'w-full',
                            validationErrors.digitPadding && 'border-red-300 focus-visible:ring-red-200'
                          )}
                        />
                        {validationErrors.digitPadding && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {validationErrors.digitPadding}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Jumlah digit nomor surat (contoh: 3 = &quot;001&quot;)
                        </p>
                      </div>

                      {/* Format Bulan */}
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Format Bulan</Label>
                        <Select value={formatBulan} onValueChange={setFormatBulan}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ROMAWI">Romawi (I, II, III, ...)</SelectItem>
                            <SelectItem value="ANGKA">Angka (01, 02, 03, ...)</SelectItem>
                            <SelectItem value="TANPA">Tanpa Bulan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Reset Nomor Per */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Reset Nomor Per</Label>
                      <Select value={resetNomorPer} onValueChange={setResetNomorPer}>
                        <SelectTrigger className="w-full sm:w-[280px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PER_TAHUN">Per Tahun (nomor direset setiap tahun)</SelectItem>
                          <SelectItem value="PER_BULAN">Per Bulan (nomor direset setiap bulan)</SelectItem>
                          <SelectItem value="BERKELANJUTAN">Berkelanjutan (nomor terus naik)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-400">
                        Kebijakan reset penomoran surat otomatis
                      </p>
                    </div>

                    {/* Quick Info */}
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-700 space-y-1">
                          <p className="font-medium">Variabel yang tersedia:</p>
                          <ul className="space-y-0.5 ml-1">
                            <li><code className="bg-blue-100 px-1 rounded">{'{nomor}'}</code> &mdash; Nomor urut surat</li>
                            <li><code className="bg-blue-100 px-1 rounded">{'{kodeDesa}'}</code> &mdash; Kode desa surat</li>
                            <li><code className="bg-blue-100 px-1 rounded">{'{bulan}'}</code> &mdash; Bulan (format sesuai pilihan)</li>
                            <li><code className="bg-blue-100 px-1 rounded">{'{tahun}'}</code> &mdash; Tahun (4 digit)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Format Nomor Register */}
              <TabsContent value="nomor-register" className="mt-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Hash className="w-4 h-4 text-teal-500" />
                      Format Nomor Register
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Format Nomor Register */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Format Nomor Register <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={formatNomorRegister}
                        onChange={(e) => {
                          setFormatNomorRegister(e.target.value);
                          if (validationErrors.formatNomorRegister) {
                            setValidationErrors((prev) => {
                              const next = { ...prev };
                              delete next.formatNomorRegister;
                              return next;
                            });
                          }
                        }}
                        placeholder="{nomor}/{kodeDesaSurat || 'Ds.Contoh'}/Reg/{tahun}"
                        className={cn(
                          'font-mono text-sm',
                          validationErrors.formatNomorRegister && 'border-red-300 focus-visible:ring-red-200'
                        )}
                      />
                      {validationErrors.formatNomorRegister && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.formatNomorRegister}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        Placeholder: {'{nomor}'}, {'{kodeDesa}'}, {'{tahun}'}
                      </p>
                    </div>

                    {/* Digit Padding Register */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Digit Padding Register <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        value={digitPaddingReg}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1 && val <= 6) {
                            setDigitPaddingReg(val);
                          }
                        }}
                        className={cn(
                          'w-full sm:w-[200px]',
                          validationErrors.digitPaddingReg && 'border-red-300 focus-visible:ring-red-200'
                        )}
                      />
                      {validationErrors.digitPaddingReg && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.digitPaddingReg}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        Jumlah digit nomor register (contoh: 4 = &quot;0001&quot;)
                      </p>
                    </div>

                    {/* Quick Info */}
                    <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-blue-700 space-y-1">
                          <p className="font-medium">Variabel yang tersedia:</p>
                          <ul className="space-y-0.5 ml-1">
                            <li><code className="bg-blue-100 px-1 rounded">{'{nomor}'}</code> &mdash; Nomor urut register</li>
                            <li><code className="bg-blue-100 px-1 rounded">{'{kodeDesa}'}</code> &mdash; Kode desa surat</li>
                            <li><code className="bg-blue-100 px-1 rounded">{'{tahun}'}</code> &mdash; Tahun (4 digit)</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Informasi Desa */}
              <TabsContent value="informasi-desa" className="mt-4">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-amber-500" />
                      Informasi Desa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Kode Desa Surat */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Kode Desa Surat <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={kodeDesaSurat}
                        onChange={(e) => {
                          setKodeDesaSurat(e.target.value);
                          if (validationErrors.kodeDesaSurat) {
                            setValidationErrors((prev) => {
                              const next = { ...prev };
                              delete next.kodeDesaSurat;
                              return next;
                            });
                          }
                        }}
                        placeholder="Ds.SukaMaju"
                        className={cn(
                          validationErrors.kodeDesaSurat && 'border-red-300 focus-visible:ring-red-200'
                        )}
                      />
                      {validationErrors.kodeDesaSurat && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {validationErrors.kodeDesaSurat}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        Kode yang akan tampil di nomor surat (contoh: Ds.SukaMaju)
                      </p>
                    </div>

                    <Separator />

                    {/* Kepala Desa */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        </div>
                        Kepala Desa
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Nama Kepala Desa</Label>
                          <Input
                            value={kepalaDesaNama}
                            onChange={(e) => setKepalaDesaNama(e.target.value)}
                            placeholder="Nama lengkap kepala desa"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">NIP Kepala Desa</Label>
                          <Input
                            value={kepalaDesaNIP}
                            onChange={(e) => setKepalaDesaNIP(e.target.value)}
                            placeholder="NIP kepala desa"
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Sekretaris */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-teal-100 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        </div>
                        Sekretaris Desa
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Nama Sekretaris</Label>
                          <Input
                            value={sekretarisNama}
                            onChange={(e) => setSekretarisNama(e.target.value)}
                            placeholder="Nama lengkap sekretaris"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm">NIP Sekretaris</Label>
                          <Input
                            value={sekretarisNIP}
                            onChange={(e) => setSekretarisNIP(e.target.value)}
                            placeholder="NIP sekretaris"
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

        {/* Right: Preview Sidebar */}
        <div className="space-y-4">
          {/* Preview Nomor Surat */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-500" />
                  Preview Nomor Surat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Surat pertama</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-bold text-gray-900 flex-1 break-all">
                      {previewNomorSurat}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => copyToClipboard(previewNomorSurat, 'surat1')}
                    >
                      <Copy className={cn(
                        'w-3.5 h-3.5',
                        copiedPreview === 'surat1' ? 'text-emerald-600' : 'text-gray-400'
                      )} />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Surat ke-15</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-bold text-gray-900 flex-1 break-all">
                      {previewNomorSuratLast}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => copyToClipboard(previewNomorSuratLast, 'surat15')}
                    >
                      <Copy className={cn(
                        'w-3.5 h-3.5',
                        copiedPreview === 'surat15' ? 'text-emerald-600' : 'text-gray-400'
                      )} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Preview Nomor Register */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-teal-500" />
                  Preview Nomor Register
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-2">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Register pertama</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-bold text-gray-900 flex-1 break-all">
                      {previewNomorRegister}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 shrink-0"
                      onClick={() => copyToClipboard(previewNomorRegister, 'reg1')}
                    >
                      <Copy className={cn(
                        'w-3.5 h-3.5',
                        copiedPreview === 'reg1' ? 'text-emerald-600' : 'text-gray-400'
                      )} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Current Settings Summary */}
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card className="border-0 shadow-sm bg-gray-50">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-gray-400" />
                  Ringkasan Pengaturan
                </h4>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Format Bulan</span>
                    <span className="font-medium text-gray-800">{getFormatBulanLabel(formatBulan)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Reset Per</span>
                    <span className="font-medium text-gray-800">{getResetLabel(resetNomorPer)}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Digit Padding Surat</span>
                    <span className="font-mono font-medium text-gray-800">{digitPadding}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Digit Padding Register</span>
                    <span className="font-mono font-medium text-gray-800">{digitPaddingReg}</span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Kode Desa</span>
                    <span className="font-mono font-medium text-gray-800 truncate max-w-[140px]">
                      {kodeDesaSurat || '-'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Kepala Desa & Sekretaris Preview */}
          {(kepalaDesaNama || sekretarisNama) && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-500" />
                    Pejabat Desa
                  </h4>
                  <div className="space-y-3">
                    {kepalaDesaNama && (
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Kepala Desa</p>
                        <p className="text-sm font-medium text-gray-800">{kepalaDesaNama}</p>
                        {kepalaDesaNIP && (
                          <p className="text-xs text-gray-400 font-mono">NIP: {kepalaDesaNIP}</p>
                        )}
                      </div>
                    )}
                    {sekretarisNama && (
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Sekretaris</p>
                        <p className="text-sm font-medium text-gray-800">{sekretarisNama}</p>
                        {sekretarisNIP && (
                          <p className="text-xs text-gray-400 font-mono">NIP: {sekretarisNIP}</p>
                        )}
                      </div>
                    )}
                    {!kepalaDesaNama && !sekretarisNama && (
                      <p className="text-sm text-gray-400 text-center py-2">
                        Belum diisi
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
