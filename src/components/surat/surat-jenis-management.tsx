'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, FileText, Edit, RefreshCw, Loader2, ShieldCheck,
  ShieldAlert, ToggleLeft, ToggleRight, AlertTriangle, Inbox,
  X, Check, Hash, ChevronDown, LayoutGrid, List as ListIcon,
  MoreHorizontal, Archive, Settings2, FileCheck, Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/loading-skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { cn } from '@/lib/utils';
import { getKategoriLabel, getTingkatApprovalLabel } from '@/lib/surat-utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ============ TYPES ============

interface SuratJenisItem {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  tingkatApproval: string;
  deskripsi: string | null;
  persyaratan: string | null;
  fieldTemplate: string | null;
  isActive: boolean;
  urutan: number;
  desaId: string;
  desa: { id: string; namaDesa: string; slug: string } | null;
  suratTemplate: { id: string; nama: string } | null;
  _count: { surat: number };
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SessionUser {
  id: string;
  namaLengkap: string;
  username: string;
  email: string;
  role: string;
  desaId: string | null;
  desa: { id: string; namaDesa: string; slug: string; kodeDesa: string } | null;
}

interface FormData {
  kode: string;
  nama: string;
  kategori: string;
  tingkatApproval: string;
  deskripsi: string;
  persyaratan: string;
  isActive: boolean;
}

interface SuratJenisManagementProps {
  onNavigate?: (menu: string) => void;
}

// ============ CONSTANTS ============

const KATEGORI_TABS = [
  { value: '', label: 'Semua' },
  { value: 'KEPENDUDUKAN', label: 'Kependudukan' },
  { value: 'PENGANTAR', label: 'Pengantar' },
  { value: 'KETERANGAN', label: 'Keterangan' },
  { value: 'PERNYATAAN', label: 'Pernyataan' },
  { value: 'TANAH_PROPERTI', label: 'Tanah & Properti' },
  { value: 'KEUANGAN', label: 'Keuangan' },
  { value: 'LEMBAGA', label: 'Lembaga' },
];

const KATEGORI_COLORS: Record<string, string> = {
  KEPENDUDUKAN: 'bg-blue-50 text-blue-700 border-blue-200',
  PENGANTAR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  KETERANGAN: 'bg-purple-50 text-purple-700 border-purple-200',
  PERNYATAAN: 'bg-orange-50 text-orange-700 border-orange-200',
  TANAH_PROPERTI: 'bg-amber-50 text-amber-700 border-amber-200',
  KEUANGAN: 'bg-teal-50 text-teal-700 border-teal-200',
  LEMBAGA: 'bg-rose-50 text-rose-700 border-rose-200',
};

const EMPTY_FORM: FormData = {
  kode: '',
  nama: '',
  kategori: 'KEPENDUDUKAN',
  tingkatApproval: 'LANGSUNG_PROSES',
  deskripsi: '',
  persyaratan: '',
  isActive: true,
};

// ============ HELPERS ============

function parsePersyaratan(persyaratan: string | null): string[] {
  if (!persyaratan) return [];
  try {
    const parsed = JSON.parse(persyaratan);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return persyaratan.split('\n').filter(Boolean);
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

function generateAutoKode(kategori: string, existingCount: number): string {
  const prefix = kategori.slice(0, 3).toUpperCase();
  const num = String(existingCount + 1).padStart(3, '0');
  return `${prefix}-${num}`;
}

// ============ MAIN COMPONENT ============

export function SuratJenisManagement({ onNavigate }: SuratJenisManagementProps) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [data, setData] = useState<SuratJenisItem[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeKategori, setActiveKategori] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  // Dialogs
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<SuratJenisItem | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [confirmToggle, setConfirmToggle] = useState<SuratJenisItem | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdminDesaOrHigher = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN_DESA';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Fetch session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const result = await res.json();
          if (result.authenticated && result.user) {
            setUser(result.user);
          }
        }
      } catch {
        // Ignore
      }
    };
    fetchSession();
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', String(pagination.page));
      params.set('limit', String(pagination.limit));
      if (activeKategori) params.set('kategori', activeKategori);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/surat/jenis?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal mengambil data');
      const result = await res.json();

      if (result.success) {
        setData(result.data);
        setPagination(result.pagination);
      }
    } catch {
      toast.error('Gagal memuat data jenis surat');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, activeKategori, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Search debounce
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 500);
  };

  // Open add dialog
  const handleOpenAdd = () => {
    setEditingItem(null);
    const autoKode = generateAutoKode('KEPENDUDUKAN', data.length);
    setFormData({
      ...EMPTY_FORM,
      kode: autoKode,
    });
    setShowFormDialog(true);
  };

  // Open edit dialog
  const handleOpenEdit = (item: SuratJenisItem) => {
    setEditingItem(item);
    const persyaratanStr = parsePersyaratan(item.persyaratan).join('\n');
    setFormData({
      kode: item.kode,
      nama: item.nama,
      kategori: item.kategori,
      tingkatApproval: item.tingkatApproval,
      deskripsi: item.deskripsi || '',
      persyaratan: persyaratanStr,
      isActive: item.isActive,
    });
    setShowFormDialog(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    // Validate
    if (!formData.kode.trim()) {
      toast.error('Kode wajib diisi');
      return;
    }
    if (!formData.nama.trim()) {
      toast.error('Nama wajib diisi');
      return;
    }

    try {
      setSaving(true);

      const persyaratanArr = formData.persyaratan
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: Record<string, unknown> = {
        kode: formData.kode.trim(),
        nama: formData.nama.trim(),
        kategori: formData.kategori,
        tingkatApproval: formData.tingkatApproval,
        deskripsi: formData.deskripsi.trim() || null,
        persyaratan: persyaratanArr.length > 0 ? persyaratanArr : null,
        isActive: formData.isActive,
      };

      // Include desaId for creation
      if (!editingItem && user?.desaId) {
        payload.desaId = user.desaId;
      }
      if (!editingItem && isSuperAdmin && !user?.desaId) {
        toast.error('Super Admin harus memilih desa terlebih dahulu');
        return;
      }

      let res: Response;
      if (editingItem) {
        // Don't send desaId on update
        const { desaId: _d, ...updatePayload } = payload;
        void _d;
        res = await fetch(`/api/surat/jenis/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
      } else {
        res = await fetch('/api/surat/jenis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.error || 'Gagal menyimpan jenis surat');
        return;
      }

      toast.success(editingItem ? 'Jenis surat berhasil diperbarui' : 'Jenis surat berhasil ditambahkan');
      setShowFormDialog(false);
      setEditingItem(null);
      setFormData(EMPTY_FORM);
      fetchData();
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  };

  // Toggle isActive
  const handleToggleActive = async (item: SuratJenisItem) => {
    setTogglingId(item.id);
    try {
      const res = await fetch(`/api/surat/jenis/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        toast.error(result.error || 'Gagal mengubah status');
        return;
      }

      toast.success(item.isActive ? 'Jenis surat dinonaktifkan' : 'Jenis surat diaktifkan');
      setConfirmToggle(null);
      fetchData();
    } catch {
      toast.error('Terjadi kesalahan saat mengubah status');
    } finally {
      setTogglingId(null);
    }
  };

  // Copy kode
  const handleCopyKode = (kode: string) => {
    navigator.clipboard.writeText(kode).then(() => {
      toast.success('Kode berhasil disalin');
    }).catch(() => {
      toast.error('Gagal menyalin kode');
    });
  };

  // Count by kategori
  const getKategoriCount = (kategori: string): number => {
    if (!kategori) return pagination.total;
    return data.filter((d) => d.kategori === kategori).length;
  };

  // ============ RENDER ============

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Jenis Surat</h2>
          <p className="text-sm text-gray-500 mt-1">
            Kelola jenis-jenis surat yang tersedia di sistem desa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            Segarkan
          </Button>
          {isAdminDesaOrHigher && (
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Jenis Surat
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Total Jenis</p>
                    <p className="text-2xl font-bold text-emerald-700">{pagination.total}</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Aktif</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {data.filter((d) => d.isActive).length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <ToggleRight className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-gray-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Nonaktif</p>
                    <p className="text-2xl font-bold text-gray-700">
                      {data.filter((d) => !d.isActive).length}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <ToggleLeft className="w-5 h-5 text-gray-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Total Surat</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {data.reduce((sum, d) => sum + d._count.surat, 0)}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="overflow-x-auto -mx-6 px-6">
        <div className="flex gap-1.5 min-w-max">
          {KATEGORI_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setActiveKategori(tab.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap border',
                activeKategori === tab.value
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
              )}
            >
              {tab.label}
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  activeKategori === tab.value
                    ? 'bg-emerald-200 text-emerald-800'
                    : 'bg-gray-100 text-gray-500',
                )}
              >
                {getKategoriCount(tab.value)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search & View Toggle */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nama atau kode jenis surat..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <div className="flex items-center border rounded-lg overflow-hidden shrink-0">
              <button
                onClick={() => setViewMode('card')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'card'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100',
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={cn(
                  'p-2 transition-colors',
                  viewMode === 'table'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100',
                )}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-sm">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Tidak Ada Jenis Surat</h3>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                {searchQuery || activeKategori
                  ? 'Tidak ditemukan jenis surat yang sesuai dengan filter.'
                  : 'Belum ada jenis surat yang terdaftar. Klik tombol Tambah untuk menambahkan jenis surat baru.'}
              </p>
              {(searchQuery || activeKategori) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveKategori('');
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                >
                  Reset Filter
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {data.map((item) => (
              <SuratJenisCard
                key={item.id}
                item={item}
                isAdmin={isAdminDesaOrHigher}
                togglingId={togglingId}
                onEdit={() => handleOpenEdit(item)}
                onToggle={() => setConfirmToggle(item)}
                onCopyKode={() => handleCopyKode(item.kode)}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* Table View */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Card className="border-0 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Kode
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Approval
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Persyaratan
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Surat
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((item, idx) => (
                    <tr
                      key={item.id}
                      className={cn(
                        'transition-colors hover:bg-gray-50',
                        !item.isActive && 'opacity-60',
                        idx % 2 === 1 && 'bg-gray-50/30',
                      )}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleCopyKode(item.kode)}
                          className="inline-flex items-center gap-1 text-xs font-mono text-gray-500 hover:text-emerald-600 transition-colors"
                          title="Salin kode"
                        >
                          <Hash className="w-3 h-3" />
                          {item.kode}
                          <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">{item.nama}</p>
                        {item.deskripsi && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {truncateText(item.deskripsi, 60)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                            KATEGORI_COLORS[item.kategori] || 'bg-gray-50 text-gray-700 border-gray-200',
                          )}
                        >
                          {getKategoriLabel(item.kategori)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                            item.tingkatApproval === 'LANGSUNG_PROSES'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-amber-50 text-amber-700',
                          )}
                        >
                          {item.tingkatApproval === 'LANGSUNG_PROSES' ? (
                            <ShieldCheck className="w-3 h-3" />
                          ) : (
                            <ShieldAlert className="w-3 h-3" />
                          )}
                          {getTingkatApprovalLabel(item.tingkatApproval)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500">
                          {parsePersyaratan(item.persyaratan).length} item
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">
                          {item._count.surat}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.isActive ? (
                          <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] bg-gray-50 text-gray-500 border-gray-200">
                            Nonaktif
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isAdminDesaOrHigher && (
                              <DropdownMenuItem onClick={() => handleOpenEdit(item)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {isAdminDesaOrHigher && (
                              <DropdownMenuItem onClick={() => setConfirmToggle(item)}>
                                {item.isActive ? (
                                  <>
                                    <ToggleLeft className="w-4 h-4 mr-2" />
                                    Nonaktifkan
                                  </>
                                ) : (
                                  <>
                                    <ToggleRight className="w-4 h-4 mr-2" />
                                    Aktifkan
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleCopyKode(item.kode)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Salin Kode
                            </DropdownMenuItem>
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Menampilkan {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}-
                  {Math.min(pagination.page * pagination.limit, pagination.total)} dari {pagination.total}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronDown className="w-4 h-4 rotate-90 translate-x-0.5" />
                  </Button>
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === pagination.page ? 'default' : 'outline'}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setPagination((prev) => ({ ...prev, page: pageNum }))}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    <ChevronDown className="w-4 h-4 -rotate-90 translate-x-0.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPagination((prev) => ({ ...prev, page: pagination.totalPages }))}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      )}

      {/* Add/Edit Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={(open) => {
        if (!open) {
          setShowFormDialog(false);
          setEditingItem(null);
          setFormData(EMPTY_FORM);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Jenis Surat' : 'Tambah Jenis Surat Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Perbarui informasi jenis surat yang sudah ada.'
                : 'Isi form berikut untuk menambahkan jenis surat baru.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Kode */}
            <div className="space-y-2">
              <Label htmlFor="kode" className="text-sm font-medium">
                Kode Surat <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="kode"
                  placeholder="Contoh: SKM-001"
                  value={formData.kode}
                  onChange={(e) => setFormData((prev) => ({ ...prev, kode: e.target.value }))}
                  className="font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const kode = generateAutoKode(formData.kategori, data.length);
                    setFormData((prev) => ({ ...prev, kode }));
                  }}
                  title="Auto-generate kode"
                  className="shrink-0"
                >
                  <Hash className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[11px] text-gray-400">
                Kode unik untuk jenis surat ini. Akan otomatis ditambahkan prefix desa.
              </p>
            </div>

            {/* Nama */}
            <div className="space-y-2">
              <Label htmlFor="nama" className="text-sm font-medium">
                Nama Surat <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nama"
                placeholder="Contoh: Surat Keterangan Domisili"
                value={formData.nama}
                onChange={(e) => setFormData((prev) => ({ ...prev, nama: e.target.value }))}
              />
            </div>

            {/* Kategori & Tingkat Approval */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="kategori" className="text-sm font-medium">
                  Kategori <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.kategori}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, kategori: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {KATEGORI_TABS.filter((t) => t.value).map((tab) => (
                      <SelectItem key={tab.value} value={tab.value}>
                        {tab.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tingkatApproval" className="text-sm font-medium">
                  Tingkat Approval
                </Label>
                <Select
                  value={formData.tingkatApproval}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, tingkatApproval: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LANGSUNG_PROSES">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                        Langsung Diproses
                      </span>
                    </SelectItem>
                    <SelectItem value="PERLU_APPROVAL">
                      <span className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                        Perlu Approval Kades
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-2">
              <Label htmlFor="deskripsi" className="text-sm font-medium">
                Deskripsi
              </Label>
              <Textarea
                id="deskripsi"
                placeholder="Deskripsi singkat tentang jenis surat ini..."
                value={formData.deskripsi}
                onChange={(e) => setFormData((prev) => ({ ...prev, deskripsi: e.target.value }))}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Persyaratan */}
            <div className="space-y-2">
              <Label htmlFor="persyaratan" className="text-sm font-medium">
                Persyaratan
              </Label>
              <Textarea
                id="persyaratan"
                placeholder={"Satu persyaratan per baris:\n- Fotokopi KTP\n- Fotokopi KK\n- Surat Pengantar RT/RW"}
                value={formData.persyaratan}
                onChange={(e) => setFormData((prev) => ({ ...prev, persyaratan: e.target.value }))}
                rows={4}
                className="resize-none"
              />
              <p className="text-[11px] text-gray-400">
                Tulis satu persyaratan per baris. Baris kosong akan diabaikan.
              </p>
              {formData.persyaratan.trim() && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-emerald-600 font-medium">
                    {formData.persyaratan.split('\n').filter((s) => s.trim()).length} persyaratan
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* isActive */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Status Aktif</Label>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Nonaktifkan untuk menyembunyikan dari daftar surat
                </p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, isActive: checked }))
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowFormDialog(false);
                setEditingItem(null);
                setFormData(EMPTY_FORM);
              }}
              disabled={saving}
            >
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : editingItem ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Simpan Perubahan
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Tambah Jenis Surat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Toggle Dialog */}
      <AlertDialog open={!!confirmToggle} onOpenChange={(open) => !open && setConfirmToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {confirmToggle?.isActive ? 'Nonaktifkan Jenis Surat?' : 'Aktifkan Jenis Surat?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggle?.isActive ? (
                <>
                  Anda akan menonaktifkan jenis surat{' '}
                  <span className="font-semibold text-gray-800">{confirmToggle?.nama}</span>.
                  Jenis surat yang nonaktif tidak akan muncul dalam daftar saat pengguna mengajukan surat baru.
                  {confirmToggle && confirmToggle._count.surat > 0 && (
                    <span className="block mt-2 text-amber-600 font-medium">
                      Perhatian: Terdapat {confirmToggle._count.surat} surat yang sudah dibuat dengan jenis ini.
                    </span>
                  )}
                </>
              ) : (
                <>
                  Anda akan mengaktifkan jenis surat{' '}
                  <span className="font-semibold text-gray-800">{confirmToggle?.nama}</span>.
                  Jenis surat ini akan kembali muncul dalam daftar saat pengguna mengajukan surat baru.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={togglingId !== null}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmToggle && handleToggleActive(confirmToggle)}
              disabled={togglingId !== null}
              className={
                confirmToggle?.isActive
                  ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600'
                  : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600'
              }
            >
              {togglingId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : confirmToggle?.isActive ? (
                'Ya, Nonaktifkan'
              ) : (
                'Ya, Aktifkan'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============ SURAT JENIS CARD ============

function SuratJenisCard({
  item,
  isAdmin,
  togglingId,
  onEdit,
  onToggle,
  onCopyKode,
}: {
  item: SuratJenisItem;
  isAdmin: boolean;
  togglingId: string | null;
  onEdit: () => void;
  onToggle: () => void;
  onCopyKode: () => void;
}) {
  const persyaratanList = parsePersyaratan(item.persyaratan);
  const isToggling = togglingId === item.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'border-0 shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden',
          !item.isActive && 'opacity-70',
        )}
      >
        {/* Top color strip */}
        <div
          className={cn(
            'h-1 w-full',
            KATEGORI_COLORS[item.kategori]?.replace(/text-\S+/g, '').replace(/border-\S+/g, '').trim() || 'bg-gray-200',
          )}
          style={{
            backgroundColor:
              item.kategori === 'KEPENDUDUKAN'
                ? '#3b82f6'
                : item.kategori === 'PENGANTAR'
                  ? '#10b981'
                  : item.kategori === 'KETERANGAN'
                    ? '#8b5cf6'
                    : item.kategori === 'PERNYATAAN'
                      ? '#f97316'
                      : item.kategori === 'TANAH_PROPERTI'
                        ? '#f59e0b'
                        : item.kategori === 'KEUANGAN'
                          ? '#14b8a6'
                          : item.kategori === 'LEMBAGA'
                            ? '#f43f5e'
                            : '#9ca3af',
          }}
        />

        <CardContent className="p-4">
          {/* Header: Kode + Actions */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="min-w-0 flex-1">
              <button
                onClick={onCopyKode}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-emerald-600 transition-colors mb-1"
                title="Salin kode"
              >
                <Hash className="w-3 h-3" />
                {item.kode}
              </button>
              <h3 className={cn(
                'text-sm font-semibold text-gray-800 leading-tight',
                !item.isActive && 'line-through text-gray-500',
              )}>
                {item.nama}
              </h3>
            </div>

            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggle}>
                    {item.isActive ? (
                      <>
                        <ToggleLeft className="w-4 h-4 mr-2" />
                        Nonaktifkan
                      </>
                    ) : (
                      <>
                        <ToggleRight className="w-4 h-4 mr-2" />
                        Aktifkan
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onCopyKode}>
                    <Copy className="w-4 h-4 mr-2" />
                    Salin Kode
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border',
                KATEGORI_COLORS[item.kategori] || 'bg-gray-50 text-gray-700 border-gray-200',
              )}
            >
              {getKategoriLabel(item.kategori)}
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium',
                item.tingkatApproval === 'LANGSUNG_PROSES'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700',
              )}
            >
              {item.tingkatApproval === 'LANGSUNG_PROSES' ? (
                <ShieldCheck className="w-3 h-3" />
              ) : (
                <ShieldAlert className="w-3 h-3" />
              )}
              {getTingkatApprovalLabel(item.tingkatApproval)}
            </span>
          </div>

          {/* Description */}
          {item.deskripsi && (
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              {truncateText(item.deskripsi, 120)}
            </p>
          )}

          {/* Persyaratan Preview */}
          {persyaratanList.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-medium text-gray-400 mb-1 uppercase tracking-wider">
                Persyaratan ({persyaratanList.length})
              </p>
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {persyaratanList.slice(0, 3).map((req, i) => (
                  <p key={i} className="text-xs text-gray-500 flex items-start gap-1">
                    <span className="text-gray-300 mt-0.5">&#8226;</span>
                    <span className="truncate">{req}</span>
                  </p>
                ))}
                {persyaratanList.length > 3 && (
                  <p className="text-[11px] text-gray-400">
                    +{persyaratanList.length - 3} persyaratan lainnya
                  </p>
                )}
              </div>
            </div>
          )}

          <Separator className="my-3" />

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5" />
                {item._count.surat} surat
              </span>
              {item.urutan > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Settings2 className="w-3.5 h-3.5" />
                  #{item.urutan}
                </span>
              )}
            </div>

            {/* Quick toggle */}
            {isAdmin && (
              <button
                onClick={onToggle}
                disabled={isToggling}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors',
                  item.isActive
                    ? 'text-emerald-600 hover:bg-emerald-50'
                    : 'text-gray-400 hover:bg-gray-50',
                  isToggling && 'opacity-50 pointer-events-none',
                )}
                title={item.isActive ? 'Nonaktifkan' : 'Aktifkan'}
              >
                {isToggling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : item.isActive ? (
                  <ToggleRight className="w-3.5 h-3.5" />
                ) : (
                  <ToggleLeft className="w-3.5 h-3.5" />
                )}
                {item.isActive ? 'Aktif' : 'Off'}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
