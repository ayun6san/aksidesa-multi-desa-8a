'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Eye,
  User,
  UserCheck,
  Calendar,
  MoreVertical,
  FileSpreadsheet,
  MapPin,
  LogOut,
  TrendingUp,
  CheckCircle,
  XCircle,
  Home,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { pekerjaanGroups } from '@/lib/kependudukan-constants';
import { toast } from 'sonner';
import { Skeleton, StatsCardsSkeleton } from '@/components/ui/loading-skeleton';

interface Pendatang {
  id: string;
  nik: string | null;
  namaLengkap: string;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  jenisKelamin: string;
  pekerjaan: string | null;
  alamatAsal: string;
  tujuanKedatangan: string;
  noTelp: string | null;
  alamat: string | null;
  rt: string;
  rw: string;
  dusun: string;
  rtId: string | null;
  dusunId: string | null;
  tanggalDatang: string | null;
  tanggalPulang: string | null;
  lamaTinggal: string | null;
  isActive: boolean;
  keterangan: string | null;
  foto: string | null;
  createdAt: string;
}

interface WilayahOption {
  id: string;
  label: string;
  dusunId: string;
}

interface PendatangFormData {
  nik: string;
  namaLengkap: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  pekerjaan: string;
  alamatAsal: string;
  tujuanKedatangan: string;
  noTelp: string;
  alamat: string;
  rtId: string;
  dusunId: string;
  tanggalDatang: string;
  tanggalPulang: string;
  lamaTinggal: string;
  keterangan: string;
}

interface Statistics {
  totalPendatang: number;
  lakiLaki: number;
  perempuan: number;
  pendatangAktif: number;
  pendatangPulang: number;
  pendatangBulanIni: number;
}

const initialFormData: PendatangFormData = {
  nik: '',
  namaLengkap: '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: 'LAKI_LAKI',
  pekerjaan: '',
  alamatAsal: '',
  tujuanKedatangan: '',
  noTelp: '',
  alamat: '',
  rtId: '',
  dusunId: '',
  tanggalDatang: new Date().toISOString().split('T')[0],
  tanggalPulang: '',
  lamaTinggal: '',
  keterangan: '',
};

export function PendatangSementara() {
  const [pendatangList, setPendatangList] = useState<Pendatang[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWilayah, setFilterWilayah] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statistics, setStatistics] = useState<Statistics>({
    totalPendatang: 0,
    lakiLaki: 0,
    perempuan: 0,
    pendatangAktif: 0,
    pendatangPulang: 0,
    pendatangBulanIni: 0,
  });

  // Wilayah options
  const [wilayahOptions, setWilayahOptions] = useState<WilayahOption[]>([]);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPulangConfirm, setShowPulangConfirm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingPendatang, setEditingPendatang] = useState<Pendatang | null>(null);
  const [formData, setFormData] = useState<PendatangFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<PendatangFormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedPendatang, setSelectedPendatang] = useState<Pendatang | null>(null);
  const [detailData, setDetailData] = useState<Pendatang | null>(null);

  // Fetch wilayah options
  const fetchWilayah = useCallback(async () => {
    try {
      const response = await fetch('/api/wilayah');
      const data = await response.json();

      if (data.success) {
        const combinedOptions: WilayahOption[] = [];
        
        data.data.dusun.forEach((dusun: any) => {
          dusun.rwList.forEach((rw: any) => {
            rw.rtList.forEach((rt: any) => {
              combinedOptions.push({
                id: rt.id,
                label: `${dusun.nama} - RW ${rw.nomor} - RT ${rt.nomor}`,
                dusunId: dusun.id,
              });
            });
          });
        });

        combinedOptions.sort((a, b) => a.label.localeCompare(b.label));
        setWilayahOptions(combinedOptions);
      }
    } catch (error) {
      console.error('Error fetching wilayah:', error);
    }
  }, []);

  // Fetch pendatang list
  const fetchPendatang = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      if (filterWilayah) params.append('rtId', filterWilayah);
      params.append('page', page.toString());
      params.append('limit', '10');

      const response = await fetch(`/api/kependudukan/pendatang?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setPendatangList(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
        if (data.statistics) {
          setStatistics(data.statistics);
        }
      }
    } catch (error) {
      console.error('Error fetching Pendatang:', error);
      toast.error('Gagal mengambil data Pendatang');
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, filterWilayah, page]);

  useEffect(() => {
    fetchWilayah();
  }, [fetchWilayah]);

  useEffect(() => {
    fetchPendatang();
  }, [fetchPendatang]);

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setEditingPendatang(null);
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setShowForm(true);
  };

  // Open edit modal
  const openEditModal = (pendatang: Pendatang) => {
    setEditingPendatang(pendatang);
    setFormData({
      nik: pendatang.nik || '',
      namaLengkap: pendatang.namaLengkap,
      tempatLahir: pendatang.tempatLahir || '',
      tanggalLahir: pendatang.tanggalLahir ? pendatang.tanggalLahir.split('T')[0] : '',
      jenisKelamin: pendatang.jenisKelamin,
      pekerjaan: pendatang.pekerjaan || '',
      alamatAsal: pendatang.alamatAsal,
      tujuanKedatangan: pendatang.tujuanKedatangan,
      noTelp: pendatang.noTelp || '',
      alamat: pendatang.alamat || '',
      rtId: pendatang.rtId || '',
      dusunId: pendatang.dusunId || '',
      tanggalDatang: pendatang.tanggalDatang ? pendatang.tanggalDatang.split('T')[0] : '',
      tanggalPulang: pendatang.tanggalPulang ? pendatang.tanggalPulang.split('T')[0] : '',
      lamaTinggal: pendatang.lamaTinggal || '',
      keterangan: pendatang.keterangan || '',
    });
    setShowForm(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<PendatangFormData> = {};

    if (!formData.namaLengkap.trim()) {
      errors.namaLengkap = 'Nama lengkap wajib diisi';
    }
    if (!formData.alamatAsal.trim()) {
      errors.alamatAsal = 'Alamat asal wajib diisi';
    }
    if (!formData.tujuanKedatangan.trim()) {
      errors.tujuanKedatangan = 'Tujuan kedatangan wajib diisi';
    }
    if (!formData.jenisKelamin) {
      errors.jenisKelamin = 'Jenis kelamin wajib dipilih';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = editingPendatang 
        ? `/api/kependudukan/pendatang/${editingPendatang.id}` 
        : '/api/kependudukan/pendatang';
      const method = editingPendatang ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingPendatang ? 'Pendatang berhasil diupdate' : 'Pendatang berhasil ditambahkan');
        setShowForm(false);
        resetForm();
        fetchPendatang();
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

  // Delete Pendatang
  const handleDelete = async () => {
    if (!selectedPendatang) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/kependudukan/pendatang/${selectedPendatang.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Pendatang berhasil dihapus');
        setShowDeleteConfirm(false);
        setSelectedPendatang(null);
        fetchPendatang();
      } else {
        toast.error(data.error || 'Gagal menghapus Pendatang');
      }
    } catch (error) {
      console.error('Error deleting Pendatang:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // Catat Pulang
  const handleCatatPulang = async () => {
    if (!selectedPendatang) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/kependudukan/pendatang/${selectedPendatang.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: false,
          tanggalPulang: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${selectedPendatang.namaLengkap} dicatat pulang`);
        setShowPulangConfirm(false);
        setSelectedPendatang(null);
        fetchPendatang();
      } else {
        toast.error(data.error || 'Gagal mencatat kepulangan');
      }
    } catch (error) {
      console.error('Error catat pulang:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // View detail
  const handleViewDetail = async (pendatang: Pendatang) => {
    try {
      const response = await fetch(`/api/kependudukan/pendatang/${pendatang.id}`);
      const data = await response.json();

      if (data.success) {
        setDetailData(data.data);
        setShowDetail(true);
      } else {
        toast.error('Gagal mengambil detail Pendatang');
      }
    } catch (error) {
      console.error('Error fetching detail:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  // Export to CSV
  const handleExport = async () => {
    try {
      toast.info('Mengunduh data pendatang...');

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatus) params.append('status', filterStatus);
      params.append('limit', '10000');

      const response = await fetch(`/api/kependudukan/pendatang?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const headers = ['No', 'NIK', 'Nama Lengkap', 'JK', 'Tempat Lahir', 'Tgl Lahir', 'Pekerjaan', 'Alamat Asal', 'Tujuan Kedatangan', 'Tgl Datang', 'Tgl Pulang', 'Lama Tinggal', 'No Telp', 'Wilayah di Desa', 'Status'];
        const rows = data.data.map((p: Pendatang, index: number) => [
          index + 1,
          `'${p.nik || '-'}`,
          p.namaLengkap,
          p.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P',
          p.tempatLahir || '-',
          p.tanggalLahir ? new Date(p.tanggalLahir).toLocaleDateString('id-ID') : '-',
          p.pekerjaan || '-',
          p.alamatAsal,
          p.tujuanKedatangan,
          p.tanggalDatang ? new Date(p.tanggalDatang).toLocaleDateString('id-ID') : '-',
          p.tanggalPulang ? new Date(p.tanggalPulang).toLocaleDateString('id-ID') : '-',
          p.lamaTinggal || '-',
          p.noTelp || '-',
          `RT ${p.rt}/RW ${p.rw} - ${p.dusun}`,
          p.isActive ? 'Aktif' : 'Sudah Pulang',
        ]);

        const csvContent = [
          headers.join(','),
          ...rows.map((row: string[]) => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `data_pendatang_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);

        toast.success('Data pendatang berhasil diunduh');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Gagal mengunduh data');
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate age
  const calculateAge = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  };

  // Calculate duration between two dates
  const calculateDuration = (start: string, end?: string): string | null => {
    if (!start) return null;
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return null;
    if (diffDays === 0) return 'Hari ini';
    if (diffDays < 30) return `${diffDays} hari`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      return remainingDays > 0 ? `${months} bulan ${remainingDays} hari` : `${months} bulan`;
    }
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return remainingMonths > 0 ? `${years} tahun ${remainingMonths} bulan` : `${years} tahun`;
  };

  // Get wilayah label from rtId
  const getWilayahLabel = (rtId: string): string => {
    const opt = wilayahOptions.find(o => o.id === rtId);
    return opt ? opt.label : '';
  };

  // Computed duration info
  const computedDuration = formData.tanggalDatang && formData.tanggalPulang
    ? calculateDuration(formData.tanggalDatang, formData.tanggalPulang)
    : formData.tanggalDatang
      ? calculateDuration(formData.tanggalDatang)
      : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="w-7 h-7 text-emerald-600" />
            Pendatang Sementara
          </h2>
          <p className="text-gray-500 mt-1">Kelola data pendatang sementara di desa</p>
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
            onClick={openAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah Pendatang
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
                    <UserCheck className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.totalPendatang}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-100">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Laki-laki</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.lakiLaki}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-pink-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-pink-100">
                    <User className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Perempuan</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.perempuan}</p>
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
                    <p className="text-2xl font-bold text-gray-900">{statistics.pendatangBulanIni}</p>
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
                    <p className="text-sm text-gray-500">Aktif</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.pendatangAktif}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-100">
                    <XCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pulang</p>
                    <p className="text-2xl font-bold text-gray-900">{statistics.pendatangPulang}</p>
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
                placeholder="Cari nama atau alamat asal..."
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
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Sudah Pulang</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Daftar Pendatang Sementara</h3>
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
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Alamat Asal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tujuan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Tgl Datang
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Wilayah
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
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-4 py-3 text-center"><Skeleton className="h-5 w-16 rounded-full mx-auto" /></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : pendatangList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <UserCheck className="w-10 h-10 text-gray-300" />
                          <span className="text-gray-500">Tidak ada data pendatang</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    pendatangList.map((pendatang, index) => (
                      <motion.tr
                        key={pendatang.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {(page - 1) * 10 + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shrink-0">
                              <span className="text-white text-xs font-medium">
                                {pendatang.namaLengkap.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900 truncate">{pendatang.namaLengkap}</p>
                                {calculateAge(pendatang.tanggalLahir) !== null && (
                                  <Badge className={cn('text-[10px] px-1.5 py-0 h-5 font-medium shrink-0', 'bg-gray-100 text-gray-500')}>
                                    {calculateAge(pendatang.tanggalLahir)} thn
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                {pendatang.nik || 'NIK tidak tersedia'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600 max-w-xs truncate">{pendatang.alamatAsal}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600 max-w-xs truncate">{pendatang.tujuanKedatangan}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">{formatDate(pendatang.tanggalDatang)}</p>
                          {pendatang.tanggalPulang && (
                            <p className="text-xs text-gray-400">Pulang: {formatDate(pendatang.tanggalPulang)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600">
                            RT {pendatang.rt}/RW {pendatang.rw} - {pendatang.dusun}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={pendatang.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                            {pendatang.isActive ? 'Aktif' : 'Sudah Pulang'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(pendatang)}
                              className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(pendatang)}
                              className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
                            >
                              <Edit2 className="w-4 h-4" />
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
                                {pendatang.isActive && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedPendatang(pendatang);
                                      setShowPulangConfirm(true);
                                    }}
                                    className="text-amber-700"
                                  >
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Catat Pulang
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedPendatang(pendatang);
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

      {/* Add/Edit Pendatang Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100">
                <UserCheck className="w-4 h-4 text-emerald-600" />
              </div>
              {editingPendatang ? 'Edit Pendatang' : 'Tambah Pendatang Baru'}
              {editingPendatang && (
                <Badge className={editingPendatang.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                  {editingPendatang.isActive ? 'Aktif' : 'Sudah Pulang'}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingPendatang
                ? `Edit data pendatang sementara ${editingPendatang.namaLengkap}`
                : 'Lengkapi data pendatang sementara baru di desa'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Data Pribadi */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-blue-100">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-700">Data Pribadi</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                <div className="space-y-1.5">
                  <Label htmlFor="nik" className="text-xs">NIK</Label>
                  <Input
                    id="nik"
                    value={formData.nik}
                    onChange={(e) =>
                      setFormData({ ...formData, nik: e.target.value.replace(/\D/g, '').slice(0, 16) })
                    }
                    placeholder="16 digit NIK (opsional)"
                    className="h-9"
                  />
                  {formData.nik && formData.nik.length > 0 && formData.nik.length < 16 && (
                    <p className="text-[11px] text-amber-500">NIK harus 16 digit</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="namaLengkap" className="text-xs">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="namaLengkap"
                    value={formData.namaLengkap}
                    onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
                    placeholder="Nama lengkap"
                    className={cn('h-9', formErrors.namaLengkap && 'border-red-500')}
                  />
                  {formErrors.namaLengkap && (
                    <p className="text-[11px] text-red-500">{formErrors.namaLengkap}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tempatLahir" className="text-xs">Tempat Lahir</Label>
                  <Input
                    id="tempatLahir"
                    value={formData.tempatLahir}
                    onChange={(e) => setFormData({ ...formData, tempatLahir: e.target.value })}
                    placeholder="Kota/Kabupaten"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tanggalLahir" className="text-xs">Tanggal Lahir</Label>
                  <Input
                    id="tanggalLahir"
                    type="date"
                    value={formData.tanggalLahir}
                    onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
                    className="h-9"
                  />
                  {calculateAge(formData.tanggalLahir || null) !== null && formData.tanggalLahir && (
                    <p className="text-[11px] text-gray-400">Usia: {calculateAge(formData.tanggalLahir || null)} tahun</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Jenis Kelamin <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.jenisKelamin}
                    onValueChange={(value) => setFormData({ ...formData, jenisKelamin: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Pilih jenis kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LAKI_LAKI">Laki-laki</SelectItem>
                      <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <SearchableCombobox
                    value={formData.pekerjaan}
                    onChange={(v) => setFormData({ ...formData, pekerjaan: v })}
                    options={pekerjaanGroups}
                    placeholder="Pilih pekerjaan..."
                    searchPlaceholder="Ketik pekerjaan..."
                    emptyMessage="Pekerjaan tidak ditemukan"
                    label="Pekerjaan"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="noTelp" className="text-xs">No. Telepon</Label>
                  <Input
                    id="noTelp"
                    value={formData.noTelp}
                    onChange={(e) => setFormData({ ...formData, noTelp: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Data Kedatangan */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-teal-100">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-700">Data Kedatangan</h4>
              </div>
              <div className="space-y-3 pl-7">
                <div className="space-y-1.5">
                  <Label htmlFor="alamatAsal" className="text-xs">
                    Alamat Asal <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="alamatAsal"
                    value={formData.alamatAsal}
                    onChange={(e) => setFormData({ ...formData, alamatAsal: e.target.value })}
                    placeholder="Alamat asal lengkap (Desa/Kelurahan, Kecamatan, Kabupaten/Kota, Provinsi)"
                    rows={3}
                    className={cn('resize-none', formErrors.alamatAsal && 'border-red-500')}
                  />
                  {formErrors.alamatAsal && (
                    <p className="text-[11px] text-red-500">{formErrors.alamatAsal}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tujuanKedatangan" className="text-xs">
                    Tujuan Kedatangan <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="tujuanKedatangan"
                    value={formData.tujuanKedatangan}
                    onChange={(e) => setFormData({ ...formData, tujuanKedatangan: e.target.value })}
                    placeholder="Contoh: Mengunjungi keluarga, menunggu kelahiran cucu, tugas kerja, dll"
                    rows={3}
                    className={cn('resize-none', formErrors.tujuanKedatangan && 'border-red-500')}
                  />
                  {formErrors.tujuanKedatangan && (
                    <p className="text-[11px] text-red-500">{formErrors.tujuanKedatangan}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 3: Waktu Kedatangan & Kepulangan */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-100">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-700">Waktu Kedatangan & Kepulangan</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                <div className="space-y-1.5">
                  <Label htmlFor="tanggalDatang" className="text-xs">Tanggal Datang</Label>
                  <Input
                    id="tanggalDatang"
                    type="date"
                    value={formData.tanggalDatang}
                    onChange={(e) => setFormData({ ...formData, tanggalDatang: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tanggalPulang" className="text-xs">Tanggal Pulang</Label>
                  <Input
                    id="tanggalPulang"
                    type="date"
                    value={formData.tanggalPulang}
                    onChange={(e) => setFormData({ ...formData, tanggalPulang: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="lamaTinggal" className="text-xs">Lama Tinggal</Label>
                  <div className="relative">
                    <Input
                      id="lamaTinggal"
                      value={formData.lamaTinggal}
                      onChange={(e) => setFormData({ ...formData, lamaTinggal: e.target.value })}
                      placeholder={computedDuration || 'Contoh: 2 bulan'}
                      className={cn('h-9', computedDuration && !formData.lamaTinggal && 'text-gray-400')}
                    />
                    {computedDuration && !formData.lamaTinggal && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                          {formData.tanggalPulang ? 'otomatis' : 'sampai sekarang'}
                        </span>
                      </div>
                    )}
                  </div>
                  {computedDuration && !formData.lamaTinggal && (
                    <p className="text-[11px] text-emerald-600">
                      {formData.tanggalPulang
                        ? `Durasi: ${computedDuration}`
                        : `Sudah ${computedDuration} di desa`
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 4: Lokasi di Desa */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-green-100">
                  <Home className="w-3.5 h-3.5 text-green-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-700">Lokasi di Desa</h4>
              </div>
              <div className="space-y-3 pl-7">
                <div className="space-y-1.5">
                  <Label className="text-xs">Wilayah (RT/RW/Dusun)</Label>
                  <Select
                    value={formData.rtId}
                    onValueChange={(value) => {
                      const selectedOpt = wilayahOptions.find(o => o.id === value);
                      setFormData({
                        ...formData,
                        rtId: value,
                        dusunId: selectedOpt?.dusunId || '',
                      });
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Pilih wilayah tempat tinggal..." />
                    </SelectTrigger>
                    <SelectContent>
                      {wilayahOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="alamat" className="text-xs">Alamat Detail di Desa</Label>
                  <Input
                    id="alamat"
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    placeholder="Nama jalan, RT/RW, atau patokan lokasi"
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 5: Keterangan */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-gray-100">
                  <FileText className="w-3.5 h-3.5 text-gray-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-700">Keterangan Tambahan</h4>
              </div>
              <div className="pl-7">
                <Textarea
                  id="keterangan"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Catatan tambahan (opsional)"
                  rows={2}
                  className="resize-none"
                />
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
                {submitting && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                {editingPendatang ? 'Update' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Pendatang</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus data {selectedPendatang?.namaLengkap}? 
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

      {/* Catat Pulang Confirmation */}
      <Dialog open={showPulangConfirm} onOpenChange={setShowPulangConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Catat Kepulangan</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mencatat bahwa <strong>{selectedPendatang?.namaLengkap}</strong> sudah pulang dari desa?
              Status akan diubah menjadi "Sudah Pulang" dengan tanggal hari ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPulangConfirm(false)}
            >
              Batal
            </Button>
            <Button
              onClick={handleCatatPulang}
              disabled={submitting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              <LogOut className="w-4 h-4 mr-2" />
              Catat Pulang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Pendatang</DialogTitle>
            <DialogDescription>Data lengkap pendatang sementara</DialogDescription>
          </DialogHeader>
          {detailData && (
            <div className="space-y-4">
              {/* Header Card */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-lg font-medium">
                    {detailData.namaLengkap.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 truncate">{detailData.namaLengkap}</h3>
                    {calculateAge(detailData.tanggalLahir) !== null && (
                      <Badge className="text-[10px] px-1.5 py-0 h-5 bg-gray-100 text-gray-500">
                        {calculateAge(detailData.tanggalLahir)} thn
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{detailData.nik || 'NIK tidak tersedia'}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={detailData.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                      {detailData.isActive ? 'Aktif' : 'Sudah Pulang'}
                    </Badge>
                    {detailData.tanggalDatang && !detailData.tanggalPulang && detailData.isActive && (
                      <span className="text-xs text-gray-400">
                        Sudah {calculateDuration(detailData.tanggalDatang?.split('T')[0] || '')} di desa
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Data Pribadi */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-blue-100">
                    <User className="w-3 h-3 text-blue-600" />
                  </div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Pribadi</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <p className="text-xs text-gray-400">Jenis Kelamin</p>
                    <p className="text-sm font-medium">
                      {detailData.jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Pekerjaan</p>
                    <p className="text-sm font-medium">{detailData.pekerjaan || '-'}</p>
                  </div>
                  {(detailData.tempatLahir || detailData.tanggalLahir) && (
                    <div>
                      <p className="text-xs text-gray-400">Tempat, Tgl Lahir</p>
                      <p className="text-sm font-medium">
                        {detailData.tempatLahir || '-'}
                        {detailData.tempatLahir && detailData.tanggalLahir ? ', ' : ''}
                        {detailData.tanggalLahir ? formatDate(detailData.tanggalLahir) : ''}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-400">No. Telepon</p>
                    <p className="text-sm font-medium">{detailData.noTelp || '-'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Data Kedatangan */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-teal-100">
                    <MapPin className="w-3 h-3 text-teal-600" />
                  </div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Kedatangan</h4>
                </div>
                <div className="space-y-2 pl-6">
                  <div>
                    <p className="text-xs text-gray-400">Alamat Asal</p>
                    <p className="text-sm font-medium">{detailData.alamatAsal}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Tujuan Kedatangan</p>
                    <p className="text-sm font-medium">{detailData.tujuanKedatangan}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Waktu */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-100">
                    <Calendar className="w-3 h-3 text-amber-600" />
                  </div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <p className="text-xs text-gray-400">Tanggal Datang</p>
                    <p className="text-sm font-medium">{formatDate(detailData.tanggalDatang)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Tanggal Pulang</p>
                    <p className="text-sm font-medium">{formatDate(detailData.tanggalPulang)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Lama Tinggal</p>
                    <p className="text-sm font-medium">
                      {detailData.lamaTinggal
                        ? detailData.lamaTinggal
                        : calculateDuration(
                            detailData.tanggalDatang?.split('T')[0] || '',
                            detailData.tanggalPulang?.split('T')[0] || undefined
                          ) || '-'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Lokasi */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-green-100">
                    <Home className="w-3 h-3 text-green-600" />
                  </div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Lokasi di Desa</h4>
                </div>
                <div className="pl-6">
                  <p className="text-xs text-gray-400">Alamat</p>
                  <p className="text-sm font-medium">
                    {detailData.alamat
                      ? `${detailData.alamat}, RT ${detailData.rt}/RW ${detailData.rw} - ${detailData.dusun}`
                      : `RT ${detailData.rt}/RW ${detailData.rw} - ${detailData.dusun}`
                    }
                  </p>
                </div>
              </div>

              {detailData.keterangan && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-gray-100">
                        <FileText className="w-3 h-3 text-gray-600" />
                      </div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Keterangan</h4>
                    </div>
                    <div className="pl-6">
                      <p className="text-sm font-medium">{detailData.keterangan}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
