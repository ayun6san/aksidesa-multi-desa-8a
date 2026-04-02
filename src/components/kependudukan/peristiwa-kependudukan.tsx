'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  RefreshCw,
  Eye,
  Baby,
  HeartCrack,
  ArrowRightLeft,
  Heart,
  Scale,
  ChevronLeft,
  CheckCircle,
  Calendar,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/loading-skeleton';
import PerkawinanForm from '@/components/kependudukan/perkawinan-form';
import PerceraianForm from '@/components/kependudukan/perceraian-form';
import PindahKeluarForm from '@/components/kependudukan/pindah-keluar-form';
import KematianForm from '@/components/kependudukan/kematian-form';
import PindahMasukForm from '@/components/kependudukan/pindah-masuk-form';
import { PendudukSearchResult } from '@/components/kependudukan/nik-search';
import KelahiranForm from '@/components/kependudukan/kelahiran-form';

// ============================================================
// Types & Constants
// ============================================================

interface Peristiwa {
  id: string;
  jenisPeristiwa: string;
  pendudukId: string | null;
  penduduk: {
    id: string;
    nik: string;
    namaLengkap: string;
    jenisKelamin: string;
  } | null;
  kkId: string | null;
  kk: {
    id: string;
    nomorKK: string;
  } | null;
  tanggalPeristiwa: string | null;
  tempat: string | null;
  keterangan: string | null;
  alamatAsal: string | null;
  alamatTujuan: string | null;
  penyebabKematian: string | null;
  namaBayi: string | null;
  jenisKelaminBayi: string | null;
  beratBayi: string | null;
  panjangBayi: string | null;
  isProcessed: boolean;
  createdAt: string;
}

interface PeristiwaStats {
  total: number;
  bulanIni: number;
  belumDiproses: number;
  perJenis: Record<string, number>;
}

interface KKOption {
  id: string;
  nomorKK: string;
  kepalaKeluarga: string;
  alamat: string;
}

interface WilayahOption {
  id: string;
  label: string;
  dusunId: string;
}

// Semua jenis peristiwa (untuk badge, filter, stats, tabel)
const jenisPeristiwaOptions = [
  { value: 'KELAHIRAN', label: 'Kelahiran', icon: Baby, color: 'bg-pink-100 text-pink-700', borderColor: 'border-pink-200 hover:border-pink-400 hover:bg-pink-50', description: 'Catat kelahiran bayi baru' },
  { value: 'KEMATIAN', label: 'Kematian', icon: HeartCrack, color: 'bg-gray-100 text-gray-700', borderColor: 'border-gray-200 hover:border-gray-400 hover:bg-gray-50', description: 'Catat kematian penduduk' },
  { value: 'PINDAH_MASUK', label: 'Pindah Masuk', icon: ArrowRightLeft, color: 'bg-teal-100 text-teal-700', borderColor: 'border-teal-200 hover:border-teal-400 hover:bg-teal-50', description: 'Catat pendatang baru' },
  { value: 'PINDAH_KELUAR', label: 'Pindah Keluar', icon: ArrowRightLeft, color: 'bg-amber-100 text-amber-700', borderColor: 'border-amber-200 hover:border-amber-400 hover:bg-amber-50', description: 'Catat penduduk pindah' },
  { value: 'PERKAWINAN', label: 'Perkawinan', icon: Heart, color: 'bg-rose-100 text-rose-700', borderColor: 'border-rose-200 hover:border-rose-400 hover:bg-rose-50', description: 'Catat pernikahan' },
  { value: 'PERCERAIAN', label: 'Perceraian', icon: Scale, color: 'bg-violet-100 text-violet-700', borderColor: 'border-violet-200 hover:border-violet-400 hover:bg-violet-50', description: 'Catat perceraian' },
  { value: 'MUTASI_KK', label: 'Mutasi KK', icon: Copy, color: 'bg-sky-100 text-sky-700', borderColor: 'border-sky-200 hover:border-sky-400 hover:bg-sky-50', description: 'Pindah/pecah anggota KK' },
];

// Hanya jenis yang bisa diinput dari halaman ini (MUTASI_KK via detail KK)
const inputPeristiwaOptions = jenisPeristiwaOptions.filter(j => j.value !== 'MUTASI_KK');

// Parse keterangan JSON untuk MUTASI_KK
function parseMutasiKeterangan(keterangan: string | null): string {
  if (!keterangan) return '-';
  try {
    const data = JSON.parse(keterangan);
    if (data.jenisMutasi === 'pindah-ke-kk') {
      const parts = [`Pindah ke KK ${data.kkTujuanNomor || '-'}`];
      if (data.hubunganBaru) parts.push(`Sebagai ${data.hubunganBaru.replace(/_/g, ' ')}`);
      if (data.catatan) parts.push(data.catatan);
      return parts.join(' · ');
    }
    if (data.jenisMutasi === 'pecah-kk') {
      const parts = [`Pecah KK → ${data.kkBaruNomor || '-'}`];
      if (data.catatan) parts.push(data.catatan);
      return parts.join(' · ');
    }
    return keterangan;
  } catch {
    return keterangan;
  }
}


type ViewMode = 'menu' | 'form';

// ============================================================
// Main Component
// ============================================================

export function PeristiwaKependudukan() {
  // View state
  const [view, setView] = useState<ViewMode>('menu');
  const [selectedJenis, setSelectedJenis] = useState<string | null>(null);

  // List & stats
  const [peristiwaList, setPeristiwaList] = useState<Peristiwa[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [stats, setStats] = useState<PeristiwaStats | null>(null);
  const [search, setSearch] = useState('');
  const [filterJenis, setFilterJenis] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Detail modal
  const [showDetail, setShowDetail] = useState(false);
  const [detailData, setDetailData] = useState<Peristiwa | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Options
  const [wilayahOptions, setWilayahOptions] = useState<WilayahOption[]>([]);
  const [kkOptions, setKKOptions] = useState<KKOption[]>([]);

  // ============================================================
  // Form States (kept for form submission)
  // ============================================================

  // Kelahiran
  const [kelahiranForm, setKelahiranForm] = useState({
    namaBayi: '',
    jenisKelamin: 'LAKI_LAKI',
    tanggalLahir: new Date().toISOString().split('T')[0],
    tempatLahir: '',
    agama: 'ISLAM',
    beratBayi: '',
    panjangBayi: '',
    kkId: '',
    namaAyah: '',
    nikAyah: '',
    namaIbu: '',
    nikIbu: '',
    keterangan: '',
    noAktaKelahiran: '',
  });
  const [selectedIbuKelahiran, setSelectedIbuKelahiran] = useState<PendudukSearchResult | null>(null);
  const handleSelectIbuKelahiran = (p: PendudukSearchResult) => setSelectedIbuKelahiran(p);
  const handleClearIbuKelahiran = () => {
    setSelectedIbuKelahiran(null);
    setKelahiranForm(prev => ({ ...prev, kkId: '', namaIbu: '', nikIbu: '', namaAyah: '', nikAyah: '' }));
  };

  // Kematian
  const [selectedPendudukKematian, setSelectedPendudukKematian] = useState<PendudukSearchResult | null>(null);
  const [kematianForm, setKematianForm] = useState({
    tempat: '', penyebabKematian: '', tanggalPeristiwa: new Date().toISOString().split('T')[0], keterangan: '',
  });
  const [isKepalaKK, setIsKepalaKK] = useState(false);
  const [anggotaKK, setAnggotaKK] = useState<{ id: string; namaLengkap: string; nik: string; hubunganKeluarga: string }[]>([]);
  const [gantiKepalaKeluargaId, setGantiKepalaKeluargaId] = useState('');
  const [hubunganKepalaLamaKematian, setHubunganKepalaLamaKematian] = useState('ORANG_TUA');
  const [adaPengganti, setAdaPengganti] = useState(true);
  const [loadingAnggota, setLoadingAnggota] = useState(false);

  const fetchAnggotaKK = useCallback(async (kkId: string, kepalaId: string) => {
    setLoadingAnggota(true);
    try {
      const res = await fetch(`/api/kependudukan/kk/${kkId}`);
      const data = await res.json();
      if (data.success && data.data?.anggota) {
        const anggotaLain = data.data.anggota
          .filter((a: any) => a.hubunganKeluarga !== 'KEPALA_KELUARGA' && a.id !== kepalaId)
          .map((a: any) => ({ id: a.id, namaLengkap: a.namaLengkap, nik: a.nik, hubunganKeluarga: a.hubunganKeluarga }));
        setAnggotaKK(anggotaLain);
        setAdaPengganti(anggotaLain.length > 0);
        if (anggotaLain.length === 0) setGantiKepalaKeluargaId('');
      }
    } catch { setAnggotaKK([]); } finally { setLoadingAnggota(false); }
  }, []);

  const handleSelectKematian = (p: PendudukSearchResult) => {
    setSelectedPendudukKematian(p);
    if (p.hubunganKeluarga === 'KEPALA_KELUARGA' && p.kkId) {
      setIsKepalaKK(true);
      fetchAnggotaKK(p.kkId, p.id);
    } else {
      setIsKepalaKK(false);
      setAnggotaKK([]);
      setGantiKepalaKeluargaId('');
    }
  };

  // Pindah Masuk
  const [pindahMasukForm, setPindahMasukForm] = useState({
    nik: '', namaLengkap: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: 'LAKI_LAKI',
    agama: 'ISLAM', pekerjaan: '', statusPerkawinan: 'BELUM_KAWIN',
    alamatAsal: '', kkId: '', hubunganKeluarga: '', keterangan: '',
  });
  const [selectedKKMasuk, setSelectedKKMasuk] = useState<PendudukSearchResult | null>(null);
  const handleSelectKKMasuk = (p: PendudukSearchResult) => { setSelectedKKMasuk(p); setPindahMasukForm(prev => ({ ...prev, kkId: p.kkId || '' })); };
  const handleClearKKMasuk = () => { setSelectedKKMasuk(null); setPindahMasukForm(prev => ({ ...prev, kkId: '' })); };

  // Pindah Keluar
  const [pindahTanggalPeristiwa, setPindahTanggalPeristiwa] = useState(new Date().toISOString().split('T')[0]);
  const [pindahAlamatTujuan, setPindahAlamatTujuan] = useState('');
  const [pindahKeterangan, setPindahKeterangan] = useState('');

  // Perkawinan
  const [selectedPendudukPerkawinan, setSelectedPendudukPerkawinan] = useState<PendudukSearchResult | null>(null);
  const [perkawinanForm, setPerkawinanForm] = useState({
    tanggalPerkawinan: new Date().toISOString().split('T')[0], tempat: '', aktaPerkawinan: '', keterangan: '',
  });
  const [selectedPendudukPasangan, setSelectedPendudukPasangan] = useState<PendudukSearchResult | null>(null);
  const [perkawinanOpsiKK, setPerkawinanOpsiKK] = useState<'TETAP_DI_KK_MASING2' | 'PINDAH_KE_KK_PENDUDUK' | 'BUAT_KK_BARU'>('TETAP_DI_KK_MASING2');
  const [perkawinanAlamatKKBaru, setPerkawinanAlamatKKBaru] = useState('');
  const [perkawinanSuccession, setPerkawinanSuccession] = useState({
    pendudukIsKepala: false, pendudukSisaAnggota: [] as { id: string; namaLengkap: string; nik: string; hubunganKeluarga: string }[], pendudukGantiKepalaId: '', pendudukAdaPengganti: true,
    pasanganIsKepala: false, pasanganSisaAnggota: [] as { id: string; namaLengkap: string; nik: string; hubunganKeluarga: string }[], pasanganGantiKepalaId: '', pasanganAdaPengganti: true,
  });
  const [perkawinanLoadingSuccession, setPerkawinanLoadingSuccession] = useState(false);

  const fetchPerkawinanSuccession = useCallback(async (kkId: string, excludeId: string, target: 'penduduk' | 'pasangan') => {
    setPerkawinanLoadingSuccession(true);
    try {
      const res = await fetch(`/api/kependudukan/kk/${kkId}`);
      const data = await res.json();
      if (data.success && data.data?.anggota) {
        const anggotaLain = data.data.anggota
          .filter((a: any) => a.hubunganKeluarga !== 'KEPALA_KELUARGA' && a.id !== excludeId && a.status !== 'MENINGGAL' && a.isActive !== false)
          .map((a: any) => ({ id: a.id, namaLengkap: a.namaLengkap, nik: a.nik, hubunganKeluarga: a.hubunganKeluarga }));
        if (target === 'penduduk') {
          setPerkawinanSuccession(prev => ({ ...prev, pendudukIsKepala: true, pendudukSisaAnggota: anggotaLain, pendudukGantiKepalaId: '', pendudukAdaPengganti: anggotaLain.length > 0 }));
        } else {
          setPerkawinanSuccession(prev => ({ ...prev, pasanganIsKepala: true, pasanganSisaAnggota: anggotaLain, pasanganGantiKepalaId: '', pasanganAdaPengganti: anggotaLain.length > 0 }));
        }
      }
    } catch { /* silently fail */ } finally { setPerkawinanLoadingSuccession(false); }
  }, []);

  // ============================================================
  // Data Fetching
  // ============================================================

  const fetchWilayah = useCallback(async (retries = 3) => {
    try {
      const response = await fetch('/api/wilayah');
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      if (data.success) {
        const combined: WilayahOption[] = [];
        data.data.dusun.forEach((dusun: any) => {
          dusun.rwList.forEach((rw: any) => {
            rw.rtList.forEach((rt: any) => {
              combined.push({ id: rt.id, label: `${dusun.nama} - RW ${rw.nomor} - RT ${rt.nomor}`, dusunId: dusun.id });
            });
          });
        });
        combined.sort((a, b) => a.label.localeCompare(b.label));
        setWilayahOptions(combined);
      }
    } catch (error) {
      if (retries > 0) setTimeout(() => fetchWilayah(retries - 1), 1000);
    }
  }, []);

  const fetchKK = useCallback(async (retries = 3) => {
    try {
      const response = await fetch('/api/kependudukan/kk?limit=1000');
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      if (data.success) {
        setKKOptions(data.data.filter((kk: any) => kk.isActive !== false).map((kk: any) => ({
          id: kk.id, nomorKK: kk.nomorKK, kepalaKeluarga: kk.kepalaKeluarga, alamat: kk.alamat,
        })));
      }
    } catch (error) {
      if (retries > 0) setTimeout(() => fetchKK(retries - 1), 1000);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/kependudukan/peristiwa/stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchPeristiwa = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterJenis) params.append('jenisPeristiwa', filterJenis);
      params.append('page', page.toString());
      params.append('limit', '10');
      const response = await fetch(`/api/kependudukan/peristiwa?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setPeristiwaList(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching Peristiwa:', error);
      toast.error('Gagal mengambil data Peristiwa');
    } finally {
      setLoading(false);
    }
  }, [search, filterJenis, page]);

  useEffect(() => {
    fetchWilayah();
    fetchKK();
    fetchStats();
  }, [fetchWilayah, fetchKK, fetchStats]);

  useEffect(() => {
    fetchPeristiwa();
  }, [fetchPeristiwa]);

  // Perkawinan succession evaluation
  useEffect(() => {
    if (!selectedPendudukPasangan || perkawinanOpsiKK === 'TETAP_DI_KK_MASING2') {
      setPerkawinanSuccession({
        pendudukIsKepala: false, pendudukSisaAnggota: [], pendudukGantiKepalaId: '', pendudukAdaPengganti: true,
        pasanganIsKepala: false, pasanganSisaAnggota: [], pasanganGantiKepalaId: '', pasanganAdaPengganti: true,
      });
      return;
    }
    const isPendudukKepala = selectedPendudukPerkawinan?.hubunganKeluarga === 'KEPALA_KELUARGA';
    const isPasanganKepala = selectedPendudukPasangan?.hubunganKeluarga === 'KEPALA_KELUARGA';
    const needsPendudukSuccession = perkawinanOpsiKK === 'BUAT_KK_BARU' && isPendudukKepala && selectedPendudukPerkawinan?.kkId;
    const needsPasanganSuccession = isPasanganKepala && selectedPendudukPasangan?.kkId;
    if (!needsPendudukSuccession && !needsPasanganSuccession) {
      setPerkawinanSuccession(prev => ({
        ...prev,
        pendudukIsKepala: false, pendudukSisaAnggota: [], pendudukGantiKepalaId: '', pendudukAdaPengganti: true,
        pasanganIsKepala: false, pasanganSisaAnggota: [], pasanganGantiKepalaId: '', pasanganAdaPengganti: true,
      }));
      return;
    }
    if (needsPendudukSuccession && selectedPendudukPerkawinan?.kkId && !perkawinanSuccession.pendudukIsKepala) {
      fetchPerkawinanSuccession(selectedPendudukPerkawinan.kkId, selectedPendudukPerkawinan.id, 'penduduk');
    }
    if (needsPasanganSuccession && selectedPendudukPasangan?.kkId && !perkawinanSuccession.pasanganIsKepala) {
      fetchPerkawinanSuccession(selectedPendudukPasangan.kkId, selectedPendudukPasangan.id, 'pasangan');
    }
  }, [selectedPendudukPerkawinan, selectedPendudukPasangan, perkawinanOpsiKK, fetchPerkawinanSuccession, perkawinanSuccession.pendudukIsKepala, perkawinanSuccession.pasanganIsKepala]);

  // ============================================================
  // Navigation & Reset
  // ============================================================

  const resetAllForms = () => {
    setSelectedJenis(null);
    setKelahiranForm({
      namaBayi: '', jenisKelamin: 'LAKI_LAKI', tanggalLahir: new Date().toISOString().split('T')[0],
      tempatLahir: '', agama: 'ISLAM', beratBayi: '', panjangBayi: '', kkId: '',
      namaAyah: '', nikAyah: '', namaIbu: '', nikIbu: '', keterangan: '', noAktaKelahiran: '',
    });
    setSelectedIbuKelahiran(null);
    setSelectedPendudukKematian(null);
    setKematianForm({ tempat: '', penyebabKematian: '', tanggalPeristiwa: new Date().toISOString().split('T')[0], keterangan: '' });
    setIsKepalaKK(false);
    setAnggotaKK([]);
    setGantiKepalaKeluargaId('');
    setHubunganKepalaLamaKematian('ORANG_TUA');
    setAdaPengganti(true);
    setLoadingAnggota(false);
    setPindahMasukForm({
      nik: '', namaLengkap: '', tempatLahir: '', tanggalLahir: '', jenisKelamin: 'LAKI_LAKI',
      agama: 'ISLAM', pekerjaan: '', statusPerkawinan: 'BELUM_KAWIN',
      alamatAsal: '', kkId: '', hubunganKeluarga: '', keterangan: '',
    });
    setSelectedKKMasuk(null);
    setPindahTanggalPeristiwa(new Date().toISOString().split('T')[0]);
    setPindahAlamatTujuan('');
    setPindahKeterangan('');
    setSelectedPendudukPerkawinan(null);
    setSelectedPendudukPasangan(null);
    setPerkawinanForm({ tanggalPerkawinan: new Date().toISOString().split('T')[0], tempat: '', aktaPerkawinan: '', keterangan: '' });
    setPerkawinanOpsiKK('TETAP_DI_KK_MASING2');
    setPerkawinanAlamatKKBaru('');
    setPerkawinanSuccession({
      pendudukIsKepala: false, pendudukSisaAnggota: [], pendudukGantiKepalaId: '', pendudukAdaPengganti: true,
      pasanganIsKepala: false, pasanganSisaAnggota: [], pasanganGantiKepalaId: '', pasanganAdaPengganti: true,
    });
    setPerkawinanLoadingSuccession(false);
  };

  const openForm = (jenis: string) => {
    resetAllForms();
    setSelectedJenis(jenis);
    setView('form');
  };

  const backToMenu = () => {
    setView('menu');
    setSelectedJenis(null);
    fetchStats();
    fetchPeristiwa();
  };

  // ============================================================
  // Submit Handlers
  // ============================================================

  const afterSubmit = () => {
    resetAllForms();
    setView('menu');
    fetchStats();
    fetchPeristiwa();
  };

  const handleKelahiranSubmit = async () => {
    if (!kelahiranForm.namaBayi) { toast.error('Nama bayi wajib diisi'); return; }
    if (!kelahiranForm.kkId) { toast.error('Kartu Keluarga wajib dipilih'); return; }
    setSubmitting(true);
    try {
      const response = await fetch('/api/kependudukan/peristiwa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisPeristiwa: 'KELAHIRAN', kkId: kelahiranForm.kkId,
          tanggalPeristiwa: kelahiranForm.tanggalLahir, tempat: kelahiranForm.tempatLahir,
          namaBayi: kelahiranForm.namaBayi, jenisKelaminBayi: kelahiranForm.jenisKelamin,
          beratBayi: kelahiranForm.beratBayi || null, panjangBayi: kelahiranForm.panjangBayi || null,
          keterangan: kelahiranForm.keterangan || null,
          namaAyah: kelahiranForm.namaAyah || null, nikAyah: kelahiranForm.nikAyah || null,
          namaIbu: kelahiranForm.namaIbu || null, nikIbu: kelahiranForm.nikIbu || null,
          pendudukBaru: { tempatLahir: kelahiranForm.tempatLahir, tanggalLahir: kelahiranForm.tanggalLahir, agama: kelahiranForm.agama, noAktaKelahiran: kelahiranForm.noAktaKelahiran || null },
        }),
      });
      const result = await response.json();
      if (!result.success) { toast.error(result.error || 'Gagal menyimpan data kelahiran'); return; }
      toast.success('Data kelahiran berhasil disimpan', {
        description: `Penduduk baru: ${kelahiranForm.namaBayi} — Status: TETAP`,
        icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
      });
      afterSubmit();
    } catch (error) { toast.error('Terjadi kesalahan'); } finally { setSubmitting(false); }
  };

  const handleKematianSubmit = async () => {
    if (!selectedPendudukKematian) { toast.error('Pilih penduduk terlebih dahulu'); return; }
    if (isKepalaKK && adaPengganti && !gantiKepalaKeluargaId) { toast.error('Pilih pengganti kepala keluarga atau pilih "Tidak ada pengganti"'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/kependudukan/peristiwa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisPeristiwa: 'KEMATIAN', pendudukId: selectedPendudukKematian.id,
          tanggalPeristiwa: kematianForm.tanggalPeristiwa, tempat: kematianForm.tempat,
          penyebabKematian: kematianForm.penyebabKematian, keterangan: kematianForm.keterangan,
          isProcessed: true,
          gantiKepalaKeluargaId: isKepalaKK && adaPengganti ? gantiKepalaKeluargaId : null,
          hubunganKepalaLama: isKepalaKK && adaPengganti ? hubunganKepalaLamaKematian : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        let description = `Status ${selectedPendudukKematian.namaLengkap} diubah menjadi MENINGGAL`;
        if (data.data?.gantiKepala) description += `, Kepala KK diganti ke ${data.data.gantiKepala.kepalaBaru}`;
        else if (data.data?.kkDinonaktifkan) description += `, KK dinonaktifkan`;
        toast.success('Data kematian berhasil disimpan', { description, icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> });
        afterSubmit();
      } else { toast.error(data.error || 'Gagal menyimpan data kematian'); }
    } catch { toast.error('Terjadi kesalahan'); } finally { setSubmitting(false); }
  };

  const handlePindahMasukSubmit = async () => {
    if (!pindahMasukForm.namaLengkap) { toast.error('Nama lengkap wajib diisi'); return; }
    if (pindahMasukForm.nik.length !== 16) { toast.error('NIK wajib 16 digit'); return; }
    if (!pindahMasukForm.kkId) { toast.error('KK tujuan wajib dipilih'); return; }
    setSubmitting(true);
    try {
      const response = await fetch('/api/kependudukan/peristiwa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jenisPeristiwa: 'PINDAH_MASUK', kkId: pindahMasukForm.kkId,
          tanggalPeristiwa: new Date().toISOString().split('T')[0],
          alamatAsal: pindahMasukForm.alamatAsal || null, keterangan: pindahMasukForm.keterangan || null,
          pendudukBaru: {
            nik: pindahMasukForm.nik, namaLengkap: pindahMasukForm.namaLengkap,
            tempatLahir: pindahMasukForm.tempatLahir, tanggalLahir: pindahMasukForm.tanggalLahir,
            jenisKelamin: pindahMasukForm.jenisKelamin, agama: pindahMasukForm.agama,
            pekerjaan: pindahMasukForm.pekerjaan, statusPerkawinan: pindahMasukForm.statusPerkawinan,
            hubunganKeluarga: pindahMasukForm.hubunganKeluarga,
          },
        }),
      });
      const result = await response.json();
      if (!result.success) { toast.error(result.error || 'Gagal menyimpan data pindah masuk'); return; }
      toast.success('Data pindah masuk berhasil disimpan', {
        description: `Penduduk: ${pindahMasukForm.namaLengkap} (NIK: ${pindahMasukForm.nik}) — Status: TETAP`,
        icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
      });
      afterSubmit();
    } catch { toast.error('Terjadi kesalahan'); } finally { setSubmitting(false); }
  };

  const handlePindahKeluarSubmit = async (submitData: { pindahKeluarIds: string[]; kkId: string; gantiKepalaPindahId: string | null }) => {
    setSubmitting(true);
    try {
      const bodyData: Record<string, unknown> = {
        jenisPeristiwa: 'PINDAH_KELUAR', tanggalPeristiwa: pindahTanggalPeristiwa,
        alamatTujuan: pindahAlamatTujuan, keterangan: pindahKeterangan, isProcessed: true,
        pindahKeluarIds: submitData.pindahKeluarIds, kkId: submitData.kkId || null,
        ...(submitData.gantiKepalaPindahId ? { gantiKepalaPindahId: submitData.gantiKepalaPindahId } : {}),
      };
      const res = await fetch('/api/kependudukan/peristiwa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
      const data = await res.json();
      if (data.success) {
        const jumlah = data.data?.processedData?.jumlahPindah || submitData.pindahKeluarIds.length;
        let description = `${jumlah} penduduk status diubah menjadi PINDAH`;
        if (data.data?.processedData?.gantiKepala) description += `, Kepala KK diganti ke ${data.data.processedData.gantiKepala.kepalaBaru}`;
        else if (data.data?.processedData?.kkDinonaktifkan) description += `, KK dinonaktifkan`;
        toast.success('Data pindah keluar berhasil disimpan', { description, icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> });
        afterSubmit();
      } else { toast.error(data.error || 'Gagal menyimpan data pindah keluar'); }
    } catch { toast.error('Terjadi kesalahan'); } finally { setSubmitting(false); }
  };

  const handlePerkawinanSubmit = async () => {
    if (!selectedPendudukPerkawinan) { toast.error('Pilih penduduk terlebih dahulu'); return; }
    setSubmitting(true);
    try {
      const hasAkta = perkawinanForm.aktaPerkawinan && perkawinanForm.aktaPerkawinan !== 'TERCATAT';
      const statusPerkawinanTarget = hasAkta ? 'KAWIN_TERCATAT' : 'KAWIN_TIDAK_TERCATAT';
      const bodyData: Record<string, unknown> = {
        jenisPeristiwa: 'PERKAWINAN', pendudukId: selectedPendudukPerkawinan.id,
        tanggalPeristiwa: perkawinanForm.tanggalPerkawinan, tanggalPerkawinan: perkawinanForm.tanggalPerkawinan,
        tempat: perkawinanForm.tempat, aktaPerkawinan: hasAkta ? perkawinanForm.aktaPerkawinan : null,
        statusPerkawinanTarget,
        keterangan: selectedPendudukPasangan
          ? `Pasangan: ${selectedPendudukPasangan.namaLengkap} (NIK: ${selectedPendudukPasangan.nik}). ${perkawinanForm.keterangan}`
          : perkawinanForm.keterangan,
        isProcessed: true,
      };
      if (selectedPendudukPasangan) {
        bodyData.pasanganId = selectedPendudukPasangan.id;
        if (selectedPendudukPerkawinan.kkId && selectedPendudukPasangan.kkId && selectedPendudukPerkawinan.kkId !== selectedPendudukPasangan.kkId) {
          bodyData.opsiKKPerkawinan = perkawinanOpsiKK;
          if (perkawinanOpsiKK === 'BUAT_KK_BARU') bodyData.alamatKKBaru = perkawinanAlamatKKBaru;
          if (perkawinanSuccession.pendudukIsKepala && perkawinanSuccession.pendudukAdaPengganti && perkawinanSuccession.pendudukGantiKepalaId)
            bodyData.gantiKepalaPerkawinanPendudukId = perkawinanSuccession.pendudukGantiKepalaId;
          if (perkawinanSuccession.pasanganIsKepala && perkawinanSuccession.pasanganAdaPengganti && perkawinanSuccession.pasanganGantiKepalaId)
            bodyData.gantiKepalaPerkawinanPasanganId = perkawinanSuccession.pasanganGantiKepalaId;
        }
      }
      const res = await fetch('/api/kependudukan/peristiwa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
      const data = await res.json();
      if (data.success) {
        const statusLabel = statusPerkawinanTarget === 'KAWIN_TERCATAT' ? 'Kawin Tercatat' : 'Kawin Tidak Tercatat';
        let description = `Status ${selectedPendudukPerkawinan.namaLengkap} diubah menjadi ${statusLabel}`;
        if (data.data?.processedData?.pasanganDiupdate) description += `, Pasangan (${data.data.processedData.pasanganDiupdate.namaLengkap}) juga diupdate`;
        if (data.data?.processedData?.pindahPasanganKeKK) description += `, Pasangan pindah ke KK penduduk`;
        if (data.data?.processedData?.kkBaru) description += `, KK baru ${data.data.processedData.kkBaru.nomorKK} dibuat`;
        if (data.data?.processedData?.gantiKepalaKKPasangan) description += `, Kepala KK pasangan diganti ke ${data.data.processedData.gantiKepalaKKPasangan.kepalaBaru}`;
        if (data.data?.processedData?.kkPasanganDinonaktifkan) description += `, KK pasangan lama dinonaktifkan`;
        toast.success('Data perkawinan berhasil disimpan', { description, icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> });
        afterSubmit();
      } else { toast.error(data.error || 'Gagal menyimpan data perkawinan'); }
    } catch { toast.error('Terjadi kesalahan'); } finally { setSubmitting(false); }
  };

  const handlePerceraianSubmit = async (submitData: {
    pendudukId: string; kkId: string; tanggalPerceraian: string; statusPerkawinanTarget: string;
    aktaPerceraian: string | null; keterangan: string; opsiKKPerceraian: string | null;
    gantiKepalaPerceraianId: string | null; hubunganKepalaLamaPerceraian: string | null;
    alamatKKBaru: string | null; rtIdKKBaru: string | null; dusunIdKKBaru: string | null; pindahKKTujuanId: string | null;
  }) => {
    setSubmitting(true);
    try {
      const bodyData: Record<string, unknown> = {
        jenisPeristiwa: 'PERCERAIAN', pendudukId: submitData.pendudukId,
        tanggalPeristiwa: submitData.tanggalPerceraian, tanggalPerceraian: submitData.tanggalPerceraian,
        statusPerkawinanTarget: submitData.statusPerkawinanTarget, aktaPerceraian: submitData.aktaPerceraian,
        keterangan: submitData.keterangan, isProcessed: true, kkId: submitData.kkId || null,
        ...(submitData.opsiKKPerceraian ? { opsiKKPerceraian: submitData.opsiKKPerceraian } : {}),
        ...(submitData.gantiKepalaPerceraianId ? { gantiKepalaPerceraianId: submitData.gantiKepalaPerceraianId } : {}),
        ...(submitData.hubunganKepalaLamaPerceraian ? { hubunganKepalaLamaPerceraian: submitData.hubunganKepalaLamaPerceraian } : {}),
        ...(submitData.alamatKKBaru ? { alamatKKBaru: submitData.alamatKKBaru } : {}),
        ...(submitData.rtIdKKBaru ? { rtIdKKBaru: submitData.rtIdKKBaru } : {}),
        ...(submitData.dusunIdKKBaru ? { dusunIdKKBaru: submitData.dusunIdKKBaru } : {}),
        ...(submitData.pindahKKTujuanId ? { pindahKKTujuanId: submitData.pindahKKTujuanId } : {}),
      };
      const res = await fetch('/api/kependudukan/peristiwa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyData) });
      const data = await res.json();
      if (data.success) {
        const statusLabel = submitData.statusPerkawinanTarget.replace(/_/g, ' ');
        let description = `Status perkawinan diubah menjadi ${statusLabel}`;
        if (data.data?.processedData?.pasanganDiupdate) description += ` · Pasangan (${data.data.processedData.pasanganDiupdate.namaLengkap}) juga diupdate`;
        if (data.data?.processedData?.gantiKepala) description += `, Kepala KK diganti ke ${data.data.processedData.gantiKepala.kepalaBaru}`;
        if (data.data?.processedData?.kkDinonaktifkan) description += `, KK lama dinonaktifkan`;
        if (data.data?.processedData?.kkBaru) description += `, KK baru ${data.data.processedData.kkBaru.nomorKK} dibuat`;
        if (data.data?.processedData?.pindahKeKK) description += `, pindah ke KK ${data.data.processedData.pindahKeKK.nomorKK}`;
        toast.success('Data perceraian berhasil disimpan', { description, icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> });
        afterSubmit();
      } else { toast.error(data.error || 'Gagal menyimpan data perceraian'); }
    } catch { toast.error('Terjadi kesalahan'); } finally { setSubmitting(false); }
  };

  // ============================================================
  // Utility Functions
  // ============================================================

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const getJenisBadge = (jenis: string) => {
    const config = jenisPeristiwaOptions.find(j => j.value === jenis);
    if (!config) return <Badge>{jenis}</Badge>;
    const Icon = config.icon;
    return <Badge className={cn('gap-1', config.color)}><Icon className="w-3 h-3" />{config.label}</Badge>;
  };

  const handleViewDetail = (peristiwa: Peristiwa) => {
    setDetailData(peristiwa);
    setShowDetail(true);
  };

  // ============================================================
  // RENDER: Form View (full page)
  // ============================================================

  const renderFormView = () => {
    const selectedConfig = jenisPeristiwaOptions.find(j => j.value === selectedJenis);

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className="p-6 space-y-6"
      >
        {/* Back header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={backToMenu} className="gap-1 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="w-4 h-4" />
            Kembali
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', selectedConfig?.color)}>
              {selectedConfig && <selectedConfig.icon className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{selectedConfig?.label}</h2>
              <p className="text-sm text-gray-500">{selectedConfig?.description}</p>
            </div>
          </div>
        </div>

        {/* Form container */}
        <div className="max-w-3xl mx-auto">
          {selectedJenis === 'KELAHIRAN' && (
            <KelahiranForm
              kelahiranForm={kelahiranForm} setKelahiranForm={setKelahiranForm}
              selectedIbu={selectedIbuKelahiran} setSelectedIbu={handleSelectIbuKelahiran}
              onClearIbu={handleClearIbuKelahiran}
              submitting={submitting} onSubmit={handleKelahiranSubmit} onCancel={backToMenu}
            />
          )}
          {selectedJenis === 'KEMATIAN' && (
            <KematianForm
              kematianForm={kematianForm} setKematianForm={setKematianForm}
              selectedPenduduk={selectedPendudukKematian} setSelectedPenduduk={handleSelectKematian}
              isKepalaKK={isKepalaKK} anggotaKK={anggotaKK} loadingAnggota={loadingAnggota}
              adaPengganti={adaPengganti} setAdaPengganti={setAdaPengganti}
              gantiKepalaKeluargaId={gantiKepalaKeluargaId} setGantiKepalaKeluargaId={setGantiKepalaKeluargaId}
              hubunganKepalaLama={hubunganKepalaLamaKematian} setHubunganKepalaLama={setHubunganKepalaLamaKematian}
              submitting={submitting} onSubmit={handleKematianSubmit} onCancel={backToMenu}
              onClearPenduduk={() => { setSelectedPendudukKematian(null); setIsKepalaKK(false); setAnggotaKK([]); setGantiKepalaKeluargaId(''); }}
            />
          )}
          {selectedJenis === 'PINDAH_MASUK' && (
            <PindahMasukForm
              pindahMasukForm={pindahMasukForm} setPindahMasukForm={setPindahMasukForm}
              selectedKKMasuk={selectedKKMasuk} setSelectedKKMasuk={handleSelectKKMasuk}
              onClearKKMasuk={handleClearKKMasuk}
              submitting={submitting} onSubmit={handlePindahMasukSubmit} onCancel={backToMenu}
            />
          )}
          {selectedJenis === 'PINDAH_KELUAR' && (
            <PindahKeluarForm
              tanggalPeristiwa={pindahTanggalPeristiwa} alamatTujuan={pindahAlamatTujuan}
              keterangan={pindahKeterangan}
              setTanggalPeristiwa={setPindahTanggalPeristiwa} setAlamatTujuan={setPindahAlamatTujuan}
              setKeterangan={setPindahKeterangan}
              submitting={submitting} onSubmit={handlePindahKeluarSubmit} onCancel={backToMenu}
            />
          )}
          {selectedJenis === 'PERKAWINAN' && (
            <PerkawinanForm
              perkawinanForm={perkawinanForm} setPerkawinanForm={setPerkawinanForm}
              selectedPenduduk={selectedPendudukPerkawinan} setSelectedPenduduk={setSelectedPendudukPerkawinan}
              selectedPasangan={selectedPendudukPasangan} setSelectedPasangan={setSelectedPendudukPasangan}
              opsiKK={perkawinanOpsiKK} setOpsiKK={setPerkawinanOpsiKK}
              alamatKKBaru={perkawinanAlamatKKBaru} setAlamatKKBaru={setPerkawinanAlamatKKBaru}
              succession={perkawinanSuccession} setSuccession={setPerkawinanSuccession}
              loadingSuccession={perkawinanLoadingSuccession}
              submitting={submitting} onSubmit={handlePerkawinanSubmit} onCancel={backToMenu}
            />
          )}
          {selectedJenis === 'PERCERAIAN' && (
            <PerceraianForm
              wilayahOptions={wilayahOptions}
              submitting={submitting} onSubmit={handlePerceraianSubmit} onCancel={backToMenu}
            />
          )}
        </div>
      </motion.div>
    );
  };

  // ============================================================
  // RENDER: Menu View
  // ============================================================

  const renderMenuView = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="p-6 space-y-6"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-emerald-600" />
            Peristiwa Kependudukan
          </h2>
          <p className="text-gray-500 mt-1">Catat dan kelola peristiwa kependudukan desa</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchPeristiwa(); }} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsLoading ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-6 w-10" /></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-100">
                    <ClipboardList className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Peristiwa</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.total ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-100">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bulan Ini</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.bulanIni ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Belum Diproses</p>
                    <p className="text-2xl font-bold text-gray-900">{stats?.belumDiproses ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Catat Peristiwa Baru</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {inputPeristiwaOptions.map((jenis, index) => {
            const Icon = jenis.icon;
            const count = stats?.perJenis?.[jenis.value] ?? 0;
            return (
              <motion.button
                key={jenis.value}
                onClick={() => openForm(jenis.value)}
                className={cn(
                  'relative p-4 rounded-xl border-2 text-left transition-all duration-200',
                  jenis.borderColor,
                  'active:scale-[0.98]'
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="flex items-start justify-between">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', jenis.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {count > 0 && (
                    <Badge variant="secondary" className="text-xs font-normal bg-white/80 text-gray-500">
                      {count}
                    </Badge>
                  )}
                </div>
                <p className="font-semibold text-gray-900">{jenis.label}</p>
                <p className="text-xs text-gray-500 mt-1">{jenis.description}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Recent Peristiwa Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Riwayat Peristiwa</h3>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {/* Filters */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Cari nama atau keterangan..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={filterJenis || 'all'}
                  onValueChange={(value) => { setFilterJenis(value === 'all' ? '' : value); setPage(1); }}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Semua Jenis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Jenis</SelectItem>
                    {jenisPeristiwaOptions.map((jenis) => (
                      <SelectItem key={jenis.value} value={jenis.value}>{jenis.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">No</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Jenis</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Keterangan</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-24 rounded-full" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-4 w-36" /></td>
                        <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-20 rounded-full mx-auto" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-8 w-8 rounded mx-auto" /></td>
                      </tr>
                    ))
                  ) : peristiwaList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-3 rounded-full bg-gray-100">
                            <Calendar className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium">Tidak ada data peristiwa</span>
                            <p className="text-xs text-gray-400 mt-1">Belum ada peristiwa yang tercatat</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    peristiwaList.map((peristiwa, index) => (
                      <motion.tr
                        key={peristiwa.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * 10 + index + 1}</td>
                        <td className="px-4 py-3">{getJenisBadge(peristiwa.jenisPeristiwa)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900 text-sm">
                            {peristiwa.jenisPeristiwa === 'KELAHIRAN' ? peristiwa.namaBayi : peristiwa.penduduk?.namaLengkap || '-'}
                          </p>
                          {peristiwa.jenisPeristiwa !== 'KELAHIRAN' && peristiwa.penduduk && (
                            <p className="text-xs text-gray-400 mt-0.5">NIK: {peristiwa.penduduk.nik}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">{formatDate(peristiwa.tanggalPeristiwa)}</p>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-sm text-gray-600 max-w-xs truncate">{peristiwa.jenisPeristiwa === 'MUTASI_KK' ? parseMutasiKeterangan(peristiwa.keterangan) : (peristiwa.keterangan || '-')}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={cn(
                            'text-xs',
                            peristiwa.isProcessed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                          )}>
                            {peristiwa.isProcessed ? 'Diproses' : 'Belum'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center">
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleViewDetail(peristiwa)}
                              className="text-gray-500 hover:text-emerald-600 hover:bg-emerald-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} dari {total}
                </p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-8 text-xs">Sebelumnya</Button>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (page <= 3) pageNum = i + 1;
                      else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = page - 2 + i;
                      return (
                        <Button
                          key={pageNum} variant={page === pageNum ? 'default' : 'outline'} size="sm"
                          onClick={() => setPage(pageNum)}
                          className={cn('w-8 h-8 p-0 text-xs', page === pageNum && 'bg-emerald-600 hover:bg-emerald-700 text-white')}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-8 text-xs">Selanjutnya</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detail Peristiwa</DialogTitle>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                {getJenisBadge(detailData.jenisPeristiwa)}
                <Badge className={detailData.isProcessed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                  {detailData.isProcessed ? 'Diproses' : 'Belum Diproses'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Tanggal</p>
                  <p className="font-medium text-sm">{formatDate(detailData.tanggalPeristiwa)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tempat</p>
                  <p className="font-medium text-sm">{detailData.tempat || '-'}</p>
                </div>
                {detailData.jenisPeristiwa === 'KELAHIRAN' && (
                  <>
                    <div><p className="text-sm text-gray-500">Nama Bayi</p><p className="font-medium text-sm">{detailData.namaBayi}</p></div>
                    <div><p className="text-sm text-gray-500">Jenis Kelamin</p><p className="font-medium text-sm">{detailData.jenisKelaminBayi === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}</p></div>
                  </>
                )}
                {detailData.jenisPeristiwa === 'KEMATIAN' && (
                  <>
                    <div className="col-span-2"><p className="text-sm text-gray-500">Almarhum/Almarhumah</p><p className="font-medium text-sm">{detailData.penduduk?.namaLengkap || '-'}</p></div>
                    <div className="col-span-2"><p className="text-sm text-gray-500">Penyebab</p><p className="font-medium text-sm">{detailData.penyebabKematian || '-'}</p></div>
                  </>
                )}
                {(detailData.jenisPeristiwa === 'PINDAH_MASUK' || detailData.jenisPeristiwa === 'PINDAH_KELUAR' || detailData.jenisPeristiwa === 'MUTASI_KK') && (
                  <>
                    <div className="col-span-2"><p className="text-sm text-gray-500">Alamat Asal</p><p className="font-medium text-sm">{detailData.alamatAsal || '-'}</p></div>
                    <div className="col-span-2"><p className="text-sm text-gray-500">Alamat Tujuan</p><p className="font-medium text-sm">{detailData.alamatTujuan || '-'}</p></div>
                  </>
                )}
                {detailData.keterangan && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Keterangan</p>
                    <p className="font-medium text-sm">
                      {detailData.jenisPeristiwa === 'MUTASI_KK' ? parseMutasiKeterangan(detailData.keterangan) : detailData.keterangan}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );

  // ============================================================
  // Main Render
  // ============================================================

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        {view === 'menu' ? renderMenuView() : renderFormView()}
      </AnimatePresence>
    </div>
  );
}
