'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft,
  Users,
  Home,
  UserCheck,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Search,
  X,
  Check,
  Loader2,
  User,
  Crown,
  ShieldAlert,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ==================== TYPES ====================

interface MutasiKKDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kkAsal?: {
    id: string;
    nomorKK: string | null;
    kepalaKeluarga: string;
    alamat: string;
    anggota: Array<{
      id: string;
      namaLengkap: string;
      nik: string | null;
      hubunganKeluarga: string | null;
      jenisKelamin: string;
      foto?: string | null;
    }>;
  } | null;
  onSuccess?: () => void;
  wilayahOptions?: Array<{ id: string; label: string; dusunId: string }>;
}

interface KKTujuanSearchResult {
  id: string;
  nomorKK: string;
  kepalaKeluarga: string;
  alamat: string;
  jumlahAnggota: number;
}

type JenisMutasi = 'pindah-ke-kk' | 'pecah-kk';
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

// Hubungan keluarga options (exclude KEPALA_KELUARGA)
const hubunganKeluargaOptions = [
  { value: 'SUAMI', label: 'Suami' },
  { value: 'ISTRI', label: 'Istri' },
  { value: 'ANAK', label: 'Anak' },
  { value: 'ANAK_TIRI', label: 'Anak Tiri' },
  { value: 'ANAK_ANGKAT', label: 'Anak Angkat' },
  { value: 'MENANTU', label: 'Menantu' },
  { value: 'CUCU', label: 'Cucu' },
  { value: 'KAKEK', label: 'Kakek' },
  { value: 'NENEK', label: 'Nenek' },
  { value: 'ORANG_TUA', label: 'Orang Tua' },
  { value: 'MERTUA', label: 'Mertua' },
  { value: 'FAMILI_LAIN', label: 'Famili Lain' },
  { value: 'PEMBANTU', label: 'Pembantu' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

const hubunganLabels: Record<string, string> = {
  KEPALA_KELUARGA: 'Kepala Keluarga',
  SUAMI: 'Suami',
  ISTRI: 'Istri',
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

// ==================== COMPONENT ====================

export function MutasiKKDialog({
  open,
  onOpenChange,
  kkAsal = null,
  onSuccess,
  wilayahOptions = [],
}: MutasiKKDialogProps) {
  // Wizard state
  const [jenisMutasi, setJenisMutasi] = useState<JenisMutasi | null>(null);
  const [step, setStep] = useState<WizardStep>(1);

  // Step 2: Selected anggota
  const [selectedAnggotaIds, setSelectedAnggotaIds] = useState<string[]>([]);

  // Step 3A: KK tujuan (pindah-ke-kk)
  const [kkSearchQuery, setKkSearchQuery] = useState('');
  const [kkSearchResults, setKkSearchResults] = useState<KKTujuanSearchResult[]>([]);
  const [kkSearching, setKkSearching] = useState(false);
  const [kkTujuan, setKkTujuan] = useState<KKTujuanSearchResult | null>(null);

  // Step 3B: KK baru (pecah-kk)
  const [kkBaru, setKkBaru] = useState({
    nomorKK: '',
    alamat: '',
    rtId: '',
  });

  // Step 4: Hubungan keluarga untuk masing-masing anggota
  const [hubunganAnggota, setHubunganAnggota] = useState<Record<string, string>>({});

  // Step pecah-kk: kepala KK baru
  const [kepalaKKBaruId, setKepalaKKBaruId] = useState('');

  // Step 5: Ganti kepala KK (jika kepala KK ikut pindah)
  const [gantiKepalaId, setGantiKepalaId] = useState('');
  const [hubunganKepalaLama, setHubunganKepalaLama] = useState('ORANG_TUA');

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [keterangan, setKeterangan] = useState('');

  // Derived: kepala KK asal yang ikut pindah
  const kepalaKKAsal = useMemo(() => {
    if (!kkAsal) return null;
    return kkAsal.anggota.find(a => a.hubunganKeluarga === 'KEPALA_KELUARGA') || null;
  }, [kkAsal]);

  // Derived: apakah kepala KK ikut dipindahkan
  const kepalaIkutPindah = useMemo(() => {
    if (!kepalaKKAsal) return false;
    return selectedAnggotaIds.includes(kepalaKKAsal.id);
  }, [kepalaKKAsal, selectedAnggotaIds]);

  // Derived: sisa anggota yang TIDAK dicentang (kandidat pengganti kepala)
  const sisaAnggota = useMemo(() => {
    if (!kkAsal) return [];
    return kkAsal.anggota.filter(a => !selectedAnggotaIds.includes(a.id));
  }, [kkAsal, selectedAnggotaIds]);

  // Derived: anggota yang dipindahkan
  const anggotaDipindahkan = useMemo(() => {
    if (!kkAsal) return [];
    return kkAsal.anggota.filter(a => selectedAnggotaIds.includes(a.id));
  }, [kkAsal, selectedAnggotaIds]);

  // Derived: show step 5 (ganti kepala)
  const showStepGantiKepala = kepalaIkutPindah && sisaAnggota.length > 0;

  // Derived: step 5 nonaktif warning
  const showNonaktifWarning = kepalaIkutPindah && sisaAnggota.length === 0;

  // ==================== RESET ====================
  const resetAll = useCallback(() => {
    setJenisMutasi(null);
    setStep(1);
    setSelectedAnggotaIds([]);
    setKkSearchQuery('');
    setKkSearchResults([]);
    setKkSearching(false);
    setKkTujuan(null);
    setKkBaru({ nomorKK: '', alamat: '', rtId: '' });
    setHubunganAnggota({});
    setKepalaKKBaruId('');
    setGantiKepalaId('');
    setHubunganKepalaLama('ORANG_TUA');
    setSubmitting(false);
    setKeterangan('');
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      resetAll();
    }
  }, [open, resetAll]);

  // ==================== KK SEARCH ====================
  useEffect(() => {
    if (!kkSearchQuery.trim() || jenisMutasi !== 'pindah-ke-kk') {
      setKkSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setKkSearching(true);
      try {
        const response = await fetch(`/api/kependudukan/kk?search=${encodeURIComponent(kkSearchQuery)}&limit=10`);
        const result = await response.json();
        if (result.success) {
          const filtered = result.data
            .filter((kk: any) => kk.id !== kkAsal?.id && kk.isActive !== false)
            .map((kk: any) => ({
              id: kk.id,
              nomorKK: kk.nomorKK,
              kepalaKeluarga: kk.kepalaKeluarga?.namaLengkap || kk.kepalaKeluarga || 'Belum ada KK',
              alamat: kk.alamat,
              jumlahAnggota: kk.jumlahAnggota ?? kk.anggota?.length ?? 0,
            }));
          setKkSearchResults(filtered);
        }
      } catch {
        setKkSearchResults([]);
      } finally {
        setKkSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [kkSearchQuery, jenisMutasi, kkAsal?.id]);

  // ==================== CHECKBOX TOGGLE ====================
  const handleToggleAnggota = (anggotaId: string) => {
    setSelectedAnggotaIds(prev => {
      const next = prev.includes(anggotaId)
        ? prev.filter(id => id !== anggotaId)
        : [...prev, anggotaId];

      // If unchecking kepala KK baru in pecah-kk mode, clear kepalaKKBaruId
      if (jenisMutasi === 'pecah-kk' && !next.includes(kepalaKKBaruId)) {
        setKepalaKKBaruId('');
      }

      // Remove hubungan entries for unchecked anggota
      if (!next.includes(anggotaId)) {
        setHubunganAnggota(h => {
          const updated = { ...h };
          delete updated[anggotaId];
          return updated;
        });
      }

      // If kepala was selected/unselected, reset gantiKepalaId
      if (kepalaKKAsal) {
        const kepalaNowSelected = next.includes(kepalaKKAsal.id);
        const kepalaWasSelected = prev.includes(kepalaKKAsal.id);
        if (kepalaNowSelected !== kepalaWasSelected) {
          setGantiKepalaId('');
        }
      }

      return next;
    });
  };

  const handleSelectAll = () => {
    if (!kkAsal) return;
    const allIds = kkAsal.anggota.map(a => a.id);
    if (selectedAnggotaIds.length === allIds.length) {
      // Deselect all
      setSelectedAnggotaIds([]);
      setHubunganAnggota({});
      setKepalaKKBaruId('');
      setGantiKepalaId('');
    } else {
      // Select all
      setSelectedAnggotaIds(allIds);
    }
  };

  // ==================== STEP NAVIGATION ====================
  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return jenisMutasi !== null;
      case 2:
        return selectedAnggotaIds.length > 0;
      case 3:
        if (jenisMutasi === 'pindah-ke-kk') {
          return kkTujuan !== null;
        } else {
          return kkBaru.alamat.trim() !== '' && kkBaru.rtId !== '';
        }
      case 4: {
        // All anggota must have hubungan assigned
        const allAssigned = anggotaDipindahkan.every(a => {
          if (jenisMutasi === 'pecah-kk' && a.id === kepalaKKBaruId) return true; // auto KEPALA_KELUARGA
          return hubunganAnggota[a.id] !== undefined && hubunganAnggota[a.id] !== '';
        });
        if (!allAssigned) return false;
        if (jenisMutasi === 'pecah-kk' && !kepalaKKBaruId) return false;
        return true;
      }
      case 5:
        if (showStepGantiKepala && !gantiKepalaId) return false;
        return true;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (step === 5 && (showStepGantiKepala || showNonaktifWarning)) {
      setStep(6);
    } else if (step === 4 && (showStepGantiKepala || showNonaktifWarning)) {
      setStep(5);
    } else if (step < 6) {
      setStep((step + 1) as WizardStep);
    }
  };

  const goBack = () => {
    if (step === 6 && (showStepGantiKepala || showNonaktifWarning)) {
      setStep(5);
    } else if (step === 5 && (showStepGantiKepala || showNonaktifWarning)) {
      setStep(4);
    } else if (step > 1) {
      setStep((step - 1) as WizardStep);
    }
  };

  // ==================== SUBMIT ====================
  const handleSubmit = async () => {
    // Final validation
    if (selectedAnggotaIds.length === 0) {
      toast.error('Pilih minimal 1 anggota yang akan dimutasi');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        jenisMutasi,
        anggotaIds: selectedAnggotaIds,
        hubunganAnggota,
        tanggalMutasi: new Date().toISOString(),
        keterangan: keterangan || undefined,
      };

      if (jenisMutasi === 'pindah-ke-kk') {
        if (!kkTujuan) {
          toast.error('Pilih KK tujuan');
          return;
        }
        body.kkTujuanId = kkTujuan.id;
      } else {
        // pecah-kk
        if (!kepalaKKBaruId) {
          toast.error('Pilih kepala KK baru');
          return;
        }
        body.kepalaKKBaruId = kepalaKKBaruId;
        body.kkBaru = {
          nomorKK: kkBaru.nomorKK || undefined,
          alamat: kkBaru.alamat,
          rtId: kkBaru.rtId,
        };
      }

      // Ganti kepala KK asal
      if (showStepGantiKepala && gantiKepalaId) {
        body.gantiKepalaId = gantiKepalaId;
        body.hubunganKepalaLama = hubunganKepalaLama;
      }

      const res = await fetch('/api/kependudukan/mutasi-kk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        const jumlah = selectedAnggotaIds.length;
        const label = jenisMutasi === 'pindah-ke-kk' ? 'Pindah ke KK Lain' : 'Pecah KK';
        let desc = `${jumlah} anggota berhasil dimutasi (${label})`;
        if (data.data?.gantiKepala) {
          desc += `. Kepala KK diganti ke ${data.data.gantiKepala.kepalaBaru}`;
        }
        if (data.data?.kkDinonaktifkan) {
          desc += '. KK asal dinonaktifkan (tidak ada anggota tersisa).';
        }
        toast.success('Mutasi KK berhasil', {
          description: desc,
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(data.error || 'Gagal memproses mutasi KK');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses mutasi');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== STEP LABELS ====================
  const stepLabels: Record<number, string> = {
    1: 'Jenis Mutasi',
    2: 'Pilih Anggota',
    3: jenisMutasi === 'pindah-ke-kk' ? 'KK Tujuan' : 'Data KK Baru',
    4: 'Hubungan Keluarga',
    5: 'Ganti Kepala KK',
    6: 'Konfirmasi',
  };

  // ==================== RENDER: STEP 1 ====================
  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">Pilih jenis mutasi yang ingin dilakukan</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pindah ke KK Lain */}
        <button
          type="button"
          onClick={() => setJenisMutasi('pindah-ke-kk')}
          className={cn(
            'p-5 rounded-xl border-2 text-left transition-all',
            jenisMutasi === 'pindah-ke-kk'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm'
              : 'border-border bg-card hover:border-emerald-500/50 hover:shadow-sm'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              jenisMutasi === 'pindah-ke-kk' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
            )}>
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground">Pindah ke KK Lain</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-13">
            Pindah anggota ke Kartu Keluarga yang sudah ada
          </p>
        </button>

        {/* Pecah KK */}
        <button
          type="button"
          onClick={() => setJenisMutasi('pecah-kk')}
          className={cn(
            'p-5 rounded-xl border-2 text-left transition-all',
            jenisMutasi === 'pecah-kk'
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-sm'
              : 'border-border bg-card hover:border-emerald-500/50 hover:shadow-sm'
          )}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              jenisMutasi === 'pecah-kk' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'
            )}>
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-foreground">Pecah KK (Buat KK Baru)</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-13">
            Pecah beberapa anggota untuk membuat KK baru
          </p>
        </button>
      </div>
    </div>
  );

  // ==================== RENDER: STEP 2 ====================
  const renderStep2 = () => (
    <div className="space-y-4">
      {/* KK Asal Info */}
      {kkAsal && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">KK Asal</p>
          <p className="font-mono text-sm text-blue-700 dark:text-blue-300">{kkAsal.nomorKK || 'Belum ada Nomor KK'}</p>
          <p className="text-blue-600 dark:text-blue-400">{kkAsal.kepalaKeluarga} — {kkAsal.alamat}</p>
          <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{kkAsal.anggota.length} anggota</p>
        </div>
      )}

      {/* Select All */}
      {kkAsal && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Pilih anggota yang akan dipindahkan
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            {selectedAnggotaIds.length === kkAsal.anggota.length ? 'Batal Semua' : 'Pilih Semua'}
          </Button>
        </div>
      )}

      {/* Anggota list */}
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {kkAsal?.anggota.map((anggota) => {
          const isSelected = selectedAnggotaIds.includes(anggota.id);
          return (
            <div
              key={anggota.id}
              onClick={() => handleToggleAnggota(anggota.id)}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                  : 'border-border hover:border-border/80 hover:bg-muted/50'
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => handleToggleAnggota(anggota.id)}
                className="pointer-events-none"
              />
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {anggota.foto ? (
                  <img src={anggota.foto} alt={anggota.namaLengkap} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-foreground truncate">{anggota.namaLengkap}</p>
                  {anggota.hubunganKeluarga === 'KEPALA_KELUARGA' && (
                    <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0 h-5">
                      <Crown className="w-3 h-3 mr-0.5" />
                      Kepala
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{anggota.nik || '-'}</p>
              </div>
              {/* Right side */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  {hubunganLabels[anggota.hubunganKeluarga || ''] || anggota.hubunganKeluarga || '-'}
                </Badge>
                <Badge className={anggota.jenisKelamin === 'LAKI_LAKI' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-[10px]' : 'bg-pink-100 text-pink-700 text-[10px]'}>
                  {anggota.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Validation */}
      {selectedAnggotaIds.length === 0 && (
        <p className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          Pilih minimal 1 anggota untuk melanjutkan
        </p>
      )}

      {/* Kepala KK warning */}
      {kepalaIkutPindah && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
            <Crown className="w-4 h-4" />
            <strong>Kepala KK ikut dipindahkan.</strong> Anda perlu menentukan pengganti kepala keluarga pada langkah selanjutnya.
          </p>
        </div>
      )}
    </div>
  );

  // ==================== RENDER: STEP 3A (Pindah ke KK) ====================
  const renderStep3A = () => (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>{selectedAnggotaIds.length} anggota</strong> akan dipindahkan dari KK asal ke KK tujuan
        </p>
      </div>

      {/* Search KK Tujuan */}
      <div className="space-y-2">
        <Label>Cari KK Tujuan</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={kkSearchQuery}
            onChange={(e) => {
              setKkSearchQuery(e.target.value);
              setKkTujuan(null);
            }}
            placeholder="Cari berdasarkan Nomor KK atau Nama Kepala Keluarga..."
            className="pl-10"
          />
          {kkSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">Ketik minimal 3 karakter untuk mencari</p>
      </div>

      {/* Search Results */}
      {!kkSearching && kkSearchResults.length > 0 && !kkTujuan && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {kkSearchResults.map(kk => (
            <button
              key={kk.id}
              type="button"
              onClick={() => {
                setKkTujuan(kk);
                setKkSearchQuery('');
                setKkSearchResults([]);
              }}
              className="w-full p-3 rounded-lg border border-border text-left hover:border-emerald-500/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm text-muted-foreground">{kk.nomorKK || 'Belum ada Nomor KK'}</p>
                  <p className="font-medium text-foreground">{kk.kepalaKeluarga}</p>
                  <p className="text-xs text-muted-foreground">{kk.alamat}</p>
                </div>
                <Badge variant="outline">{kk.jumlahAnggota} anggota</Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {!kkSearching && kkSearchQuery.length >= 3 && kkSearchResults.length === 0 && !kkTujuan && (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Tidak ditemukan KK dengan kata kunci &quot;{kkSearchQuery}&quot;
        </div>
      )}

      {/* Selected KK Tujuan */}
      {kkTujuan && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">KK Tujuan Terpilih</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setKkTujuan(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 h-7 px-2"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="font-mono text-emerald-900 dark:text-emerald-100">{kkTujuan.nomorKK || 'Belum ada Nomor KK'}</p>
          <p className="text-emerald-700 dark:text-emerald-300">{kkTujuan.kepalaKeluarga}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">{kkTujuan.alamat}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            <Users className="w-3 h-3" />
            <span>{kkTujuan.jumlahAnggota} anggota saat ini</span>
          </div>
        </div>
      )}

      {/* Validation */}
      {!kkTujuan && (
        <p className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          Pilih KK tujuan untuk melanjutkan
        </p>
      )}
    </div>
  );

  // ==================== RENDER: STEP 3B (Pecah KK) ====================
  const renderStep3B = () => (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>{selectedAnggotaIds.length} anggota</strong> akan dipecah untuk membentuk KK baru
        </p>
      </div>

      {/* Nomor KK */}
      <div className="space-y-2">
        <Label>Nomor KK Baru <span className="text-muted-foreground text-xs">(opsional)</span></Label>
        <Input
          value={kkBaru.nomorKK}
          onChange={(e) => setKkBaru(prev => ({ ...prev, nomorKK: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
          placeholder="Masukkan 16 digit Nomor KK (kosongkan jika belum ada)"
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">Jika dikosongkan, sistem akan menghasilkan nomor KK otomatis</p>
      </div>

      {/* Alamat */}
      <div className="space-y-2">
        <Label>Alamat <span className="text-red-500 dark:text-red-400">*</span></Label>
        <Textarea
          value={kkBaru.alamat}
          onChange={(e) => setKkBaru(prev => ({ ...prev, alamat: e.target.value }))}
          placeholder="Alamat lengkap KK baru"
          rows={2}
        />
      </div>

      {/* RT/RW/Dusun */}
      <div className="space-y-2">
        <Label>RT/RW/Dusun <span className="text-red-500 dark:text-red-400">*</span></Label>
        <Select
          value={kkBaru.rtId}
          onValueChange={(v) => setKkBaru(prev => ({ ...prev, rtId: v }))}
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

      {/* Validation */}
      {(!kkBaru.alamat.trim() || !kkBaru.rtId) && (
        <p className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
          <AlertTriangle className="w-4 h-4" />
          Alamat dan RT/RW/Dusun wajib diisi
        </p>
      )}
    </div>
  );

  // ==================== RENDER: STEP 4 ====================
  const renderStep4 = () => (
    <div className="space-y-4">
      {/* Pecah KK: Pilih Kepala KK Baru */}
      {jenisMutasi === 'pecah-kk' && (
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
              <Crown className="w-4 h-4" />
              <strong>Pilih Kepala KK Baru</strong> dari anggota yang dipindahkan
            </p>
          </div>
          <div className="space-y-2">
            <Label>Kepala KK Baru <span className="text-red-500 dark:text-red-400">*</span></Label>
            <Select
              value={kepalaKKBaruId}
              onValueChange={(v) => {
                setKepalaKKBaruId(v);
                // Auto-set hubungan KEPALA_KELUARGA and clear previous hubungan if needed
                setHubunganAnggota(prev => {
                  const updated = { ...prev };
                  // If this person had a different hubungan, clear it (will auto be KEPALA_KELUARGA)
                  delete updated[v];
                  // If previous kepala had hubungan set, clear it since they're no longer kepala
                  if (Object.keys(updated).length > 0) {
                    // Keep existing assignments
                  }
                  return updated;
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih anggota sebagai Kepala KK" />
              </SelectTrigger>
              <SelectContent>
                {anggotaDipindahkan.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <span>{a.namaLengkap}</span>
                      <span className="text-xs text-muted-foreground">({a.nik || '-'})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Separator />

      {/* Hubungan Keluarga untuk masing-masing anggota */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">
          Tentukan hubungan keluarga di {jenisMutasi === 'pindah-ke-kk' ? 'KK tujuan' : 'KK baru'}
        </p>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {anggotaDipindahkan.map((anggota) => {
            const isKepalaBaru = jenisMutasi === 'pecah-kk' && anggota.id === kepalaKKBaruId;
            const currentHubungan = hubunganAnggota[anggota.id] || '';

            return (
              <div
                key={anggota.id}
                className={cn(
                  'p-3 rounded-lg border',
                  isKepalaBaru ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30' : 'border-border bg-card'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {anggota.foto ? (
                      <img src={anggota.foto} alt={anggota.namaLengkap} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-medium text-sm text-foreground truncate">{anggota.namaLengkap}</p>
                      {isKepalaBaru && (
                        <Badge className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0 h-5">
                          <Crown className="w-3 h-3 mr-0.5" />
                          Kepala
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{anggota.nik || '-'}</p>
                  </div>
                  {/* Hubungan Selector */}
                  {isKepalaBaru ? (
                    <Badge className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs">
                      Kepala Keluarga
                    </Badge>
                  ) : (
                    <Select
                      value={currentHubungan}
                      onValueChange={(v) => {
                        setHubunganAnggota(prev => ({ ...prev, [anggota.id]: v }));
                      }}
                    >
                      <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="Pilih hubungan" />
                      </SelectTrigger>
                      <SelectContent>
                        {hubunganKeluargaOptions.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Validation */}
        {!anggotaDipindahkan.every(a => {
          if (jenisMutasi === 'pecah-kk' && a.id === kepalaKKBaruId) return true;
          return hubunganAnggota[a.id] !== undefined && hubunganAnggota[a.id] !== '';
        }) && (
          <p className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Tentukan hubungan keluarga untuk semua anggota
          </p>
        )}
      </div>
    </div>
  );

  // ==================== RENDER: STEP 5 ====================
  const renderStep5 = () => (
    <div className="space-y-4">
      {showStepGantiKepala ? (
        <>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <Crown className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Kepala KK ikut pindah.</strong> Pilih pengganti kepala keluarga dari anggota yang tetap di KK asal.
              </div>
            </div>
          </div>

          {/* Sisa anggota */}
          <div className="space-y-2">
            <Label>Pengganti Kepala Keluarga <span className="text-red-500 dark:text-red-400">*</span></Label>
            <Select
              value={gantiKepalaId}
              onValueChange={setGantiKepalaId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih pengganti kepala keluarga" />
              </SelectTrigger>
              <SelectContent>
                {sisaAnggota.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <span>{a.namaLengkap}</span>
                      <span className="text-xs text-muted-foreground">
                        ({hubunganLabels[a.hubunganKeluarga || ''] || '-'})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Hubungan kepala lama — hanya untuk pecah-kk (hubungan di KK baru) */}
          {jenisMutasi === 'pecah-kk' && (
            <div className="space-y-2">
              <Label>Hubungan Kepala KK Lama di KK Baru <span className="text-red-500 dark:text-red-400">*</span></Label>
              <Select
                value={hubunganKepalaLama}
                onValueChange={setHubunganKepalaLama}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hubunganKeluargaOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Validation */}
          {!gantiKepalaId && (
            <p className="text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              Pilih pengganti kepala keluarga
            </p>
          )}
        </>
      ) : showNonaktifWarning ? (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">KK Asal Akan Dinonaktifkan</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Semua anggota KK dipindahkan. KK <span className="font-mono">{kkAsal?.nomorKK || '-'}</span> akan otomatis dinonaktifkan karena tidak ada anggota tersisa.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  // ==================== RENDER: STEP 6 ====================
  const renderStep6 = () => {
    const getHubunganLabel = (anggotaId: string) => {
      if (jenisMutasi === 'pecah-kk' && anggotaId === kepalaKKBaruId) return 'Kepala Keluarga';
      return hubunganLabels[hubunganAnggota[anggotaId]] || '-';
    };

    const penggantiKepala = sisaAnggota.find(a => a.id === gantiKepalaId);

    return (
      <div className="space-y-4">
        {/* Ringkasan anggota pindah */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Anggota yang dipindahkan ({selectedAnggotaIds.length} orang)
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {anggotaDipindahkan.map(a => (
              <div key={a.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {a.foto ? (
                    <img src={a.foto} alt={a.namaLengkap} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm font-medium text-foreground flex-1 truncate">{a.namaLengkap}</p>
                <Badge variant="outline" className="text-[10px]">
                  {getHubunganLabel(a.id)}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* KK Asal Info */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Home className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            KK Asal
          </p>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-mono text-sm">{kkAsal?.nomorKK || 'Belum ada Nomor KK'}</p>
            <p className="text-sm text-foreground">{kkAsal?.kepalaKeluarga}</p>
            <p className="text-xs text-muted-foreground">{kkAsal?.alamat}</p>
          </div>
        </div>

        {/* KK Tujuan / KK Baru Info */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
            {jenisMutasi === 'pindah-ke-kk' ? (
              <ArrowRightLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Home className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
            {jenisMutasi === 'pindah-ke-kk' ? 'KK Tujuan' : 'KK Baru'}
          </p>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
            {jenisMutasi === 'pindah-ke-kk' && kkTujuan && (
              <>
                <p className="font-mono text-sm text-emerald-900 dark:text-emerald-100">{kkTujuan.nomorKK || 'Belum ada Nomor KK'}</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{kkTujuan.kepalaKeluarga}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{kkTujuan.alamat}</p>
              </>
            )}
            {jenisMutasi === 'pecah-kk' && (
              <>
                <p className="font-mono text-sm text-emerald-900 dark:text-emerald-100">
                  {kkBaru.nomorKK || '(Akan dibuat otomatis)'}
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Kepala: {anggotaDipindahkan.find(a => a.id === kepalaKKBaruId)?.namaLengkap || '-'}
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">{kkBaru.alamat}</p>
                {kkBaru.rtId && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Wilayah: {wilayahOptions.find(w => w.id === kkBaru.rtId)?.label || '-'}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Ganti Kepala Info */}
        {showStepGantiKepala && gantiKepalaId && penggantiKepala && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Ganti Kepala KK Asal
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{kepalaKKAsal?.namaLengkap}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">{penggantiKepala.namaLengkap}</span>
                </div>
                {jenisMutasi === 'pecah-kk' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Hubungan di KK baru: {hubunganLabels[hubunganKepalaLama] || hubunganKepalaLama}
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Nonaktif warning */}
        {showNonaktifWarning && (
          <>
            <Separator />
            <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                KK asal akan <strong>dinonaktifkan</strong> (tidak ada anggota tersisa)
              </p>
            </div>
          </>
        )}

        {/* Keterangan */}
        <div className="space-y-2">
          <Label>Keterangan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
          <Textarea
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            placeholder="Tambahkan catatan atau keterangan mutasi..."
            rows={2}
          />
        </div>
      </div>
    );
  };

  // ==================== STEP INDICATOR ====================
  const renderStepIndicator = () => {
    // Calculate effective steps (skip step 5 if no kepala handling needed)
    const hasGantiKepalaStep = kepalaIkutPindah;
    const totalSteps = hasGantiKepalaStep ? 6 : 5;

    const getEffectiveStepNumber = (s: number): number => {
      if (!hasGantiKepalaStep) {
        if (s === 6) return 5; // Konfirmasi is step 5 when no ganti kepala
        if (s === 5) return -1; // Skip step 5
      }
      return s;
    };

    const visibleSteps = [1, 2, 3, 4, ...(hasGantiKepalaStep ? [5] : []), 6];

    return (
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {visibleSteps.map((s, idx) => {
          const effectiveNum = hasGantiKepalaStep ? s : (s === 6 ? 5 : s);
          const isActive = step === s;
          const isCompleted = step > s;
          return (
            <div key={s} className="flex items-center gap-1">
              {idx > 0 && (
                <div className={cn(
                  'w-6 h-0.5 flex-shrink-0',
                  isCompleted ? 'bg-emerald-500' : 'bg-border'
                )} />
              )}
              <div className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium flex-shrink-0 transition-all',
                isActive
                  ? 'bg-emerald-500 text-white'
                  : isCompleted
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
              )}>
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  effectiveNum
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ==================== MAIN RENDER ====================
  const renderStepContent = () => {
    switch (step) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return jenisMutasi === 'pindah-ke-kk' ? renderStep3A() : renderStep3B();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            Mutasi Anggota KK
          </DialogTitle>
          <DialogDescription>
            {jenisMutasi === 'pindah-ke-kk'
              ? 'Pindah anggota ke Kartu Keluarga lain'
              : jenisMutasi === 'pecah-kk'
                ? 'Pecah anggota untuk membuat KK baru'
                : 'Pilih jenis mutasi yang ingin dilakukan'
            }
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        {jenisMutasi && (
          <div className="px-6 pt-3 flex-shrink-0">
            {renderStepIndicator()}
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 pb-6 pt-3 border-t flex-shrink-0 gap-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={submitting}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Kembali
            </Button>
          )}

          {step < 6 ? (
            <Button
              type="button"
              onClick={goNext}
              disabled={!canGoNext() || submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Lanjutkan
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4 mr-1.5" />
                  Proses Mutasi
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
