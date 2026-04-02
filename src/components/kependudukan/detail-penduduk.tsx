'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Home,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Heart,
  FileText,
  Users,
  Clock,
  Edit2,
  Printer,
  Trash2,
  ArrowRightLeft,
  CheckCircle2,
  Briefcase,
  GraduationCap,
  Shield,
  Star,
  ChevronRight,
  CreditCard,
  UserCog,
  AlertCircle,
  Eye as EyeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Skeleton } from '@/components/ui/loading-skeleton';
import { AuditLogTimeline } from '@/components/kependudukan/audit-log-timeline';
import { MutasiKKDialog } from '@/components/kependudukan/mutasi-kk-dialog';

interface PendudukDetailData {
  id: string;
  nik: string;
  namaLengkap: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: string;
  golonganDarah: string | null;
  agama: string;
  suku: string | null;
  statusPerkawinan: string;
  pekerjaan: string | null;
  pendidikan: string | null;
  penghasilan: string | null;
  kewarganegaraan: string;
  negaraAsal: string | null;
  noPaspor: string | null;
  noKitasKitap: string | null;
  tanggalMasuk: string | null;
  statusKTP: string | null;
  statusAnak: string | null;
  noAktaKelahiran: string | null;
  noBPJSKesehatan: string | null;
  noBPJSTenagakerja: string | null;
  npwp: string | null;
  namaAyah: string | null;
  namaIbu: string | null;
  nikAyah: string | null;
  nikIbu: string | null;
  anakKe: number | null;
  jumlahSaudara: number | null;
  hubunganKeluarga: string | null;
  aktaPerkawinan: string | null;
  tanggalPerkawinan: string | null;
  aktaPerceraian: string | null;
  tanggalPerceraian: string | null;
  jenisDisabilitas: string | null;
  keteranganDisabilitas: string | null;
  penyakitKronis: string | null;
  status: string;
  isActive: boolean;
  noHP: string | null;
  email: string | null;
  foto: string | null;
  createdAt: string;
  updatedAt: string;
  // Relasi KK
  kkId: string | null;
  kk?: {
    id: string;
    nomorKK: string;
    alamat: string;
    rt: string;
    rw: string;
    dusun: string;
  } | null;
  // Relasi pasangan
  pasangan?: {
    id: string;
    namaLengkap: string;
    nik: string | null;
  } | null;
}

interface DetailPendudukProps {
  pendudukId: string;
  onBack: () => void;
  onEdit: (penduduk: PendudukDetailData) => void;
  onDelete: (penduduk: PendudukDetailData) => void;
}

const statusPerkawinanLabels: Record<string, string> = {
  BELUM_KAWIN: 'Belum Kawin',
  KAWIN_TERCATAT: 'Kawin Tercatat',
  KAWIN_TIDAK_TERCATAT: 'Kawin Tidak Tercatat',
  CERAI_HIDUP_TERCATAT: 'Cerai Hidup Tercatat',
  CERAI_HIDUP_TIDAK_TERCATAT: 'Cerai Hidup Tidak Tercatat',
  CERAI_MATI: 'Cerai Mati',
};

const statusKTPLabels: Record<string, string> = {
  BELUM_BUAT: 'Belum Buat',
  SUDAH_BUAT: 'Sudah Buat',
  HILANG: 'Hilang',
  DALAM_PROSES: 'Dalam Proses',
};

const statusAnakBadgeConfig: Record<string, { color: string; label: string }> = {
  BUKAN_YATIM_PIATU: { color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: 'Bukan Yatim Piatu' },
  YATIM: { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Yatim' },
  PIATU: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', label: 'Piatu' },
  YATIM_PIATU: { color: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300', label: 'Yatim Piatu' },
};

const hubunganKeluargaLabels: Record<string, string> = {
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

const agamaLabels: Record<string, string> = {
  ISLAM: 'Islam',
  KRISTEN: 'Kristen',
  KATOLIK: 'Katolik',
  HINDU: 'Hindu',
  BUDDHA: 'Buddha',
  KONGHUCU: 'Konghucu',
  LAINNYA: 'Lainnya',
};

const statusBadgeConfig: Record<string, { color: string; label: string }> = {
  TETAP: { color: 'bg-emerald-100 text-emerald-700', label: 'Tetap' },
  PENDATANG: { color: 'bg-blue-100 text-blue-700', label: 'Pendatang' },
  PINDAH: { color: 'bg-amber-100 text-amber-700', label: 'Pindah' },
  MENINGGAL: { color: 'bg-gray-100 text-gray-700', label: 'Meninggal' },
};

const disabilitasLabels: Record<string, string> = {
  TIDAK_ADA: 'Tidak Ada',
  FISIK: 'Fisik',
  NETRA: 'Netra',
  RUNGU: 'Rungu',
  WICARA: 'Wicara',
  MENTAL: 'Mental',
  INTELEKTUAL: 'Intelektual',
  LAINNYA: 'Lainnya',
};

export function DetailPenduduk({ pendudukId, onBack, onEdit, onDelete }: DetailPendudukProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PendudukDetailData | null>(null);
  const [activeTab, setActiveTab] = useState('datadiri');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mutasiDialogOpen, setMutasiDialogOpen] = useState(false);
  const [mutasiKKAsal, setMutasiKKAsal] = useState<any>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/kependudukan/penduduk/${pendudukId}`);
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        toast.error('Gagal mengambil detail penduduk');
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [pendudukId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const formatTanggal = (tanggal: string | null) => {
    if (!tanggal) return '-';
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const calculateAge = (tanggalLahir: string | null) => {
    if (!tanggalLahir) return '-';
    const birth = new Date(tanggalLahir);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} tahun` : '-';
  };

  const handlePrint = () => {
    if (!data) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup diblokir');
      return;
    }
    const content = `
      <!DOCTYPE html><html><head><title>Data Penduduk - ${data.namaLengkap}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 16px; margin-bottom: 4px; }
        .subtitle { font-size: 11px; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 6px 10px; font-size: 12px; text-align: left; }
        th { background: #f5f5f5; width: 200px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
      </style></head><body>
      <h1>${data.namaLengkap}</h1>
      <p class="subtitle">NIK: ${data.nik || 'Belum ada'} | Status: ${statusBadgeConfig[data.status]?.label || data.status}</p>
      <table>
        <tr><th>Tempat/Tgl Lahir</th><td>${data.tempatLahir || '-'}, ${formatTanggal(data.tanggalLahir)}</td></tr>
        <tr><th>Usia</th><td>${calculateAge(data.tanggalLahir)}</td></tr>
        <tr><th>Jenis Kelamin</th><td>${data.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}</td></tr>
        <tr><th>Golongan Darah</th><td>${data.golonganDarah || '-'}</td></tr>
        <tr><th>Agama</th><td>${agamaLabels[data.agama] || data.agama}</td></tr>
        <tr><th>Status Perkawinan</th><td>${statusPerkawinanLabels[data.statusPerkawinan] || data.statusPerkawinan}</td></tr>
        <tr><th>Pekerjaan</th><td>${data.pekerjaan || '-'}</td></tr>
        <tr><th>Pendidikan</th><td>${data.pendidikan || '-'}</td></tr>
        <tr><th>Alamat</th><td>${data.kk?.alamat || '-'}</td></tr>
        <tr><th>RT/RW/Dusun</th><td>RT ${data.kk?.rt || '-'}/RW ${data.kk?.rw || '-'} - ${data.kk?.dusun || '-'}</td></tr>
        <tr><th>No. KK</th><td>${data.kk?.nomorKK || '-'}</td></tr>
        <tr><th>Hubungan Keluarga</th><td>${hubunganKeluargaLabels[data.hubunganKeluarga || ''] || data.hubunganKeluarga || '-'}</td></tr>
        <tr><th>No. HP</th><td>${data.noHP || '-'}</td></tr>
        <tr><th>Email</th><td>${data.email || '-'}</td></tr>
      </table>
      <p style="font-size: 11px; color: #999;">Dicetak: ${new Date().toLocaleString('id-ID')}</p>
      </body></html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDelete = async () => {
    if (!data) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/kependudukan/penduduk/${data.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('Penduduk berhasil dihapus');
        setShowDeleteConfirm(false);
        onBack();
      } else {
        toast.error(result.error || 'Gagal menghapus penduduk');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenMutasiKK = async () => {
    if (!data?.kkId) {
      toast.error('Penduduk belum memiliki KK');
      return;
    }
    try {
      toast.info('Memuat data KK...');
      const response = await fetch(`/api/kependudukan/kk/${data.kkId}`);
      const result = await response.json();
      if (result.success) {
        const kk = result.data;
        const activeAnggota = (kk.anggota || []).filter((a: any) => a.isActive !== false);
        const kepala = activeAnggota.find((a: any) => a.hubunganKeluarga === 'KEPALA_KELUARGA');
        setMutasiKKAsal({
          id: kk.id,
          nomorKK: kk.nomorKK || null,
          kepalaKeluarga: kepala?.namaLengkap || '-',
          alamat: kk.alamat || '-',
          anggota: activeAnggota.map((a: any) => ({
            id: a.id, namaLengkap: a.namaLengkap, nik: a.nik || null,
            hubunganKeluarga: a.hubunganKeluarga || null, jenisKelamin: a.jenisKelamin, foto: a.foto || null,
          })),
        });
        setMutasiDialogOpen(true);
      }
    } catch {
      toast.error('Gagal memuat data KK');
    }
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="w-[340px] flex-shrink-0 border-r bg-card p-5 space-y-4">
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[160px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
        <div className="flex-1 min-w-0 p-6 space-y-6">
          <Skeleton className="h-10 w-[400px] rounded-lg" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Data Penduduk Tidak Ditemukan</h3>
          <p className="text-sm text-muted-foreground mb-4">Penduduk yang Anda cari tidak tersedia atau telah dihapus.</p>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = statusBadgeConfig[data.status] || { color: 'bg-gray-100 text-gray-700', label: data.status };
  const isKepala = data.hubunganKeluarga === 'KEPALA_KELUARGA';
  const age = calculateAge(data.tanggalLahir);

  // ==================== MAIN LAYOUT ====================
  return (
    <div className="min-h-screen bg-background flex">

      {/* ========== LEFT SIDEBAR ========== */}
      <aside className="w-[340px] flex-shrink-0 border-r bg-card sticky top-0 h-screen overflow-y-auto">
        <div className="p-5 space-y-4">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-0.5 flex-wrap -ml-1">
            <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted/50">
              <Home className="w-3.5 h-3.5" /><span>Beranda</span>
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
            <button onClick={onBack} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted/50">
              <span>Kependudukan</span>
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
            <button onClick={onBack} className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted/50">
              <span>Data Penduduk</span>
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
            <span className="inline-flex items-center text-xs font-medium text-foreground px-1.5 py-1 truncate max-w-[120px]" title={data.namaLengkap}>
              {data.namaLengkap}
            </span>
          </nav>

          {/* 1. Profil Penduduk */}
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-start gap-3.5">
                <div className="relative flex-shrink-0">
                  <div className="w-[80px] h-[80px] rounded-xl bg-muted flex items-center justify-center overflow-hidden border">
                    {data.foto ? (
                      <img src={data.foto} alt={data.namaLengkap} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl font-bold text-muted-foreground">
                        {data.namaLengkap.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {isKepala && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                      <Star className="w-3 h-3 text-white fill-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground truncate leading-tight">{data.namaLengkap}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <Badge className={cn('text-xs', statusConfig.color)}>{statusConfig.label}</Badge>
                    {data.statusAnak && data.statusAnak !== 'BUKAN_YATIM_PIATU' && (
                      <Badge className={cn('text-xs', statusAnakBadgeConfig[data.statusAnak]?.color)}>
                        {statusAnakBadgeConfig[data.statusAnak]?.label || data.statusAnak}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {data.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}
                    </Badge>
                    {isKepala && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                        <Star className="w-3 h-3 mr-0.5 fill-amber-500 text-amber-500" />
                        Kepala KK
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mt-1.5 truncate" title={data.nik}>
                    NIK: {data.nik || 'Belum ada NIK'}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" /><span>{age}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Shield className="w-3 h-3" /><span>{agamaLabels[data.agama] || data.agama}</span>
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Data KK & Alamat (satu kartu) */}
          <Card className="rounded-xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-foreground">Data KK & Alamat</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">No. KK</span>
                  <span className="font-mono text-foreground font-medium truncate max-w-[180px]" title={data.kk?.nomorKK}>
                    {data.kk?.nomorKK || 'Belum ada KK'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Hubungan</span>
                  <span className="text-foreground font-medium">{hubunganKeluargaLabels[data.hubunganKeluarga || ''] || data.hubunganKeluarga || '-'}</span>
                </div>
              </div>
              <div className="border-t" />
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{data.kk?.alamat || '-'}</span>
              </div>
              <div className="space-y-1.5 pl-6">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">RT/RW</span>
                  <span className="text-foreground font-medium">RT {data.kk?.rt || '-'}/RW {data.kk?.rw || '-'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Dusun</span>
                  <span className="text-foreground font-medium">{data.kk?.dusun || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Kontak */}
          <Card className="rounded-xl">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-foreground">Kontak</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <span className="text-foreground">{data.noHP || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-3 h-3 text-muted-foreground" />
                  <span className="text-foreground truncate">{data.email || '-'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Tombol Aksi */}
          <div className="space-y-2 pt-1">
            <Button variant="outline" onClick={() => onEdit(data)} className="w-full justify-start">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Data Penduduk
            </Button>
            <Button variant="outline" onClick={handlePrint} className="w-full justify-start">
              <Printer className="w-4 h-4 mr-2" />
              Cetak Data
            </Button>
            {data.kkId && (
              <Button variant="outline" onClick={handleOpenMutasiKK} className="w-full justify-start">
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Mutasi KK
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus Penduduk
            </Button>
          </div>
        </div>
      </aside>

      {/* ========== RIGHT CONTENT PANEL ========== */}
      <main className="flex-1 min-w-0 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="datadiri" className="gap-1.5">
              <User className="w-3.5 h-3.5" />
              Data Diri
            </TabsTrigger>
            <TabsTrigger value="keluarga" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Keluarga
            </TabsTrigger>
            <TabsTrigger value="dokumen" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Dokumen
            </TabsTrigger>
            <TabsTrigger value="kesehatan" className="gap-1.5">
              <Heart className="w-3.5 h-3.5" />
              Kesehatan
            </TabsTrigger>
            <TabsTrigger value="riwayat" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Riwayat
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Data Diri */}
          <TabsContent value="datadiri">
            <Card className="rounded-xl">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  Data Pribadi
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'NIK', value: data.nik ? <span className="font-mono">{data.nik}</span> : '-', },
                    { label: 'Tempat Lahir', value: data.tempatLahir || '-' },
                    { label: 'Tanggal Lahir', value: formatTanggal(data.tanggalLahir) },
                    { label: 'Usia', value: age },
                    { label: 'Jenis Kelamin', value: data.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan' },
                    { label: 'Golongan Darah', value: data.golonganDarah || '-' },
                    { label: 'Agama', value: agamaLabels[data.agama] || data.agama },
                    { label: 'Suku', value: data.suku || '-' },
                    { label: 'Status Perkawinan', value: statusPerkawinanLabels[data.statusPerkawinan] || data.statusPerkawinan },
                    { label: 'Pekerjaan', value: data.pekerjaan || '-' },
                    { label: 'Pendidikan', value: data.pendidikan || '-' },
                    { label: 'Penghasilan', value: data.penghasilan || '-' },
                    { label: 'Kewarganegaraan', value: data.kewarganegaraan },
                    { label: 'Negara Asal', value: data.negaraAsal || '-' },
                    { label: 'No. Paspor', value: data.noPaspor || '-' },
                    { label: 'No. Kitas Kitap', value: data.noKitasKitap || '-' },
                    { label: 'Tgl Masuk (WNA)', value: data.tanggalMasuk ? formatTanggal(data.tanggalMasuk) : '-' },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Keluarga */}
          <TabsContent value="keluarga">
            <Card className="rounded-xl">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Data Keluarga
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Nama Ayah', value: data.namaAyah || '-' },
                    { label: 'NIK Ayah', value: data.nikAyah ? <span className="font-mono">{data.nikAyah}</span> : '-' },
                    { label: 'Nama Ibu', value: data.namaIbu || '-' },
                    { label: 'NIK Ibu', value: data.nikIbu ? <span className="font-mono">{data.nikIbu}</span> : '-' },
                    { label: 'Anak Ke-', value: data.anakKe ? String(data.anakKe) : '-' },
                    { label: 'Jumlah Saudara', value: data.jumlahSaudara ? String(data.jumlahSaudara) : '-' },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Perkawinan */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-emerald-600" />
                    Data Perkawinan
                  </h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Status', value: statusPerkawinanLabels[data.statusPerkawinan] || data.statusPerkawinan },
                      { label: 'Akta Nikah', value: data.aktaPerkawinan || '-' },
                      { label: 'Tgl Perkawinan', value: data.tanggalPerkawinan ? formatTanggal(data.tanggalPerkawinan) : '-' },
                      { label: 'Akta Perceraian', value: data.aktaPerceraian || '-' },
                      { label: 'Tgl Perceraian', value: data.tanggalPerceraian ? formatTanggal(data.tanggalPerceraian) : '-' },
                      { label: 'Pasangan', value: data.pasangan ? `${data.pasangan.namaLengkap}${data.pasangan.nik ? ` (${data.pasangan.nik})` : ''}` : '-' },
                    ].map((item, i) => (
                      <div key={i}>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-sm font-medium text-foreground">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Dokumen */}
          <TabsContent value="dokumen">
            <Card className="rounded-xl">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Dokumen & Identitas
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Status KTP', value: statusKTPLabels[data.statusKTP || ''] || data.statusKTP || '-', highlight: data.statusKTP === 'SUDAH_BUAT' },
                    { label: 'No. Akta Kelahiran', value: data.noAktaKelahiran || '-' },
                    { label: 'No. BPJS Kesehatan', value: data.noBPJSKesehatan ? <span className="font-mono">{data.noBPJSKesehatan}</span> : '-' },
                    { label: 'No. BPJS TK', value: data.noBPJSTenagakerja ? <span className="font-mono">{data.noBPJSTenagakerja}</span> : '-' },
                    { label: 'NPWP', value: data.npwp ? <span className="font-mono">{data.npwp}</span> : '-' },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={cn('text-sm font-medium', item.highlight ? 'text-emerald-600' : 'text-foreground')}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Kesehatan */}
          <TabsContent value="kesehatan">
            <Card className="rounded-xl">
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-emerald-600" />
                  Data Kesehatan
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Jenis Disabilitas', value: disabilitasLabels[data.jenisDisabilitas || ''] || data.jenisDisabilitas || '-' },
                    { label: 'Keterangan Disabilitas', value: data.keteranganDisabilitas || '-' },
                    { label: 'Penyakit Kronis', value: data.penyakitKronis || '-' },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Riwayat */}
          <TabsContent value="riwayat">
            <AuditLogTimeline
              pendudukId={data.id}
              title="Riwayat Perubahan Data"
              maxHeight="600px"
              showFilters={true}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Penduduk</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{data.namaLengkap}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <span className="w-4 h-4 animate-spin mr-2 border-2 border-t-transparent border-white rounded-full" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mutasi KK Dialog */}
      {mutasiKKAsal && (
        <MutasiKKDialog
          open={mutasiDialogOpen}
          onOpenChange={setMutasiDialogOpen}
          kkAsal={mutasiKKAsal}
          onSuccess={() => {
            setMutasiDialogOpen(false);
            onBack();
          }}
        />
      )}
    </div>
  );
}
