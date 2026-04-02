'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BookOpen, Search, Filter, Eye, Printer, RefreshCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Loader2, AlertTriangle, Hash, FileText, Calendar,
  ArrowUpDown, ArrowUp, ArrowDown, Inbox, Download,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { Separator } from '@/components/ui/separator';
import { SuratStatusBadge } from './surat-status-badge';
import { SuratDetail } from './surat-detail';
import { getKategoriLabel } from '@/lib/surat-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ============ TYPES ============

interface SuratRegisterItem {
  id: string;
  nomorSurat: string | null;
  nomorRegister: number | null;
  nomorRegisterFmt: string | null;
  jenisSurat: { id: string; kode: string; nama: string; kategori: string };
  pemohon: { id: string; namaLengkap: string; nik: string } | null;
  pemohonNama: string;
  pemohonNIK: string | null;
  status: string;
  createdAt: string;
  tanggalAjukan: string | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RegisterStats {
  tahun: number;
  totalSurat: number;
  nomorRegisterTerakhir: number;
}

interface DesaInfo {
  namaDesa: string;
  kodeDesaSurat: string | null;
  kecamatan: string | null;
  kabupaten: string | null;
  provinsi: string | null;
}

type SortField = 'nomorRegister' | 'nomorSurat' | 'jenisSurat' | 'pemohonNama' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface SuratRegisterBukuProps {
  onNavigate?: (menu: string) => void;
}

// ============ CONSTANTS ============

const KATEGORI_OPTIONS = [
  { value: 'KEPENDUDUKAN', label: 'Kependudukan' },
  { value: 'PENGANTAR', label: 'Surat Pengantar' },
  { value: 'KETERANGAN', label: 'Surat Keterangan' },
  { value: 'PERNYATAAN', label: 'Surat Pernyataan' },
  { value: 'TANAH_PROPERTI', label: 'Tanah & Properti' },
  { value: 'KEUANGAN', label: 'Keuangan' },
  { value: 'LEMBAGA', label: 'Lembaga' },
];

const STATUS_OPTIONS = [
  { value: 'DIAJUKAN', label: 'Diajukan' },
  { value: 'DIVERIFIKASI', label: 'Diverifikasi' },
  { value: 'DIPROSES', label: 'Diproses' },
  { value: 'DICETAK', label: 'Dicetak' },
  { value: 'DITANDATANGANI', label: 'Ditandatangani' },
  { value: 'SELESAI', label: 'Selesai' },
  { value: 'DITOLAK', label: 'Ditolak' },
  { value: 'DIBATALKAN', label: 'Dibatalkan' },
];

// Generate year options (current year -5 to current year +1)
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    years.push(y);
  }
  return years;
}

// ============ HELPERS ============

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function formatDateFull(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

// ============ MAIN COMPONENT ============

export function SuratRegisterBuku({ onNavigate }: SuratRegisterBukuProps) {
  const currentYear = new Date().getFullYear();

  const [suratList, setSuratList] = useState<SuratRegisterItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1, limit: 20, total: 0, totalPages: 0,
  });
  const [stats, setStats] = useState<RegisterStats | null>(null);
  const [desaInfo, setDesaInfo] = useState<DesaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Filters
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [searchQuery, setSearchQuery] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Sort
  const [sortField, setSortField] = useState<SortField>('nomorRegister');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Dialog
  const [detailSuratId, setDetailSuratId] = useState<string | null>(null);

  // Search debounce
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRegister = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('tahun', String(selectedYear));
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));

      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (kategoriFilter !== 'ALL') params.set('kategori', kategoriFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const response = await fetch(`/api/surat/register?${params.toString()}`);
      if (!response.ok) throw new Error('Gagal mengambil data');
      const result = await response.json();

      if (result.success) {
        let data = result.data as SuratRegisterItem[];

        // Client-side sorting
        data = [...data].sort((a, b) => {
          let aVal: string | number = '';
          let bVal: string | number = '';
          switch (sortField) {
            case 'nomorRegister':
              aVal = a.nomorRegister ?? Infinity;
              bVal = b.nomorRegister ?? Infinity;
              break;
            case 'nomorSurat':
              aVal = a.nomorSurat || 'zzz';
              bVal = b.nomorSurat || 'zzz';
              break;
            case 'jenisSurat':
              aVal = a.jenisSurat.nama;
              bVal = b.jenisSurat.nama;
              break;
            case 'pemohonNama':
              aVal = a.pemohonNama;
              bVal = b.pemohonNama;
              break;
            case 'status':
              aVal = a.status;
              bVal = b.status;
              break;
            case 'createdAt':
              aVal = a.createdAt;
              bVal = b.createdAt;
              break;
          }
          if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });

        setSuratList(data);
        setPagination(result.pagination);
        setStats(result.stats);
        setDesaInfo(result.desaInfo);
        if (result.statusCounts) {
          setStatusCounts(result.statusCounts);
        }
      } else {
        setError(result.error || 'Gagal memuat data register');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, pagination.page, pagination.limit, searchQuery, kategoriFilter, statusFilter, sortField, sortOrder]);

  useEffect(() => {
    fetchRegister();
  }, [fetchRegister]);

  // Search debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);
  };

  // Sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Handle year change
  const handleYearChange = (year: number) => {
    setSelectedYear(year);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // After dialog close
  const handleDialogClose = () => {
    setDetailSuratId(null);
    fetchRegister();
  };

  // Sort header renderer
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-gray-800 transition-colors"
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          {isActive ? (
            sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-30" />
          )}
        </span>
      </th>
    );
  };

  // Compute row number (accounting for pagination and sorting)
  const getRowNumber = (index: number): number => {
    return (pagination.page - 1) * pagination.limit + index + 1;
  };

  // ============ LOADING STATE ============

  if (loading && !suratList.length) {
    return (
      <div className="p-6 space-y-6 print:p-0">
        {/* Header skeleton */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-[160px]" />
          </div>
        </div>

        {/* Table skeleton */}
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      <Skeleton className="h-3 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ============ ERROR STATE ============

  if (error && !suratList.length) {
    return (
      <div className="p-6 print:p-0">
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat Data</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchRegister} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  // ============ MAIN RENDER ============

  return (
    <div className="p-6 space-y-5 print:p-0 print:space-y-4">
      {/* ===== HEADER ===== */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Buku Register Surat</h2>
            <p className="text-sm text-gray-500 mt-1">
              Catatan register seluruh surat desa per tahun
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" size="sm" onClick={fetchRegister} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Segarkan
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Cetak
          </Button>
        </div>
      </motion.div>

      {/* ===== PRINT HEADER (visible only in print) ===== */}
      <div className="hidden print:block text-center mb-6">
        {desaInfo && (
          <>
            <h2 className="text-lg font-bold uppercase">Pemerintah {desaInfo.kabupaten || ''}</h2>
            <h1 className="text-xl font-bold uppercase">{desaInfo.namaDesa}</h1>
            <p className="text-sm">Kecamatan {desaInfo.kecamatan || ''}, {desaInfo.provinsi || ''}</p>
            <Separator className="my-2" />
          </>
        )}
        <h3 className="text-base font-bold mt-2">BUKU REGISTER SURAT TAHUN {selectedYear}</h3>
        <p className="text-xs mt-1">
          Dicetak pada: {formatDateFull(new Date().toISOString())}
        </p>
      </div>

      {/* ===== STATS SUMMARY ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 no-print"
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-100 shrink-0">
                <FileText className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Total Surat</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalSurat.toLocaleString('id-ID') || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 shrink-0">
                <Hash className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Register Terakhir</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.nomorRegisterTerakhir?.toLocaleString('id-ID') || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 shrink-0">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Tahun</p>
                <p className="text-2xl font-bold text-gray-900">{selectedYear}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== SEARCH & FILTERS ===== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="no-print"
      >
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Year Filter */}
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => handleYearChange(parseInt(v, 10))}
              >
                <SelectTrigger className="w-full sm:w-[130px]">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Tahun" />
                </SelectTrigger>
                <SelectContent>
                  {getYearOptions().map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Cari no. register, no. surat, nama, jenis..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>

              {/* Kategori Filter */}
              <Select value={kategoriFilter} onValueChange={(v) => {
                setKategoriFilter(v);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="w-4 h-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Kategori</SelectItem>
                  {KATEGORI_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(v) => {
                setStatusFilter(v);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== TABLE ===== */}
      {suratList.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Tidak Ada Data Register</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {searchQuery || kategoriFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Tidak ditemukan surat yang sesuai dengan filter.'
                : `Belum ada surat yang terdaftar di tahun ${selectedYear}.`}
            </p>
            {(searchQuery || kategoriFilter !== 'ALL' || statusFilter !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 no-print"
                onClick={() => {
                  setSearchQuery('');
                  setKategoriFilter('ALL');
                  setStatusFilter('ALL');
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                Reset Filter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-12">
                      No
                    </th>
                    <SortHeader field="nomorRegister">No. Register</SortHeader>
                    <SortHeader field="nomorSurat">No. Surat</SortHeader>
                    <SortHeader field="jenisSurat">Jenis Surat</SortHeader>
                    <SortHeader field="pemohonNama">Pemohon</SortHeader>
                    <SortHeader field="createdAt">Tanggal</SortHeader>
                    <SortHeader field="status">Status</SortHeader>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider no-print">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <AnimatePresence>
                    {suratList.map((surat, idx) => (
                      <motion.tr
                        key={surat.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, delay: idx * 0.02 }}
                        className={cn(
                          'transition-colors hover:bg-gray-50 print:hover:bg-transparent',
                          idx % 2 === 1 && 'bg-gray-50/30 print:bg-transparent',
                        )}
                      >
                        {/* Row Number */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500 font-medium">
                            {getRowNumber(idx)}
                          </span>
                        </td>

                        {/* Nomor Register */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono font-semibold text-teal-700">
                            {surat.nomorRegisterFmt || (surat.nomorRegister ? String(surat.nomorRegister) : '-')}
                          </span>
                        </td>

                        {/* Nomor Surat */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-gray-700">
                            {surat.nomorSurat || '-'}
                          </span>
                        </td>

                        {/* Jenis Surat */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{surat.jenisSurat.nama}</p>
                            <p className="text-[11px] text-gray-400">{getKategoriLabel(surat.jenisSurat.kategori)}</p>
                          </div>
                        </td>

                        {/* Pemohon */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm text-gray-800">{surat.pemohonNama}</p>
                            {surat.pemohonNIK && (
                              <p className="text-[11px] text-gray-400 font-mono">{surat.pemohonNIK}</p>
                            )}
                          </div>
                        </td>

                        {/* Tanggal */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">
                            {formatDate(surat.createdAt)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <SuratStatusBadge status={surat.status} size="sm" />
                        </td>

                        {/* Aksi */}
                        <td className="px-4 py-3 text-right no-print">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={() => setDetailSuratId(surat.id)}
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Detail
                          </Button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="no-print">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
                />
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* ===== DETAIL DIALOG ===== */}
      <Dialog open={!!detailSuratId} onOpenChange={() => setDetailSuratId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailSuratId && (
            <SuratDetail
              suratId={detailSuratId}
              onRefresh={handleDialogClose}
              onClose={() => setDetailSuratId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============ PAGINATION COMPONENT ============

function Pagination({ page, totalPages, total, limit, onPageChange }: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}) {
  const pages: (number | 'ellipsis')[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  const fromItem = (page - 1) * limit + 1;
  const toItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Menampilkan {fromItem}-{toItem} dari {total} surat
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(1)}
          disabled={page <= 1}
        >
          <ChevronsLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`el-${idx}`} className="px-1 text-gray-400 text-xs">...</span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages}
        >
          <ChevronsRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
