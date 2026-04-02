'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Filter, Plus, FileText, Eye, CheckCircle2, XCircle,
  Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Printer,
  RotateCcw, Clock, LayoutGrid, List as ListIcon, RefreshCw,
  Inbox,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { SuratStatusBadge } from './surat-status-badge';
import { SuratDetail } from './surat-detail';
import { SuratProsesDialog } from './surat-proses-dialog';
import { SuratApproveDialog } from './surat-approve-dialog';
import { getKategoriLabel } from '@/lib/surat-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

// ============ TYPES ============

interface SuratItem {
  id: string;
  nomorSurat: string | null;
  nomorRegisterFmt: string | null;
  nomorRegister: number | null;
  jenisSurat: { id: string; kode: string; nama: string; kategori: string };
  pemohon: { id: string; namaLengkap: string; nik: string } | null;
  pemohonNama: string;
  pemohonNIK: string | null;
  status: string;
  createdAt: string;
  tanggalAjukan: string | null;
  tanggalSelesai: string | null;
  operator: { id: string; namaLengkap: string; username: string } | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type SortField = 'nomorSurat' | 'jenisSurat' | 'pemohonNama' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

interface SuratListProps {
  onNavigate?: (menu: string) => void;
}

// ============ STATUS TABS ============

const STATUS_TABS = [
  { id: 'ALL', label: 'Semua' },
  { id: 'DRAFT', label: 'Draft' },
  { id: 'DIAJUKAN', label: 'Menunggu' },
  { id: 'DIVERIFIKASI', label: 'Diverifikasi' },
  { id: 'DIPROSES', label: 'Diproses' },
  { id: 'DICETAK', label: 'Dicetak' },
  { id: 'SELESAI', label: 'Selesai' },
  { id: 'DITOLAK', label: 'Ditolak' },
  { id: 'DIBATALKAN', label: 'Batal' },
];

const KATEGORI_OPTIONS = [
  { value: 'KEPENDUDUKAN', label: 'Kependudukan' },
  { value: 'PENGANTAR', label: 'Surat Pengantar' },
  { value: 'KETERANGAN', label: 'Surat Keterangan' },
  { value: 'PERNYATAAN', label: 'Surat Pernyataan' },
  { value: 'TANAH_PROPERTI', label: 'Tanah & Properti' },
  { value: 'KEUANGAN', label: 'Keuangan' },
  { value: 'LEMBAGA', label: 'Lembaga' },
];

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

// ============ MAIN COMPONENT ============

export function SuratList({ onNavigate }: SuratListProps) {
  const [suratList, setSuratList] = useState<SuratItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('ALL');
  const [kategoriFilter, setKategoriFilter] = useState('ALL');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // Dialogs
  const [detailSuratId, setDetailSuratId] = useState<string | null>(null);
  const [prosesSuratId, setProsesSuratId] = useState<string | null>(null);
  const [approveSuratId, setApproveSuratId] = useState<string | null>(null);

  // Search debounce
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSurat = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));

      if (activeStatus !== 'ALL') params.set('status', activeStatus);
      if (kategoriFilter !== 'ALL') params.set('kategori', kategoriFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (tanggalMulai) params.set('tanggalMulai', tanggalMulai);
      if (tanggalSelesai) params.set('tanggalSelesai', tanggalSelesai);

      const response = await fetch(`/api/surat?${params.toString()}`);
      if (!response.ok) throw new Error('Gagal mengambil data');
      const result = await response.json();

      if (result.success) {
        // Client-side sorting
        let data = result.data as SuratItem[];
        data = [...data].sort((a, b) => {
          let aVal: string | number = '';
          let bVal: string | number = '';
          switch (sortField) {
            case 'nomorSurat':
              aVal = a.nomorSurat || '';
              bVal = b.nomorSurat || '';
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
        if (result.statusCounts) {
          setStatusCounts(result.statusCounts);
        }
      }
    } catch {
      toast.error('Gagal memuat data surat');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, activeStatus, kategoriFilter, searchQuery, tanggalMulai, tanggalSelesai, sortField, sortOrder]);

  useEffect(() => {
    fetchSurat();
  }, [fetchSurat]);

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

  // Refresh
  const handleRefresh = () => {
    fetchSurat();
  };

  // After dialog actions
  const handleDialogClose = () => {
    setDetailSuratId(null);
    setProsesSuratId(null);
    setApproveSuratId(null);
    fetchSurat();
  };

  // Render sort header
  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const isActive = sortField === field;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:text-gray-800"
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

  // Get total for active filter
  const getStatusCount = (status: string): number => {
    if (status === 'ALL') {
      return Object.values(statusCounts).reduce((sum, c) => sum + c, 0);
    }
    return statusCounts[status] || 0;
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daftar Surat</h2>
          <p className="text-sm text-gray-500 mt-1">
            Kelola semua surat yang masuk dan keluar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Segarkan
          </Button>
          <Button size="sm" onClick={() => onNavigate?.('surat-ajukan')}>
            <Plus className="w-4 h-4 mr-2" />
            Ajukan Surat
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="overflow-x-auto -mx-6 px-6">
        <div className="flex gap-1 min-w-max">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveStatus(tab.id);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                activeStatus === tab.id
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {tab.label}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                activeStatus === tab.id
                  ? 'bg-emerald-200 text-emerald-800'
                  : 'bg-gray-200 text-gray-500',
              )}>
                {getStatusCount(tab.id)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nomor surat, nama pemohon, jenis surat..."
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

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-full sm:w-[150px]"
                value={tanggalMulai}
                onChange={(e) => {
                  setTanggalMulai(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="Dari"
              />
              <span className="text-xs text-gray-400 shrink-0">-</span>
              <Input
                type="date"
                className="w-full sm:w-[150px]"
                value={tanggalSelesai}
                onChange={(e) => {
                  setTanggalSelesai(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="Sampai"
              />
            </div>

            {/* View Toggle */}
            <div className="hidden lg:flex items-center border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'table' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100',
                )}
              >
                <ListIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'card' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100',
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="rounded-lg border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <th key={i} className="px-4 py-3">
                      <Skeleton className="h-3 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 6 }).map((_, j) => (
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
      ) : suratList.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Tidak Ada Surat</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              {searchQuery || activeStatus !== 'ALL' || kategoriFilter !== 'ALL'
                ? 'Tidak ditemukan surat yang sesuai dengan filter.'
                : 'Belum ada surat yang diajukan. Klik tombol Ajukan Surat untuk memulai.'}
            </p>
            {(searchQuery || activeStatus !== 'ALL' || kategoriFilter !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setActiveStatus('ALL');
                  setKategoriFilter('ALL');
                  setTanggalMulai('');
                  setTanggalSelesai('');
                }}
              >
                Reset Filter
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        /* Desktop Table View */
        <Card className="border-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <SortHeader field="createdAt">No. Register</SortHeader>
                  <SortHeader field="nomorSurat">No. Surat</SortHeader>
                  <SortHeader field="jenisSurat">Jenis Surat</SortHeader>
                  <SortHeader field="pemohonNama">Pemohon</SortHeader>
                  <SortHeader field="status">Status</SortHeader>
                  <SortHeader field="createdAt">Tanggal</SortHeader>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suratList.map((surat, idx) => (
                  <tr
                    key={surat.id}
                    className={cn(
                      'transition-colors hover:bg-gray-50',
                      idx % 2 === 1 && 'bg-gray-50/30',
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-600">
                        {surat.nomorRegisterFmt || surat.nomorRegister || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-800">
                        {surat.nomorSurat || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{surat.jenisSurat.nama}</p>
                        <p className="text-[11px] text-gray-400">{getKategoriLabel(surat.jenisSurat.kategori)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-800">{surat.pemohonNama}</p>
                        {surat.pemohonNIK && (
                          <p className="text-[11px] text-gray-400 font-mono">{surat.pemohonNIK}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SuratStatusBadge status={surat.status} size="sm" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">
                        {formatDate(surat.createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetailSuratId(surat.id)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
                          {(surat.status === 'DIAJUKAN' || surat.status === 'DIVERIFIKASI') && (
                            <DropdownMenuItem onClick={() => setProsesSuratId(surat.id)}>
                              <Loader2 className="w-4 h-4 mr-2" />
                              Proses
                            </DropdownMenuItem>
                          )}
                          {(surat.status === 'DIPROSES' || surat.status === 'DICETAK') && (
                            <>
                              <DropdownMenuItem onClick={() => setApproveSuratId(surat.id)}>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Setujui
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setApproveSuratId(surat.id)} className="text-red-600">
                                <XCircle className="w-4 h-4 mr-2" />
                                Tolak
                              </DropdownMenuItem>
                            </>
                          )}
                          {(surat.status === 'SELESAI' || surat.status === 'DITANDATANGANI' || surat.status === 'DICETAK') && (
                            <DropdownMenuItem onClick={() => {
                              window.open(`/api/surat/${surat.id}/pdf`, '_blank');
                            }}>
                              <Printer className="w-4 h-4 mr-2" />
                              Cetak
                            </DropdownMenuItem>
                          )}
                          {surat.status === 'DITOLAK' && (
                            <DropdownMenuItem onClick={() => setProsesSuratId(surat.id)}>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Ajukan Ulang
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
            />
          )}
        </Card>
      ) : (
        /* Mobile/Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {suratList.map((surat) => (
              <motion.div
                key={surat.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card
                  className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setDetailSuratId(surat.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">{surat.jenisSurat.nama}</p>
                        <p className="text-[11px] text-gray-400">{getKategoriLabel(surat.jenisSurat.kategori)}</p>
                      </div>
                      <SuratStatusBadge status={surat.status} size="sm" />
                    </div>
                    <Separator className="mb-3" />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Pemohon</span>
                        <span className="text-gray-700 font-medium text-right truncate ml-2">{surat.pemohonNama}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">No. Surat</span>
                        <span className="text-gray-700 font-mono text-xs">{surat.nomorSurat || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tanggal</span>
                        <span className="text-gray-700">{formatDate(surat.createdAt)}</span>
                      </div>
                    </div>
                    <Separator className="my-3" />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailSuratId(surat.id);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Detail
                      </Button>
                      {(surat.status === 'DIAJUKAN' || surat.status === 'DIVERIFIKASI') && (
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProsesSuratId(surat.id);
                          }}
                        >
                          <Loader2 className="w-3 h-3 mr-1" />
                          Proses
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailSuratId} onOpenChange={() => setDetailSuratId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detailSuratId && (
            <SuratDetail
              suratId={detailSuratId}
              onProses={(id) => { setDetailSuratId(null); setProsesSuratId(id); }}
              onApprove={(id) => { setDetailSuratId(null); setApproveSuratId(id); }}
              onRefresh={handleRefresh}
              onClose={() => setDetailSuratId(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Proses Dialog */}
      <SuratProsesDialog
        suratId={prosesSuratId}
        open={!!prosesSuratId}
        onClose={handleDialogClose}
      />

      {/* Approve Dialog */}
      <SuratApproveDialog
        suratId={approveSuratId}
        open={!!approveSuratId}
        onClose={handleDialogClose}
      />
    </div>
  );
}

// ============ PAGINATION ============

function Pagination({ page, totalPages, total, onPageChange }: {
  page: number;
  totalPages: number;
  total: number;
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

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Menampilkan {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} dari {total} surat
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
