'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Home,
  Users,
  MapPin,
  FileText,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Eye,
  Pencil,
  Printer,
  UserPlus,
  RefreshCw,
  User,
  UserCog,
  ArrowRightLeft,
  AlertTriangle,
  Briefcase,
  GraduationCap,
  Star,
  Clock,
  LayoutGrid,
  Table2,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { AuditLogTimeline } from '@/components/kependudukan/audit-log-timeline';
import { MutasiKKDialog } from '@/components/kependudukan/mutasi-kk-dialog';

interface AnggotaKeluarga {
  id: string;
  nik: string;
  namaLengkap: string;
  jenisKelamin: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string | null;
  pendidikan: string | null;
  hubunganKeluarga: string | null;
  golonganDarah: string | null;
  kewarganegaraan: string;
  noHP: string | null;
  email: string | null;
  foto: string | null;
}

interface KKDetail {
  id: string;
  nomorKK: string;
  tanggalTerbit: string | null;
  jenisTempatTinggal: string;
  alamat: string;
  rt: string;
  rw: string;
  dusun: string;
  rtId: string | null;
  dusunId: string | null;
  latitude: string | null;
  longitude: string | null;
  scanKK: string | null;
  fotoRumah: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  anggota: AnggotaKeluarga[];
}

interface DetailKKProps {
  kkId: string;
  onBack: () => void;
  onEdit: (kk: KKDetail) => void;
  onDelete: (kk: KKDetail) => void;
  onAddAnggota: (kk: KKDetail) => void;
  onEditAnggota: (penduduk: AnggotaKeluarga, kk: KKDetail) => void;
  onViewAnggota: (penduduk: AnggotaKeluarga) => void;
}

const jenisTempatTinggalLabels: Record<string, string> = {
  MILIK_SENDIRI: 'Milik Sendiri',
  KONTRAK: 'Kontrak',
  SEWA: 'Sewa',
  RUMAH_ORANGTUA: 'Rumah Orang Tua',
  RUMAH_SAUDARA: 'Rumah Saudara',
  RUMAH_DINAS: 'Rumah Dinas',
  LAINNYA: 'Lainnya',
};

// Values that identify the Kepala Keluarga (handles both old label and new enum)
const isKepalaKK = (hubungan: string) => hubungan === 'KEPALA_KELUARGA';

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

const statusPerkawinanLabels: Record<string, string> = {
  BELUM_KAWIN: 'Belum Kawin',
  KAWIN_TERCATAT: 'Kawin Tercatat',
  KAWIN_TIDAK_TERCATAT: 'Kawin Tidak Tercatat',
  CERAI_HIDUP_TERCATAT: 'Cerai Hidup Tercatat',
  CERAI_HIDUP_TIDAK_TERCATAT: 'Cerai Hidup Tidak Tercatat',
  CERAI_MATI: 'Cerai Mati',
};

export function DetailKK({ kkId, onBack, onEdit, onDelete, onAddAnggota, onEditAnggota, onViewAnggota }: DetailKKProps) {
  const [loading, setLoading] = useState(true);
  const [kkData, setKkData] = useState<KKDetail | null>(null);
  const [activeTab, setActiveTab] = useState('anggota');
  const [anggotaViewMode, setAnggotaViewMode] = useState<'table' | 'grid'>('grid');

  // State ganti kepala KK
  const [showGantiKepala, setShowGantiKepala] = useState(false);
  const [gantiKepalaBaruId, setGantiKepalaBaruId] = useState('');
  const [gantiHubunganLama, setGantiHubunganLama] = useState('');
  const [gantiCatatan, setGantiCatatan] = useState('');
  const [submittingGanti, setSubmittingGanti] = useState(false);

  // State mutasi KK dialog
  const [mutasiDialogOpen, setMutasiDialogOpen] = useState(false);

  const [wilayahOptions, setWilayahOptions] = useState<Array<{ id: string; label: string; dusunId: string }>>([]);

  // State delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fix #1: fetchKKDetail wrapped in useCallback
  const fetchKKDetail = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/kependudukan/kk/${kkId}`);
      const data = await response.json();
      if (data.success) {
        setKkData(data.data);
      } else {
        toast.error('Gagal mengambil detail KK');
      }
    } catch (error) {
      console.error('Error fetching KK detail:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [kkId]);

  // Fix #8: fetchWilayah lazy-loaded only when needed
  const fetchWilayah = useCallback(async () => {
    try {
      const response = await fetch('/api/wilayah');
      const data = await response.json();
      if (data.success) {
        const combined: Array<{ id: string; label: string; dusunId: string }> = [];
        data.data.dusun.forEach((dusun: any) => {
          dusun.rwList.forEach((rw: any) => {
            rw.rtList.forEach((rt: any) => {
              combined.push({
                id: rt.id,
                label: `${dusun.nama} - RW ${rw.nomor} - RT ${rt.nomor}`,
                dusunId: dusun.id,
              });
            });
          });
        });
        combined.sort((a, b) => a.label.localeCompare(b.label));
        setWilayahOptions(combined);
      }
    } catch (error) {
      console.error('Error fetching wilayah:', error);
    }
  }, []);

  // Fix #1: useEffect only depends on fetchKKDetail
  useEffect(() => {
    fetchKKDetail();
  }, [fetchKKDetail]);

  const handlePrint = () => {
    if (!kkData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup diblokir. Mohon izinkan popup untuk mencetak.');
      return;
    }

    const kepalaKeluarga = getKepalaKeluarga();

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kartu Keluarga - ${kkData.nomorKK}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; }
          .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 10px; margin-bottom: 20px; }
          .info-label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f0f0f0; }
          .footer { margin-top: 30px; text-align: right; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>KARTU KELUARGA</h1>
          <p>Alamat: ${kkData.alamat}</p>
          <p>RT ${kkData.rt} / RW ${kkData.rw}, Dusun ${kkData.dusun}</p>
        </div>
        
        <div class="info-grid">
          <div class="info-label">Nomor KK:</div>
          <div>${kkData.nomorKK}</div>
          <div class="info-label">Kepala Keluarga:</div>
          <div>${kepalaKeluarga?.namaLengkap || '-'}</div>
          <div class="info-label">NIK:</div>
          <div>${kepalaKeluarga?.nik || '-'}</div>
          <div class="info-label">Alamat:</div>
          <div>${kkData.alamat}</div>
          <div class="info-label">RT/RW:</div>
          <div>RT ${kkData.rt} / RW ${kkData.rw}</div>
          <div class="info-label">Dusun:</div>
          <div>${kkData.dusun}</div>
        </div>
        
        <h3>Daftar Anggota Keluarga</h3>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>NIK</th>
              <th>Nama Lengkap</th>
              <th>Jenis Kelamin</th>
              <th>Tempat/Tgl Lahir</th>
              <th>Hubungan</th>
              <th>Agama</th>
            </tr>
          </thead>
          <tbody>
            ${kkData.anggota?.map((a, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${a.nik}</td>
                <td>${a.namaLengkap}</td>
                <td>${a.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P'}</td>
                <td>${a.tempatLahir || '-'}, ${a.tanggalLahir ? new Date(a.tanggalLahir).toLocaleDateString('id-ID') : '-'}</td>
                <td>${a.hubunganKeluarga ? hubunganKeluargaLabels[a.hubunganKeluarga] || a.hubunganKeluarga : '-'}</td>
                <td>${agamaLabels[a.agama] || a.agama}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const getKepalaKeluarga = () => {
    return kkData?.anggota.find(a => isKepalaKK(a.hubunganKeluarga || ''));
  };

  const formatTanggal = (tanggal: string | null) => {
    if (!tanggal) return '-';
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        {/* Left sidebar skeleton */}
        <div className="w-[340px] flex-shrink-0 border-r bg-card p-5 space-y-4">
          <div className="flex items-center gap-1">
            <Skeleton className="h-4 w-14 rounded" />
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-3 w-3 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <Skeleton className="h-[120px] w-full rounded-xl" />
          <Skeleton className="h-[180px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
          {/* Fix #5: 6 button skeletons to match actual sidebar */}
          <div className="space-y-2 pt-2">
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
        {/* Right content skeleton */}
        <div className="flex-1 min-w-0 p-6 space-y-6">
          <div className="space-y-1">
            <Skeleton className="h-10 w-[400px] rounded-lg" />
            <Skeleton className="h-[300px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ==================== EMPTY STATE ====================
  if (!kkData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Home className="w-10 h-10 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Data KK Tidak Ditemukan</h3>
            <p className="text-sm text-muted-foreground">Kartu Keluarga yang Anda cari tidak tersedia atau telah dihapus.</p>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Daftar KK
          </Button>
        </div>
      </div>
    );
  }

  // ==================== DIALOG FUNCTIONS ====================
  const resetGantiKepala = () => {
    setGantiKepalaBaruId('');
    setGantiHubunganLama('');
    setGantiCatatan('');
  };

  const handleOpenGantiKepala = () => {
    if (!kkData) return;
    const kepala = getKepalaKeluarga();
    if (!kepala) {
      toast.error('Tidak ada kepala keluarga dalam KK ini');
      return;
    }
    const anggotaLain = kkData.anggota.filter(a => !isKepalaKK(a.hubunganKeluarga || ''));
    if (anggotaLain.length === 0) {
      toast.error('Tidak ada anggota yang bisa dipromosikan menjadi kepala');
      return;
    }
    resetGantiKepala();
    setShowGantiKepala(true);
  };

  const handleSubmitGantiKepala = async () => {
    if (!kkData) return;
    if (!gantiKepalaBaruId) {
      toast.error('Pilih anggota yang akan menjadi kepala keluarga baru');
      return;
    }
    if (!gantiHubunganLama) {
      toast.error('Pilih hubungan keluarga untuk kepala keluarga lama');
      return;
    }

    setSubmittingGanti(true);
    try {
      const res = await fetch(`/api/kependudukan/kk/${kkData.id}/ganti-kepala`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kepalaBaruId: gantiKepalaBaruId,
          hubunganKepalaLama: gantiHubunganLama,
          catatan: gantiCatatan,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Kepala keluarga berhasil diganti', {
          description: `${data.data.kepalaLama.namaLengkap} → ${data.data.kepalaBaru.namaLengkap}`,
        });
        setShowGantiKepala(false);
        fetchKKDetail();
      } else {
        toast.error(data.error || 'Gagal mengganti kepala keluarga');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmittingGanti(false);
    }
  };

  const kepalaKeluarga = getKepalaKeluarga();

  // Computed stats
  const totalAnggota = kkData.anggota.length;
  const totalLaki = kkData.anggota.filter(a => a.jenisKelamin === 'LAKI_LAKI').length;
  const totalPerempuan = kkData.anggota.filter(a => a.jenisKelamin === 'PEREMPUAN').length;
  const totalKawin = kkData.anggota.filter(a => a.statusPerkawinan === 'KAWIN_TERCATAT' || a.statusPerkawinan === 'KAWIN_TIDAK_TERCATAT').length;

  // ==================== MAIN LAYOUT ====================
  return (
    <div className="min-h-screen bg-background flex">

      {/* ========== LEFT SIDEBAR ========== */}
      <aside className="w-[340px] flex-shrink-0 border-r bg-card sticky top-0 h-screen overflow-y-auto">
        <div className="p-5 space-y-4">

          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-0.5 flex-wrap -ml-1">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted/50"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Beranda</span>
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
            <button
              onClick={onBack}
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted/50"
            >
              <span>Kependudukan</span>
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
            <button
              onClick={onBack}
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded hover:bg-muted/50"
            >
              <span>Data KK</span>
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
            <span className="inline-flex items-center text-xs font-medium text-foreground px-1.5 py-1 truncate max-w-[140px]" title={`Detail KK ${kkData.nomorKK}`}>
              {kkData.nomorKK ? (
                <span className="font-mono truncate">{kkData.nomorKK}</span>
              ) : (
                'Detail KK'
              )}
            </span>
          </nav>

          {/* 1. KK Card (Data & Alamat digabung) */}
          <Card className="rounded-xl">
            <CardContent className="p-4 space-y-3">
              {/* Header: Nomor KK + Status */}
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-foreground">Kartu Keluarga</span>
              </div>
              <p className="font-mono text-sm font-medium text-foreground leading-tight tracking-tight">
                {kkData.nomorKK}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge className={cn(
                  'text-xs',
                  kkData.isActive
                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200'
                )}>
                  <span className={cn(
                    'w-1.5 h-1.5 rounded-full mr-1.5 inline-block',
                    kkData.isActive ? 'bg-emerald-500' : 'bg-gray-400'
                  )} />
                  {kkData.isActive ? 'Aktif' : 'Nonaktif'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {jenisTempatTinggalLabels[kkData.jenisTempatTinggal] || kkData.jenisTempatTinggal}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Terbit: {formatTanggal(kkData.tanggalTerbit)}
              </p>

              {/* Divider */}
              <div className="border-t" />

              {/* Alamat & Wilayah */}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground">{kkData.alamat}</span>
              </div>
              <div className="space-y-1.5 pl-6">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Dusun</span>
                  <span className="text-foreground font-medium">{kkData.dusun}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">RT/RW</span>
                  <span className="text-foreground font-medium">{kkData.rt} / {kkData.rw}</span>
                </div>
                {kkData.latitude && kkData.longitude && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Koordinat</span>
                    <span className="font-mono text-foreground text-[11px]">{kkData.latitude}, {kkData.longitude}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 2. Kepala Keluarga Profile */}
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-start gap-3.5">
                {/* Photo */}
                <div className="relative flex-shrink-0">
                  <div className="w-[72px] h-[72px] rounded-xl bg-muted flex items-center justify-center overflow-hidden border">
                    {kepalaKeluarga?.foto ? (
                      <img
                        src={kepalaKeluarga.foto}
                        alt={kepalaKeluarga.namaLengkap}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center",
                    kkData.isActive ? "bg-emerald-500" : "bg-gray-400"
                  )}>
                    {kkData.isActive && (
                      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-foreground truncate leading-tight">
                    {kepalaKeluarga?.namaLengkap || 'Belum ada data'}
                  </h3>
                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs mt-1">
                    <Star className="w-3 h-3 mr-0.5 fill-amber-500 text-amber-500" />
                    Kepala Keluarga
                  </Badge>
                  {kepalaKeluarga?.nik && (
                    <p className="text-xs font-mono text-muted-foreground mt-1.5 truncate" title={kepalaKeluarga.nik}>
                      NIK: {kepalaKeluarga.nik}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {kepalaKeluarga?.pekerjaan && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">{kepalaKeluarga.pekerjaan}</span>
                      </span>
                    )}
                    {kepalaKeluarga?.pendidikan && (
                      <span className="inline-flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" />
                        <span className="truncate max-w-[80px]">{kepalaKeluarga.pendidikan}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Tombol Aksi */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={() => onAddAnggota(kkData)}
              className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Tambah Anggota
            </Button>
            <Button
              variant="outline"
              onClick={() => onEdit(kkData)}
              className="w-full justify-start"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Data KK
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="w-full justify-start"
            >
              <Printer className="w-4 h-4 mr-2" />
              Cetak KK
            </Button>
            <Button
              variant="outline"
              onClick={handleOpenGantiKepala}
              className="w-full justify-start"
            >
              <UserCog className="w-4 h-4 mr-2" />
              Ganti Kepala KK
            </Button>
            {/* Fix #8: Lazy-load wilayah when mutasi opens */}
            <Button
              variant="outline"
              onClick={async () => {
                if (wilayahOptions.length === 0) {
                  await fetchWilayah();
                }
                setMutasiDialogOpen(true);
              }}
              className="w-full justify-start"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Mutasi KK
            </Button>
            {/* Fix #9: Confirmation dialog before delete */}
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Hapus KK
            </Button>
          </div>

          {/* Fix #10: Timestamps removed from sidebar */}
        </div>
      </aside>

      {/* ========== RIGHT CONTENT PANEL ========== */}
      <main className="flex-1 min-w-0 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="informasi" className="gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Informasi
            </TabsTrigger>
            <TabsTrigger value="anggota" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Anggota Keluarga
            </TabsTrigger>
            <TabsTrigger value="dokumen" className="gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Dokumen
            </TabsTrigger>
            <TabsTrigger value="riwayat" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Riwayat
            </TabsTrigger>
          </TabsList>

          {/* ===== Tab 1: Informasi KK — Fix #3: Non-redundant ===== */}
          <TabsContent value="informasi" className="space-y-6">
            {/* Statistik Keluarga */}
            <Card className="rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Statistik Keluarga</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center p-4 bg-muted rounded-xl">
                    <p className="text-2xl font-bold text-foreground">{totalAnggota}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Anggota</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100 dark:border-blue-900">
                    <p className="text-2xl font-bold text-blue-600">{totalLaki}</p>
                    <p className="text-xs text-muted-foreground mt-1">Laki-laki</p>
                  </div>
                  <div className="text-center p-4 bg-pink-50 rounded-xl border border-pink-100 dark:border-pink-900">
                    <p className="text-2xl font-bold text-pink-600">{totalPerempuan}</p>
                    <p className="text-xs text-muted-foreground mt-1">Perempuan</p>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100 dark:border-amber-900">
                    <p className="text-2xl font-bold text-amber-600">{totalKawin}</p>
                    <p className="text-xs text-muted-foreground mt-1">Kawin</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Komposisi Anggota per Hubungan Keluarga */}
            <Card className="rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-foreground">Komposisi Anggota</h3>
                </div>
                <div className="space-y-2.5">
                  {Object.entries(
                    kkData.anggota.reduce((acc, a) => {
                      const hub = a.hubunganKeluarga || 'LAINNYA';
                      acc[hub] = (acc[hub] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort((a, b) => b[1] - a[1]).map(([hub, count]) => (
                    <div key={hub} className="flex items-center justify-between py-2 border-b border-border/50 last:border-b-0">
                      <span className="text-sm text-foreground">{hubunganKeluargaLabels[hub] || hub}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${(count / totalAnggota) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-foreground w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== Tab 2: Anggota Keluarga (PRIMARY) ===== */}
          <TabsContent value="anggota">
            {/* Fix #4: Top bar — only view toggle, no duplicate buttons */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {totalAnggota} Anggota Keluarga
                </span>
                {totalLaki > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">{totalLaki}L</Badge>
                )}
                {totalPerempuan > 0 && (
                  <Badge className="bg-pink-100 text-pink-700 border-pink-200 text-xs">{totalPerempuan}P</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex items-center border rounded-lg overflow-hidden">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAnggotaViewMode('table')}
                    className={cn(
                      'h-8 w-8 p-0 rounded-none rounded-l-lg',
                      anggotaViewMode === 'table'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Tampilan Tabel"
                  >
                    <Table2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAnggotaViewMode('grid')}
                    className={cn(
                      'h-8 w-8 p-0 rounded-none rounded-r-lg',
                      anggotaViewMode === 'grid'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                    title="Tampilan Grid"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Empty state */}
            {kkData.anggota.length === 0 ? (
              <div className="rounded-xl border bg-card p-12 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-3">
                  <Users className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">Belum Ada Anggota</h3>
                <p className="text-sm text-muted-foreground mb-4">Belum ada anggota keluarga terdaftar dalam KK ini.</p>
                <Button
                  onClick={() => onAddAnggota(kkData)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Tambah Anggota Pertama
                </Button>
              </div>
            ) : anggotaViewMode === 'table' ? (
              /* ===== TABLE VIEW ===== */
              <div className="rounded-xl border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-12">#</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Anggota</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">NIK</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">TTL</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Jenis Kelamin</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Agama</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Pekerjaan</th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status Kawin</th>
                        <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kkData.anggota.map((anggota, index) => {
                        const isKepala = isKepalaKK(anggota.hubunganKeluarga || '');
                        return (
                          <motion.tr
                            key={anggota.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className={cn(
                              'border-b last:border-b-0 hover:bg-muted/30 transition-colors',
                              isKepala && 'bg-emerald-50/30 hover:bg-emerald-50/50'
                            )}
                          >
                            <td className="px-4 py-3 text-xs text-muted-foreground">{index + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border">
                                  {anggota.foto ? (
                                    <img src={anggota.foto} alt={anggota.namaLengkap} className="w-full h-full object-cover" />
                                  ) : (
                                    <User className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{anggota.namaLengkap}</p>
                                    {isKepala && (
                                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 flex-shrink-0">
                                        <Star className="w-2.5 h-2.5 mr-0.5 fill-amber-500 text-amber-500" />
                                        Kepala
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {anggota.hubunganKeluarga ? hubunganKeluargaLabels[anggota.hubunganKeluarga] || anggota.hubunganKeluarga : '-'}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono text-muted-foreground">{anggota.nik}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">
                                {anggota.tempatLahir || '-'}, {formatTanggal(anggota.tanggalLahir)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={cn(
                                'text-xs w-5 h-5 justify-center p-0 border-0',
                                anggota.jenisKelamin === 'LAKI_LAKI'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-pink-100 text-pink-700'
                              )}>
                                {anggota.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">
                                {agamaLabels[anggota.agama] || anggota.agama}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">
                                {anggota.pekerjaan || '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">
                                {statusPerkawinanLabels[anggota.statusPerkawinan] || anggota.statusPerkawinan}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onViewAnggota(anggota)}
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Detail
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditAnggota(anggota, kkData)}
                                  className="h-7 px-2 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50"
                                >
                                  <Pencil className="w-3 h-3 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* ===== GRID CARD VIEW ===== */
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {kkData.anggota.map((anggota, index) => {
                  const isKepala = isKepalaKK(anggota.hubunganKeluarga || '');
                  return (
                    <motion.div
                      key={anggota.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        'rounded-xl border bg-card hover:shadow-md transition-all group',
                        isKepala && 'border-emerald-200 bg-emerald-50/30'
                      )}
                    >
                      {/* Card header with photo */}
                      <div className="relative p-4 pb-3">
                        <div className="flex items-start gap-3.5">
                          {/* Photo */}
                          <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border-2 group-hover:border-emerald-300 transition-colors">
                            {anggota.foto ? (
                              <img src={anggota.foto} alt={anggota.namaLengkap} className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          {/* Name + badges */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-sm text-foreground truncate leading-tight">
                                {anggota.namaLengkap}
                              </h4>
                              <Badge className={cn(
                                'text-xs font-normal flex-shrink-0',
                                isKepala
                                  ? 'bg-amber-100 text-amber-700 border-amber-200'
                                  : anggota.jenisKelamin === 'LAKI_LAKI'
                                    ? 'bg-blue-100 text-blue-700 border-blue-200'
                                    : 'bg-pink-100 text-pink-700 border-pink-200'
                              )}>
                                {isKepala ? (
                                  <><Star className="w-3 h-3 mr-0.5 fill-amber-500 text-amber-500" />Kepala</>
                                ) : (
                                  hubunganKeluargaLabels[anggota.hubunganKeluarga || ''] || anggota.hubunganKeluarga || '-'
                                )}
                              </Badge>
                            </div>
                            <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{anggota.nik}</p>
                          </div>
                        </div>
                      </div>

                      {/* Card body - details */}
                      <div className="px-4 pb-3 space-y-2">
                        {/* Fix #7: Calendar icon for TTL */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{anggota.tempatLahir || '-'}, {formatTanggal(anggota.tanggalLahir)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {anggota.pekerjaan && (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              <Briefcase className="w-2.5 h-2.5" />
                              {anggota.pekerjaan}
                            </span>
                          )}
                          {anggota.pendidikan && (
                            <span className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                              <GraduationCap className="w-2.5 h-2.5" />
                              {anggota.pendidikan}
                            </span>
                          )}
                          <span className="inline-flex items-center text-[11px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {agamaLabels[anggota.agama] || anggota.agama}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{statusPerkawinanLabels[anggota.statusPerkawinan] || anggota.statusPerkawinan}</span>
                          <span className="text-border">&middot;</span>
                          <span>{anggota.kewarganegaraan}</span>
                        </div>
                      </div>

                      {/* Card footer - actions */}
                      <div className="flex items-center gap-1 px-4 py-2.5 border-t border-border/50">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewAnggota(anggota)}
                          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-blue-600 hover:bg-blue-50 flex-1"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Detail
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditAnggota(anggota, kkData)}
                          className="h-7 px-2.5 text-xs text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 flex-1"
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ===== Tab 3: Dokumen ===== */}
          <TabsContent value="dokumen">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Scan KK */}
              <Card className="rounded-xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-foreground">Scan/Foto KK</h3>
                  </div>
                  {kkData.scanKK ? (
                    <div className="relative rounded-lg overflow-hidden border">
                      <img
                        src={kkData.scanKK}
                        alt="Scan KK"
                        className="w-full h-56 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-56 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-10 h-10 mb-2" />
                      <p className="text-sm">Belum ada foto/scan KK</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Foto Rumah */}
              <Card className="rounded-xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Home className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-foreground">Foto Rumah</h3>
                  </div>
                  {kkData.fotoRumah ? (
                    <div className="relative rounded-lg overflow-hidden border">
                      <img
                        src={kkData.fotoRumah}
                        alt="Foto Rumah"
                        className="w-full h-56 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-56 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-10 h-10 mb-2" />
                      <p className="text-sm">Belum ada foto rumah</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== Tab 4: Riwayat ===== */}
          <TabsContent value="riwayat">
            <AuditLogTimeline
              kkId={kkData.id}
              title="Riwayat Perubahan Data KK"
              maxHeight="max-h-[calc(100vh-280px)]"
              showFilters={true}
            />
          </TabsContent>

        </Tabs>
      </main>

      {/* ========== DIALOGS ========== */}

      {/* Fix #6: Dialog Ganti Kepala Keluarga — dark mode compatible */}
      <Dialog open={showGantiKepala} onOpenChange={(open) => {
        if (!open) resetGantiKepala();
        setShowGantiKepala(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-emerald-600" />
              Ganti Kepala Keluarga
            </DialogTitle>
            <DialogDescription>
              Koreksi data kepala keluarga. Kepala lama akan tetap menjadi anggota KK.
            </DialogDescription>
          </DialogHeader>

          {kkData && kepalaKeluarga && (
            <div className="space-y-5">
              {/* Info Kepala Saat Ini */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">Kepala Keluarga Saat Ini</p>
                <p className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                  {kepalaKeluarga.namaLengkap}
                  <span className="font-mono text-sm font-normal text-amber-600 dark:text-amber-400">{kepalaKeluarga.nik}</span>
                </p>
              </div>

              {/* Pilih Kepala Baru */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Pilih Kepala Baru <span className="text-red-500">*</span>
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {kkData.anggota
                    .filter(a => !isKepalaKK(a.hubunganKeluarga || ''))
                    .map(anggota => (
                      <label
                        key={anggota.id}
                        className={cn(
                          'flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all',
                          gantiKepalaBaruId === anggota.id
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                            : 'border-border hover:border-emerald-300 hover:bg-muted/50'
                        )}
                      >
                        <input
                          type="radio"
                          name="kepala-baru"
                          value={anggota.id}
                          checked={gantiKepalaBaruId === anggota.id}
                          onChange={() => setGantiKepalaBaruId(anggota.id)}
                          className="accent-emerald-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{anggota.namaLengkap}</p>
                          <p className="text-xs text-muted-foreground">
                            {anggota.nik || 'Belum ada NIK'}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {anggota.hubunganKeluarga ? hubunganKeluargaLabels[anggota.hubunganKeluarga] || anggota.hubunganKeluarga : '-'}
                        </Badge>
                      </label>
                    ))}
                </div>
              </div>

              {/* Hubungan Kepala Lama */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Hubungan {kepalaKeluarga.namaLengkap} setelah diganti <span className="text-red-500">*</span>
                </label>
                <Select
                  value={gantiHubunganLama}
                  onValueChange={setGantiHubunganLama}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih hubungan keluarga" />
                  </SelectTrigger>
                  <SelectContent>
                    {['SUAMI', 'ISTRI', 'ANAK', 'ANAK_TIRI', 'ANAK_ANGKAT', 'ORANG_TUA', 'MENANTU', 'MERTUA', 'CUCU', 'FAMILI_LAIN', 'PEMBANTU', 'LAINNYA'].map(hub => (
                      <SelectItem key={hub} value={hub}>
                        {hubunganKeluargaLabels[hub] || hub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Catatan */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Catatan <span className="text-muted-foreground text-xs font-normal">(opsional)</span>
                </label>
                <textarea
                  value={gantiCatatan}
                  onChange={e => setGantiCatatan(e.target.value)}
                  placeholder="Alasan koreksi data..."
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Peringatan */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  <strong>{kepalaKeluarga.namaLengkap}</strong> akan diubah menjadi anggota biasa.
                  Data ini akan dicatat di riwayat perubahan.
                </p>
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { resetGantiKepala(); setShowGantiKepala(false); }}
                  disabled={submittingGanti}
                >
                  Batal
                </Button>
                <Button
                  onClick={handleSubmitGantiKepala}
                  disabled={submittingGanti || !gantiKepalaBaruId || !gantiHubunganLama}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submittingGanti ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <UserCog className="w-4 h-4 mr-2" />
                  )}
                  {submittingGanti ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fix #9: Dialog Konfirmasi Hapus KK */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Hapus Kartu Keluarga
            </DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Semua data anggota keluarga dalam KK ini juga akan terpengaruh.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              Nomor KK: <span className="font-mono">{kkData?.nomorKK}</span>
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Kepala Keluarga: {kepalaKeluarga?.namaLengkap || '-'}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Batal
            </Button>
            <Button
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete(kkData);
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Ya, Hapus KK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mutasi KK Dialog */}
      <MutasiKKDialog
        open={mutasiDialogOpen}
        onOpenChange={setMutasiDialogOpen}
        kkAsal={kkData ? {
          id: kkData.id,
          nomorKK: kkData.nomorKK || null,
          kepalaKeluarga: kkData.anggota.find(a => isKepalaKK(a.hubunganKeluarga || ''))?.namaLengkap || '-',
          alamat: kkData.alamat || '',
          anggota: kkData.anggota.map(a => ({
            id: a.id,
            namaLengkap: a.namaLengkap,
            nik: a.nik || null,
            hubunganKeluarga: a.hubunganKeluarga,
            jenisKelamin: a.jenisKelamin,
            foto: a.foto,
          })),
        } : null}
        onSuccess={() => {
          setMutasiDialogOpen(false);
          fetchKKDetail();
        }}
        wilayahOptions={wilayahOptions}
      />
    </div>
  );
}
