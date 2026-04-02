'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Eye,
  Users,
  Home,
  MapPin,
  MoreVertical,
  FileSpreadsheet,
  UserPlus,
  CheckCircle,
  XCircle,
  Printer,
  Upload,
  X,
  Image as ImageIcon,
  Map,
  ArrowLeft,
} from 'lucide-react';
import { DetailKK } from './detail-kk';
import { DetailPenduduk } from './detail-penduduk';
import { FormPendudukUnified } from './form-penduduk-unified';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton, StatsCardsSkeleton } from '@/components/ui/loading-skeleton';

interface KK {
  id: string;
  nomorKK: string;
  kepalaKeluarga: string;
  kepalaKeluargaTanggalLahir: string | null;
  alamat: string;
  rt: string;
  rw: string;
  dusun: string;
  rtId: string | null;
  dusunId: string | null;
  tanggalTerbit: string | null;
  jenisTempatTinggal: string;
  latitude: string | null;
  longitude: string | null;
  scanKK: string | null;
  fotoRumah: string | null;
  jumlahAnggota: number;
  isActive: boolean;
  createdAt: string;
}

interface KKFormData {
  nomorKK: string;
  tanggalTerbit: string;
  jenisTempatTinggal: string;
  alamat: string;
  rtId: string;
  dusunId: string;
  latitude: string;
  longitude: string;
  scanKK: string;
  fotoRumah: string;
}

interface Dusun {
  id: string;
  nama: string;
  kode: string | null;
  jumlahRT: number;
  rwList: RW[];
}

interface RW {
  id: string;
  nomor: string;
  jumlahRT: number;
  rtList: RT[];
}

interface RT {
  id: string;
  nomor: string;
}

// Combined RT option with full address
interface RTCombinedOption {
  id: string;
  nomor: string;
  rwNomor: string;
  dusunNama: string;
  dusunId: string;
  label: string; // Format: "Dusun - RW 001 - RT 001"
}

interface Statistics {
  totalKK: number;
  totalAnggota: number;
  kkAktif: number;
  kkNonaktif: number;
  kkBulanIni: number;
  rataRataAnggota: string;
}

const jenisTempatTinggalOptions = [
  { value: 'MILIK_SENDIRI', label: 'Milik Sendiri' },
  { value: 'KONTRAK', label: 'Kontrak' },
  { value: 'SEWA', label: 'Sewa' },
  { value: 'RUMAH_ORANGTUA', label: 'Rumah Orang Tua' },
  { value: 'RUMAH_SAUDARA', label: 'Rumah Saudara' },
  { value: 'RUMAH_DINAS', label: 'Rumah Dinas' },
  { value: 'LAINNYA', label: 'Lainnya' },
];

const initialFormData: KKFormData = {
  nomorKK: '',
  tanggalTerbit: '',
  jenisTempatTinggal: 'MILIK_SENDIRI',
  alamat: '',
  rtId: '',
  dusunId: '',
  latitude: '',
  longitude: '',
  scanKK: '',
  fotoRumah: '',
};

export function DataKK() {
  const [kkList, setKkList] = useState<KK[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState<Statistics>({
    totalKK: 0,
    totalAnggota: 0,
    kkAktif: 0,
    kkNonaktif: 0,
    kkBulanIni: 0,
    rataRataAnggota: '0',
  });

  // Filter states
  const [filterWilayah, setFilterWilayah] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Combined wilayah options
  const [wilayahOptions, setWilayahOptions] = useState<RTCombinedOption[]>([]);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingKK, setEditingKK] = useState<KK | null>(null);
  const [formData, setFormData] = useState<KKFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof KKFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedKK, setSelectedKK] = useState<KK | null>(null);
  
  // View mode: 'list' | 'detail' | 'formPenduduk' | 'pendudukDetail'
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'formPenduduk' | 'pendudukDetail'>('list');
  const [selectedKKId, setSelectedKKId] = useState<string | null>(null);
  const [viewPendudukId, setViewPendudukId] = useState<string | null>(null);
  
  // Form Penduduk states
  const [formPendudukMode, setFormPendudukMode] = useState<'tambah' | 'edit' | 'anggota-kk' | 'penduduk-baru'>('tambah');
  const [editingPenduduk, setEditingPenduduk] = useState<any | null>(null);
  const [kkInfoForForm, setKkInfoForForm] = useState<any | null>(null);

  // File input refs
  const scanKKInputRef = useRef<HTMLInputElement>(null);
  const fotoRumahInputRef = useRef<HTMLInputElement>(null);

  // Fetch wilayah data and build combined options
  const fetchWilayah = useCallback(async () => {
    try {
      const response = await fetch('/api/wilayah');
      const data = await response.json();

      if (data.success) {
        // Build combined options from dusun > rw > rt
        const combinedOptions: RTCombinedOption[] = [];
        
        data.data.dusun.forEach((dusun: Dusun) => {
          dusun.rwList.forEach((rw) => {
            rw.rtList.forEach((rt) => {
              combinedOptions.push({
                id: rt.id,
                nomor: rt.nomor,
                rwNomor: rw.nomor,
                dusunNama: dusun.nama,
                dusunId: dusun.id,
                label: `${dusun.nama} - RW ${rw.nomor} - RT ${rt.nomor}`,
              });
            });
          });
        });

        // Sort by dusun name, then RW, then RT
        combinedOptions.sort((a, b) => {
          if (a.dusunNama !== b.dusunNama) return a.dusunNama.localeCompare(b.dusunNama);
          if (a.rwNomor !== b.rwNomor) return a.rwNomor.localeCompare(b.rwNomor);
          return a.nomor.localeCompare(b.nomor);
        });

        setWilayahOptions(combinedOptions);
      }
    } catch (error) {
      console.error('Error fetching wilayah:', error);
    }
  }, []);

  // Fetch KK list
  const fetchKK = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterWilayah) params.append('rtId', filterWilayah);
      if (filterStatus) params.append('status', filterStatus);
      params.append('page', page.toString());
      params.append('limit', '10');

      const response = await fetch(`/api/kependudukan/kk?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setKkList(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
        if (data.statistics) {
          setStatistics(data.statistics);
        }
      }
    } catch (error) {
      console.error('Error fetching KK:', error);
      toast.error('Gagal mengambil data KK');
    } finally {
      setLoading(false);
    }
  }, [search, page, filterWilayah, filterStatus]);

  useEffect(() => {
    fetchWilayah();
  }, [fetchWilayah]);

  useEffect(() => {
    fetchKK();
  }, [fetchKK]);

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setEditingKK(null);
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setShowForm(true);
  };

  // Open edit modal
  const openEditModal = (kk: KK) => {
    setEditingKK(kk);
    setFormData({
      nomorKK: kk.nomorKK,
      tanggalTerbit: kk.tanggalTerbit ? kk.tanggalTerbit.split('T')[0] : '',
      jenisTempatTinggal: kk.jenisTempatTinggal || 'MILIK_SENDIRI',
      alamat: kk.alamat,
      rtId: kk.rtId || '',
      dusunId: kk.dusunId || '',
      latitude: kk.latitude || '',
      longitude: kk.longitude || '',
      scanKK: kk.scanKK || '',
      fotoRumah: kk.fotoRumah || '',
    });
    setShowForm(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof KKFormData, string>> = {};

    // Nomor KK opsional — KK baru mungkin belum punya nomor
    if (formData.nomorKK.trim() && !/^\d{16}$/.test(formData.nomorKK)) {
      errors.nomorKK = 'Nomor KK harus 16 digit angka';
    }
    if (!formData.alamat.trim()) {
      errors.alamat = 'Alamat wajib diisi';
    }
    if (!formData.rtId) {
      errors.rtId = 'RT/RW/Dusun wajib dipilih';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle wilayah selection change
  const handleWilayahChange = (rtId: string) => {
    const selected = wilayahOptions.find(opt => opt.id === rtId);
    if (selected) {
      setFormData({
        ...formData,
        rtId: selected.id,
        dusunId: selected.dusunId,
      });
    } else {
      setFormData({
        ...formData,
        rtId: '',
        dusunId: '',
      });
    }
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'scanKK' | 'fotoRumah') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        [field]: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Remove uploaded file
  const handleRemoveFile = (field: 'scanKK' | 'fotoRumah') => {
    setFormData(prev => ({
      ...prev,
      [field]: '',
    }));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = editingKK ? `/api/kependudukan/kk/${editingKK.id}` : '/api/kependudukan/kk';
      const method = editingKK ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingKK ? 'KK berhasil diupdate' : 'KK berhasil ditambahkan');
        setShowForm(false);
        resetForm();
        fetchKK();
      } else {
        toast.error(data.error || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete KK
  const handleDelete = async () => {
    if (!selectedKK) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/kependudukan/kk/${selectedKK.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('KK berhasil dihapus');
        setShowDeleteConfirm(false);
        setSelectedKK(null);
        fetchKK();
      } else {
        toast.error(data.error || 'Gagal menghapus KK');
      }
    } catch (error) {
      console.error('Error deleting KK:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // View detail - switch to detail page
  const handleViewDetail = (kk: KK) => {
    setSelectedKKId(kk.id);
    setViewMode('detail');
  };

  // Back to list
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedKKId(null);
    fetchKK(); // Refresh the list
  };

  // Handle edit from detail page
  const handleEditFromDetail = (kkDetail: any) => {
    // Convert detail format to KK format for editing
    const kkForEdit: KK = {
      id: kkDetail.id,
      nomorKK: kkDetail.nomorKK || '',
      kepalaKeluarga: kkDetail.anggota?.find((a: any) => a.hubunganKeluarga === 'KEPALA_KELUARGA')?.namaLengkap || '',
      kepalaKeluargaTanggalLahir: kkDetail.anggota?.find((a: any) => a.hubunganKeluarga === 'KEPALA_KELUARGA')?.tanggalLahir || null,
      alamat: kkDetail.alamat,
      rt: kkDetail.rt,
      rw: kkDetail.rw,
      dusun: kkDetail.dusun,
      rtId: kkDetail.rtId,
      dusunId: kkDetail.dusunId,
      tanggalTerbit: kkDetail.tanggalTerbit,
      jenisTempatTinggal: kkDetail.jenisTempatTinggal,
      latitude: kkDetail.latitude,
      longitude: kkDetail.longitude,
      scanKK: kkDetail.scanKK,
      fotoRumah: kkDetail.fotoRumah,
      jumlahAnggota: kkDetail.anggota?.length || 0,
      isActive: kkDetail.isActive,
      createdAt: kkDetail.createdAt,
    };
    openEditModal(kkForEdit);
  };

  // Handle delete from detail page
  const handleDeleteFromDetail = (kkDetail: any) => {
    const kkForDelete: KK = {
      id: kkDetail.id,
      nomorKK: kkDetail.nomorKK || '',
      kepalaKeluarga: kkDetail.anggota?.find((a: any) => a.hubunganKeluarga === 'KEPALA_KELUARGA')?.namaLengkap || '',
      kepalaKeluargaTanggalLahir: kkDetail.anggota?.find((a: any) => a.hubunganKeluarga === 'KEPALA_KELUARGA')?.tanggalLahir || null,
      alamat: kkDetail.alamat,
      rt: kkDetail.rt,
      rw: kkDetail.rw,
      dusun: kkDetail.dusun,
      rtId: kkDetail.rtId,
      dusunId: kkDetail.dusunId,
      tanggalTerbit: kkDetail.tanggalTerbit,
      jenisTempatTinggal: kkDetail.jenisTempatTinggal,
      latitude: kkDetail.latitude,
      longitude: kkDetail.longitude,
      scanKK: kkDetail.scanKK,
      fotoRumah: kkDetail.fotoRumah,
      jumlahAnggota: kkDetail.anggota?.length || 0,
      isActive: kkDetail.isActive,
      createdAt: kkDetail.createdAt,
    };
    setSelectedKK(kkForDelete);
    setShowDeleteConfirm(true);
  };

  // Handle add anggota from detail page
  const handleAddAnggota = (kkDetail: any) => {
    const kepalaKeluarga = kkDetail.anggota?.find((a: any) => a.hubunganKeluarga === 'KEPALA_KELUARGA');
    setKkInfoForForm({
      id: kkDetail.id,
      nomorKK: kkDetail.nomorKK || '',
      kepalaKeluarga: kepalaKeluarga?.namaLengkap || '-',
      alamat: kkDetail.alamat,
      rt: kkDetail.rt,
      rw: kkDetail.rw,
      dusun: kkDetail.dusun,
      jumlahAnggota: kkDetail.anggota?.length || 0,
    });
    setEditingPenduduk(null);
    setFormPendudukMode('tambah');
    setViewMode('formPenduduk');
  };

  // Handle edit penduduk
  const handleEditPenduduk = async (penduduk: any, kkDetail: any) => {
    // Fetch complete penduduk data from API
    try {
      const response = await fetch(`/api/kependudukan/penduduk/${penduduk.id}`);
      const result = await response.json();
      
      if (!result.success) {
        toast.error('Gagal mengambil data penduduk');
        return;
      }
      
      const fullPendudukData = result.data;
      
      const kepalaKeluarga = kkDetail.anggota?.find((a: any) => a.hubunganKeluarga === 'KEPALA_KELUARGA');
      setKkInfoForForm({
        id: kkDetail.id,
        nomorKK: kkDetail.nomorKK || '',
        kepalaKeluarga: kepalaKeluarga?.namaLengkap || '-',
        alamat: kkDetail.alamat,
        rt: kkDetail.rt,
        rw: kkDetail.rw,
        dusun: kkDetail.dusun,
        jumlahAnggota: kkDetail.anggota?.length || 0,
      });
      setEditingPenduduk(fullPendudukData);
      setFormPendudukMode('edit');
      setViewMode('formPenduduk');
    } catch (error) {
      console.error('Error fetching penduduk data:', error);
      toast.error('Terjadi kesalahan saat mengambil data penduduk');
    }
  };

  // Handle submit penduduk
  const handleSubmitPenduduk = async (data: any, kkBaru?: { nomorKK: string; alamat: string; rtId: string; dusunId: string } | null) => {
    try {
      // If creating new KK (penduduk-baru mode with new KK)
      if (kkBaru) {
        const kkResponse = await fetch('/api/kependudukan/kk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nomorKK: kkBaru.nomorKK,
            alamat: kkBaru.alamat,
            rtId: kkBaru.rtId,
            dusunId: kkBaru.dusunId,
            jenisTempatTinggal: 'MILIK_SENDIRI',
          }),
        });
        
        const kkResult = await kkResponse.json();
        
        if (!kkResult.success) {
          toast.error(kkResult.error || 'Gagal membuat KK baru');
          return;
        }
        
        // Add kkId to data
        data.kkId = kkResult.data.id;
      }

      const url = editingPenduduk 
        ? `/api/kependudukan/penduduk/${editingPenduduk.id}` 
        : '/api/kependudukan/penduduk';
      const method = editingPenduduk ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(editingPenduduk ? 'Penduduk berhasil diupdate' : 'Penduduk berhasil ditambahkan');
        if (formPendudukMode === 'penduduk-baru') {
          setViewMode('list');
          fetchKK(); // Refresh the list
        } else {
          setViewMode('detail');
        }
        setEditingPenduduk(null);
        setKkInfoForForm(null);
        setFormPendudukMode('tambah');
      } else {
        toast.error(result.error || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error submitting penduduk:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  // Handle back from form penduduk
  const handleBackFromFormPenduduk = () => {
    if (formPendudukMode === 'penduduk-baru') {
      setViewMode('list');
    } else {
      setViewMode('detail');
      fetchKK();
    }
    setEditingPenduduk(null);
    setKkInfoForForm(null);
    setFormPendudukMode('tambah');
  };

  // Handle view anggota detail from KK detail
  const handleViewAnggota = (anggota: any) => {
    setViewPendudukId(anggota.id);
    setViewMode('pendudukDetail');
  };

  // Handle back from penduduk detail to KK detail
  const handleBackFromPendudukDetail = () => {
    setViewPendudukId(null);
    setViewMode('detail');
    // DetailKK will re-fetch data on mount
  };

  // Handle tambah penduduk baru (with option to create new KK)
  const handleOpenPendudukBaru = () => {
    setFormPendudukMode('penduduk-baru');
    setKkInfoForForm(null);
    setEditingPenduduk(null);
    setViewMode('formPenduduk');
  };

  // Handle submit penduduk baru (with possible new KK)
  const handleSubmitPendudukBaru = async (data: any, kkBaru: { nomorKK: string; alamat: string; rtId: string; dusunId: string } | null) => {
    try {
      let kkId = data.kkId;
      
      // If creating new KK
      if (kkBaru) {
        const kkResponse = await fetch('/api/kependudukan/kk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nomorKK: kkBaru.nomorKK,
            alamat: kkBaru.alamat,
            rtId: kkBaru.rtId,
            dusunId: kkBaru.dusunId,
            jenisTempatTinggal: 'MILIK_SENDIRI',
          }),
        });
        
        const kkResult = await kkResponse.json();
        
        if (!kkResult.success) {
          toast.error(kkResult.error || 'Gagal membuat KK baru');
          return;
        }
        
        kkId = kkResult.data.id;
      }
      
      // Create penduduk
      const response = await fetch('/api/kependudukan/penduduk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          kkId,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Penduduk berhasil ditambahkan');
        setViewMode('list');
        fetchKK();
      } else {
        toast.error(result.error || 'Gagal menambahkan penduduk');
      }
    } catch (error) {
      console.error('Error submitting penduduk baru:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  // Export to Excel
  const handleExport = async () => {
    try {
      toast.info('Mengunduh data KK...');

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterWilayah) params.append('rtId', filterWilayah);
      params.append('limit', '10000');

      const response = await fetch(`/api/kependudukan/kk?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const kkData = data.data;

        const headers = ['No', 'Nomor KK', 'Kepala Keluarga', 'Alamat', 'RT', 'RW', 'Dusun', 'Jenis Tempat Tinggal', 'Jumlah Anggota', 'Status'];
        const rows = kkData.map((kk: KK, index: number) => [
          index + 1,
          `'${kk.nomorKK || '-'}`,
          kk.kepalaKeluarga,
          kk.alamat,
          kk.rt,
          kk.rw,
          kk.dusun,
          jenisTempatTinggalOptions.find(o => o.value === kk.jenisTempatTinggal)?.label || kk.jenisTempatTinggal,
          kk.jumlahAnggota,
          kk.isActive ? 'Aktif' : 'Nonaktif'
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map((row: string[]) => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `data_kk_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);

        toast.success('Data KK berhasil diunduh');
      }
    } catch (error) {
      console.error('Error exporting KK:', error);
      toast.error('Gagal mengunduh data KK');
    }
  };

  // Print KK
  const handlePrint = async (kk: KK) => {
    try {
      const response = await fetch(`/api/kependudukan/kk/${kk.id}`);
      const data = await response.json();

      if (data.success) {
        const kkData = data.data;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast.error('Popup diblokir. Mohon izinkan popup untuk mencetak.');
          return;
        }

        const printContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Kartu Keluarga - ${kkData.nomorKK || 'Belum ada Nomor KK'}</title>
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
              <p>Desa Bojongpicung, Kecamatan Bojongpicung</p>
              <p>Kabupaten Cianjur, Provinsi Jawa Barat</p>
            </div>
            
            <div class="info-grid">
              <div class="info-label">Nomor KK:</div>
              <div>${kkData.nomorKK || 'Belum ada Nomor KK'}</div>
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
                ${kkData.anggota?.map((a: any, i: number) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${a.nik || '-'}</td>
                    <td>${a.namaLengkap}</td>
                    <td>${a.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P'}</td>
                    <td>${a.tempatLahir || '-'}, ${a.tanggalLahir ? new Date(a.tanggalLahir).toLocaleDateString('id-ID') : '-'}</td>
                    <td>${a.hubunganKeluarga || '-'}</td>
                    <td>${a.agama}</td>
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
      }
    } catch (error) {
      console.error('Error printing KK:', error);
      toast.error('Gagal mencetak KK');
    }
  };

  // Show penduduk detail if viewMode is 'pendudukDetail'
  if (viewMode === 'pendudukDetail' && viewPendudukId) {
    return (
      <DetailPenduduk
        pendudukId={viewPendudukId}
        onBack={handleBackFromPendudukDetail}
        onEdit={(penduduk) => {
          // Navigate to edit penduduk form
          const kepalaKeluarga = kkInfoForForm;
          setEditingPenduduk(penduduk);
          setFormPendudukMode('edit');
          setViewMode('formPenduduk');
        }}
        onDelete={(penduduk) => {
          // Just show a confirmation - no need for setSelectedPenduduk in this component
          setShowDeleteConfirm(true);
        }}
      />
    );
  }

  // Show form penduduk if viewMode is 'formPenduduk'
  if (viewMode === 'formPenduduk') {
    // Determine the mode for the unified form
    const getFormMode = (): 'tambah' | 'edit' | 'anggota-kk' | 'penduduk-baru' => {
      if (formPendudukMode === 'edit') return 'edit';
      if (formPendudukMode === 'penduduk-baru') return 'penduduk-baru';
      if (kkInfoForForm) return 'anggota-kk';
      return 'penduduk-baru';
    };

    return (
      <FormPendudukUnified
        mode={getFormMode()}
        layout="full-page"
        kkInfo={kkInfoForForm}
        editingPenduduk={editingPenduduk}
        wilayahOptions={wilayahOptions}
        onBack={handleBackFromFormPenduduk}
        onSubmit={handleSubmitPenduduk}
      />
    );
  }

  // Show detail view if viewMode is 'detail'
  if (viewMode === 'detail' && selectedKKId) {
    return (
      <DetailKK
        kkId={selectedKKId}
        onBack={handleBackToList}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
        onAddAnggota={handleAddAnggota}
        onEditAnggota={handleEditPenduduk}
        onViewAnggota={handleViewAnggota}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Home className="w-7 h-7 text-emerald-600" />
            Data Kartu Keluarga
          </h2>
          <p className="text-gray-500 mt-1">Kelola data kartu keluarga di desa</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            size="sm"
            className="border-gray-300"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleOpenPendudukBaru}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Tambah KK
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          <StatsCardsSkeleton />
        ) : (
          <>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-100">
                    <Home className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total KK</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalKK}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-100">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Anggota</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalAnggota}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-teal-100">
                    <MapPin className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bulan Ini</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.kkBulanIni}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-green-100">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">KK Aktif</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.kkAktif}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-red-100">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nonaktif</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.kkNonaktif}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100">
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rata-rata</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.rataRataAnggota}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nomor KK atau kepala keluarga..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={filterWilayah}
              onValueChange={(value) => {
                setFilterWilayah(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Semua Wilayah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Wilayah</SelectItem>
                {wilayahOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={(value) => {
                setFilterStatus(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KK List Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Daftar Kartu Keluarga</h3>
        <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Nomor KK
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Kepala Keluarga
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Alamat
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Wilayah
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Anggota
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  // Loading skeleton rows
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></td>
                      <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-14 rounded-full mx-auto" /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : kkList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Home className="w-10 h-10 text-gray-300" />
                        <span className="text-gray-500">Tidak ada data KK</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  kkList.map((kk, index) => (
                    <motion.tr
                      key={kk.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewDetail(kk)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {(page - 1) * 10 + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-sm text-gray-900">{kk.nomorKK || <span className="text-gray-400 italic">Belum ada Nomor KK</span>}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{kk.kepalaKeluarga}</p>
                          {(() => {
                            const age = kk.kepalaKeluargaTanggalLahir ? (() => {
                              const birth = new Date(kk.kepalaKeluargaTanggalLahir);
                              const today = new Date();
                              let a = today.getFullYear() - birth.getFullYear();
                              const m = today.getMonth() - birth.getMonth();
                              if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a--;
                              return a >= 0 ? a : null;
                            })() : null;
                            if (age === null) return null;
                            const badgeStyle = age < 30 ? 'bg-emerald-100 text-emerald-700' : age < 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                            return (
                              <Badge className={cn('text-[10px] px-1.5 py-0 h-5 font-medium shrink-0', badgeStyle)}>
                                {age} thn
                              </Badge>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600 max-w-xs truncate">{kk.alamat}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">
                          {kk.dusun} - RT {kk.rt}/RW {kk.rw}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className="bg-blue-100 text-blue-700">
                          {kk.jumlahAnggota} orang
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={kk.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {kk.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(kk)}
                            className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            title="Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(kk)}
                            className="text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                            title="Cetak"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:bg-gray-100"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditModal(kk)}
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedKK(kk);
                                  setShowDeleteConfirm(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Menampilkan {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} dari {total} data
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Sebelumnya
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className={cn(
                          'w-8 h-8 p-0',
                          page === pageNum && 'bg-emerald-600 hover:bg-emerald-700'
                        )}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {/* Add/Edit KK Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingKK ? 'Edit Kartu Keluarga' : 'Tambah Kartu Keluarga Baru'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nomor KK */}
              <div className="space-y-2">
                <Label htmlFor="nomorKK">
                  Nomor KK <span className="text-gray-400 text-[10px]">(opsional)</span>
                </Label>
                <Input
                  id="nomorKK"
                  value={formData.nomorKK}
                  onChange={(e) =>
                    setFormData({ ...formData, nomorKK: e.target.value.replace(/\D/g, '').slice(0, 16) })
                  }
                  placeholder="16 digit (kosongkan jika belum ada)"
                  className={formErrors.nomorKK ? 'border-red-500' : ''}
                />
                {formErrors.nomorKK && (
                  <p className="text-sm text-red-500">{formErrors.nomorKK}</p>
                )}
              </div>

              {/* Tanggal Terbit KK */}
              <div className="space-y-2">
                <Label htmlFor="tanggalTerbit">Tanggal Terbit KK</Label>
                <Input
                  id="tanggalTerbit"
                  type="date"
                  value={formData.tanggalTerbit}
                  onChange={(e) => setFormData({ ...formData, tanggalTerbit: e.target.value })}
                />
              </div>

              {/* Jenis Tempat Tinggal */}
              <div className="space-y-2">
                <Label htmlFor="jenisTempatTinggal">Jenis Tempat Tinggal</Label>
                <Select
                  value={formData.jenisTempatTinggal}
                  onValueChange={(value) => setFormData({ ...formData, jenisTempatTinggal: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Jenis Tempat Tinggal" />
                  </SelectTrigger>
                  <SelectContent>
                    {jenisTempatTinggalOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Wilayah */}
              <div className="space-y-2">
                <Label htmlFor="wilayah">Wilayah (Dusun - RW - RT) <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.rtId}
                  onValueChange={handleWilayahChange}
                >
                  <SelectTrigger className={formErrors.rtId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Pilih Wilayah" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {wilayahOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.rtId && (
                  <p className="text-sm text-red-500">{formErrors.rtId}</p>
                )}
              </div>

              {/* Latitude */}
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude</Label>
                <div className="flex gap-2">
                  <Input
                    id="latitude"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="-6.914744"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setFormData(prev => ({
                              ...prev,
                              latitude: pos.coords.latitude.toString(),
                              longitude: pos.coords.longitude.toString(),
                            }));
                            toast.success('Lokasi berhasil didapatkan');
                          },
                          () => toast.error('Gagal mendapatkan lokasi')
                        );
                      }
                    }}
                    title="Ambil lokasi saat ini"
                  >
                    <Map className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Longitude */}
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude</Label>
                <Input
                  id="longitude"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="107.609810"
                />
              </div>
            </div>

            {/* Alamat */}
            <div className="space-y-2">
              <Label htmlFor="alamat">
                Alamat <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="alamat"
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                placeholder="Contoh: Jl. Melati No. 10"
                className={formErrors.alamat ? 'border-red-500' : ''}
                rows={2}
              />
              {formErrors.alamat && (
                <p className="text-sm text-red-500">{formErrors.alamat}</p>
              )}
            </div>

            {/* Dokumen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Scan KK */}
              <div className="space-y-2">
                <Label>Scan/Foto KK</Label>
                <input
                  ref={scanKKInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'scanKK')}
                  className="hidden"
                />
                {formData.scanKK ? (
                  <div className="relative border rounded-lg overflow-hidden">
                    <img
                      src={formData.scanKK}
                      alt="Scan KK"
                      className="w-full h-40 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleRemoveFile('scanKK')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => scanKKInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Klik untuk upload</p>
                    <p className="text-xs text-gray-400">Max 2MB (JPG, PNG)</p>
                  </div>
                )}
              </div>

              {/* Foto Rumah */}
              <div className="space-y-2">
                <Label>Foto Rumah</Label>
                <input
                  ref={fotoRumahInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'fotoRumah')}
                  className="hidden"
                />
                {formData.fotoRumah ? (
                  <div className="relative border rounded-lg overflow-hidden">
                    <img
                      src={formData.fotoRumah}
                      alt="Foto Rumah"
                      className="w-full h-40 object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => handleRemoveFile('fotoRumah')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fotoRumahInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
                  >
                    <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Klik untuk upload</p>
                    <p className="text-xs text-gray-400">Max 2MB (JPG, PNG)</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                {editingKK ? 'Update' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus KK</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus KK dengan nomor {selectedKK?.nomorKK || '(belum ada nomor)'}? 
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
