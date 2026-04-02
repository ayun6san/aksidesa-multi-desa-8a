'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Landmark,
  Building2,
  Users,
  Heart,
  Shield,
  Store,
  CircleDollarSign,
  Plus,
  Pencil,
  Trash2,
  Search,
  Phone,
  User,
  Loader2,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LembagaModule } from './lembaga-module';
import { lembagaConfigs, jabatanPerangkatOptions } from '@/lib/lembaga-config';

// ==================== TYPES ====================

interface PerangkatDesa {
  id: string;
  nip: string | null;
  nipd: string | null;
  namaLengkap: string;
  tempatLahir: string | null;
  tanggalLahir: Date | null;
  jenisKelamin: 'LAKI_LAKI' | 'PEREMPUAN';
  pendidikanTerakhir: string | null;
  jabatan: string;
  jabatanLainnya: string | null;
  masaJabatanMulai: Date | null;
  masaJabatanSelesai: Date | null;
  skPengangkatan: string | null;
  tanggalSk: Date | null;
  alamat: string | null;
  noHp: string | null;
  foto: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== MAIN COMPONENT ====================

export function LembagaDesa() {
  const [activeTab, setActiveTab] = useState('perangkat');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');

  // Perangkat Desa state (unique — kept separate)
  const [perangkatList, setPerangkatList] = useState<PerangkatDesa[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPerangkatDialog, setShowPerangkatDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<PerangkatDesa | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: string } | null>(null);

  const [perangkatForm, setPerangkatForm] = useState({
    jenisIdentitas: 'NONE' as 'NIP' | 'NIPD' | 'NONE',
    nomorIdentitas: '',
    namaLengkap: '',
    tempatLahir: '',
    tanggalLahir: '',
    jenisKelamin: 'LAKI_LAKI' as 'LAKI_LAKI' | 'PEREMPUAN',
    pendidikanTerakhir: '',
    jabatan: 'KAUR_TATA_USAHA',
    jabatanLainnya: '',
    masaJabatanMulai: '',
    masaJabatanSelesai: '',
    skPengangkatan: '',
    tanggalSk: '',
    alamat: '',
    noHp: '',
    foto: '',
    isActive: true,
  });

  // Fetch Perangkat Desa
  const fetchPerangkat = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/lembaga-desa/perangkat');
      if (res.ok) {
        const data = await res.json();
        setPerangkatList(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching perangkat:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPerangkat();
  }, []);

  const resetPerangkatForm = () => {
    setPerangkatForm({
      jenisIdentitas: 'NONE',
      nomorIdentitas: '',
      namaLengkap: '',
      tempatLahir: '',
      tanggalLahir: '',
      jenisKelamin: 'LAKI_LAKI',
      pendidikanTerakhir: '',
      jabatan: 'KAUR_TATA_USAHA',
      jabatanLainnya: '',
      masaJabatanMulai: '',
      masaJabatanSelesai: '',
      skPengangkatan: '',
      tanggalSk: '',
      alamat: '',
      noHp: '',
      foto: '',
      isActive: true,
    });
    setEditingItem(null);
  };

  const openAddPerangkat = () => {
    resetPerangkatForm();
    setShowPerangkatDialog(true);
  };

  const openEditPerangkat = (item: PerangkatDesa) => {
    setEditingItem(item);
    let jenisIdentitas: 'NIP' | 'NIPD' | 'NONE' = 'NONE';
    let nomorIdentitas = '';
    if (item.nip) {
      jenisIdentitas = 'NIP';
      nomorIdentitas = item.nip;
    } else if (item.nipd) {
      jenisIdentitas = 'NIPD';
      nomorIdentitas = item.nipd;
    }
    setPerangkatForm({
      jenisIdentitas,
      nomorIdentitas,
      namaLengkap: item.namaLengkap,
      tempatLahir: item.tempatLahir || '',
      tanggalLahir: item.tanggalLahir ? new Date(item.tanggalLahir).toISOString().split('T')[0] : '',
      jenisKelamin: item.jenisKelamin,
      pendidikanTerakhir: item.pendidikanTerakhir || '',
      jabatan: item.jabatan,
      jabatanLainnya: item.jabatanLainnya || '',
      masaJabatanMulai: item.masaJabatanMulai ? new Date(item.masaJabatanMulai).toISOString().split('T')[0] : '',
      masaJabatanSelesai: item.masaJabatanSelesai ? new Date(item.masaJabatanSelesai).toISOString().split('T')[0] : '',
      skPengangkatan: item.skPengangkatan || '',
      tanggalSk: item.tanggalSk ? new Date(item.tanggalSk).toISOString().split('T')[0] : '',
      alamat: item.alamat || '',
      noHp: item.noHp || '',
      foto: item.foto || '',
      isActive: item.isActive,
    });
    setShowPerangkatDialog(true);
  };

  const handleSavePerangkat = async () => {
    if (!perangkatForm.namaLengkap) {
      toast.error('Nama lengkap wajib diisi');
      return;
    }
    try {
      const url = editingItem
        ? `/api/lembaga-desa/perangkat/${editingItem.id}`
        : '/api/lembaga-desa/perangkat';
      const method = editingItem ? 'PUT' : 'POST';
      const dataToSend = {
        ...perangkatForm,
        nip: perangkatForm.jenisIdentitas === 'NIP' ? perangkatForm.nomorIdentitas : null,
        nipd: perangkatForm.jenisIdentitas === 'NIPD' ? perangkatForm.nomorIdentitas : null,
      };
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(editingItem ? 'Data berhasil diperbarui' : 'Data berhasil ditambahkan');
        setShowPerangkatDialog(false);
        resetPerangkatForm();
        fetchPerangkat();
      } else {
        toast.error(result.error || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error('Error saving Perangkat Desa:', error);
      toast.error('Gagal menyimpan data');
    }
  };

  const handleDeletePerangkat = async () => {
    if (!deleteItem) return;
    try {
      const response = await fetch(`/api/lembaga-desa/perangkat/${deleteItem.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('Data berhasil dihapus');
        fetchPerangkat();
      } else {
        toast.error(result.error || 'Gagal menghapus data');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error('Gagal menghapus data');
    } finally {
      setShowDeleteDialog(false);
      setDeleteItem(null);
    }
  };

  const handleReorderPerangkat = async (id: string, direction: 'up' | 'down') => {
    try {
      const response = await fetch('/api/lembaga-desa/perangkat/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, direction }),
      });
      const result = await response.json();
      if (result.success) {
        fetchPerangkat();
      } else {
        toast.error(result.error || 'Gagal mengubah urutan');
      }
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Gagal mengubah urutan');
    }
  };

  const getJabatanLabel = (jabatan: string) => {
    const found = jabatanPerangkatOptions.find((j) => j.value === jabatan);
    return found ? found.label : jabatan;
  };

  const filteredPerangkat = perangkatList.filter(
    (item) =>
      item.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jabatan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ==================== TAB ICON MAP ====================
  const tabIconMap: Record<string, React.ElementType> = {
    bpd: Building2,
    lpm: Users,
    mui: Building2,
    karangTaruna: Users,
    pkk: Heart,
    ketuaRW: Users,
    ketuaRT: Users,
    linmas: Shield,
    bumdes: Store,
    koperasi: CircleDollarSign,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-7 h-7 text-emerald-600" />
            Lembaga Desa
          </h1>
          <p className="text-gray-500 mt-1">Kelola data lembaga dan perangkat desa</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg p-1 bg-gray-50">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className={cn('px-3', viewMode === 'card' && 'bg-emerald-600 hover:bg-emerald-700')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={cn('px-3', viewMode === 'table' && 'bg-emerald-600 hover:bg-emerald-700')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Cari nama atau jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border">
          <TabsTrigger
            value="perangkat"
            className="data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
          >
            <Users className="w-4 h-4 mr-2" />
            Perangkat Desa
          </TabsTrigger>
          {lembagaConfigs.map((c) => {
            const Icon = tabIconMap[c.slug] || Users;
            return (
              <TabsTrigger
                key={c.slug}
                value={c.tabValue}
                className={cn(
                  'data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700',
                  c.slug === 'koperasi' && 'data-[state=active]:bg-red-50 data-[state=active]:text-red-700'
                )}
              >
                <Icon className="w-4 h-4 mr-2" />
                {c.nama}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* ==================== PERANGKAT DESA TAB ==================== */}
        <TabsContent value="perangkat" className="mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Daftar Perangkat Desa</CardTitle>
              <Button onClick={openAddPerangkat} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                Tambah Perangkat
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                </div>
              ) : filteredPerangkat.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Belum ada data Perangkat Desa</p>
                  <p className="text-sm mt-1">
                    Klik tombol &quot;Tambah Perangkat&quot; untuk menambahkan data
                  </p>
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPerangkat.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card
                        className={cn(
                          'border hover:shadow-md transition-shadow cursor-pointer',
                          !item.isActive && 'opacity-60'
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {item.foto ? (
                                <img
                                  src={item.foto}
                                  alt={item.namaLengkap}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="w-8 h-8 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{item.namaLengkap}</h3>
                              <Badge
                                variant="outline"
                                className="mt-1 bg-emerald-50 text-emerald-700 border-emerald-200"
                              >
                                {getJabatanLabel(item.jabatan)}
                              </Badge>
                              {item.nip && (
                                <p className="text-xs text-gray-500 mt-1">NIP: {item.nip}</p>
                              )}
                              {!item.nip && item.nipd && (
                                <p className="text-xs text-gray-500 mt-1">NIPD: {item.nipd}</p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                {item.noHp && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="w-3 h-3" />
                                    {item.noHp}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-4 pt-3 border-t">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReorderPerangkat(item.id, 'up')}
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                title="Pindah ke atas"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReorderPerangkat(item.id, 'down')}
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                title="Pindah ke bawah"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditPerangkat(item)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeleteItem({ id: item.id, type: 'perangkat' });
                                  setShowDeleteDialog(true);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12 text-center">No</TableHead>
                        <TableHead>Nama Lengkap</TableHead>
                        <TableHead>Jabatan</TableHead>
                        <TableHead>NIP/NIPD</TableHead>
                        <TableHead>Pendidikan</TableHead>
                        <TableHead>No. HP</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center w-32">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPerangkat.map((item, index) => (
                        <TableRow key={item.id} className={!item.isActive ? 'opacity-60' : ''}>
                          <TableCell className="text-center font-medium">{index + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center overflow-hidden">
                                {item.foto ? (
                                  <img
                                    src={item.foto}
                                    alt={item.namaLengkap}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-4 h-4 text-white" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{item.namaLengkap}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              {getJabatanLabel(item.jabatan)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {item.nip ? (
                              <span>
                                <span className="text-gray-500">NIP:</span> {item.nip}
                              </span>
                            ) : item.nipd ? (
                              <span>
                                <span className="text-gray-500">NIPD:</span> {item.nipd}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>{item.pendidikanTerakhir || '-'}</TableCell>
                          <TableCell>{item.noHp || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={item.isActive ? 'default' : 'secondary'}
                              className={
                                item.isActive
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-500'
                              }
                            >
                              {item.isActive ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReorderPerangkat(item.id, 'up')}
                                className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                                title="Naik"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReorderPerangkat(item.id, 'down')}
                                className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                                title="Turun"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditPerangkat(item)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setDeleteItem({ id: item.id, type: 'perangkat' });
                                  setShowDeleteDialog(true);
                                }}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== LEMBAGA TABS (GENERIC) ==================== */}
        {lembagaConfigs.map((config) => (
          <TabsContent key={config.slug} value={config.tabValue} className="mt-4">
            <LembagaModule config={config} viewMode={viewMode} searchQuery={searchQuery} />
          </TabsContent>
        ))}
      </Tabs>

      {/* ==================== PERANGKAT DESA DIALOG ==================== */}
      <Dialog open={showPerangkatDialog} onOpenChange={setShowPerangkatDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Perangkat Desa' : 'Tambah Perangkat Desa'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={perangkatForm.namaLengkap}
                onChange={(e) => setPerangkatForm({ ...perangkatForm, namaLengkap: e.target.value })}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div className="space-y-2">
              <Label>Jenis Identitas</Label>
              <Select
                value={perangkatForm.jenisIdentitas}
                onValueChange={(value: 'NIP' | 'NIPD' | 'NONE') =>
                  setPerangkatForm({ ...perangkatForm, jenisIdentitas: value, nomorIdentitas: '' })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis identitas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NIP">NIP (PNS)</SelectItem>
                  <SelectItem value="NIPD">NIPD (Non-PNS)</SelectItem>
                  <SelectItem value="NONE">Tidak Punya</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {perangkatForm.jenisIdentitas !== 'NONE' && (
              <div className="space-y-2">
                <Label>Nomor {perangkatForm.jenisIdentitas}</Label>
                <Input
                  value={perangkatForm.nomorIdentitas}
                  onChange={(e) => setPerangkatForm({ ...perangkatForm, nomorIdentitas: e.target.value })}
                  placeholder={`Masukkan nomor ${perangkatForm.jenisIdentitas}`}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Tempat Lahir</Label>
              <Input
                value={perangkatForm.tempatLahir}
                onChange={(e) => setPerangkatForm({ ...perangkatForm, tempatLahir: e.target.value })}
                placeholder="Masukkan tempat lahir"
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal Lahir</Label>
              <Input
                type="date"
                value={perangkatForm.tanggalLahir}
                onChange={(e) => setPerangkatForm({ ...perangkatForm, tanggalLahir: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Jenis Kelamin</Label>
              <Select
                value={perangkatForm.jenisKelamin}
                onValueChange={(value: 'LAKI_LAKI' | 'PEREMPUAN') =>
                  setPerangkatForm({ ...perangkatForm, jenisKelamin: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAKI_LAKI">Laki-laki</SelectItem>
                  <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pendidikan Terakhir</Label>
              <Input
                value={perangkatForm.pendidikanTerakhir}
                onChange={(e) =>
                  setPerangkatForm({ ...perangkatForm, pendidikanTerakhir: e.target.value })
                }
                placeholder="Contoh: S1"
              />
            </div>

            <div className="space-y-2">
              <Label>Jabatan *</Label>
              <Select
                value={perangkatForm.jabatan}
                onValueChange={(value) => setPerangkatForm({ ...perangkatForm, jabatan: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jabatanPerangkatOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {perangkatForm.jabatan === 'LAINNYA' && (
              <div className="space-y-2">
                <Label>Jabatan Lainnya</Label>
                <Input
                  value={perangkatForm.jabatanLainnya}
                  onChange={(e) =>
                    setPerangkatForm({ ...perangkatForm, jabatanLainnya: e.target.value })
                  }
                  placeholder="Masukkan nama jabatan"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Masa Jabatan Mulai</Label>
              <Input
                type="date"
                value={perangkatForm.masaJabatanMulai}
                onChange={(e) =>
                  setPerangkatForm({ ...perangkatForm, masaJabatanMulai: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Masa Jabatan Selesai</Label>
              <Input
                type="date"
                value={perangkatForm.masaJabatanSelesai}
                onChange={(e) =>
                  setPerangkatForm({ ...perangkatForm, masaJabatanSelesai: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>No. SK Pengangkatan</Label>
              <Input
                value={perangkatForm.skPengangkatan}
                onChange={(e) =>
                  setPerangkatForm({ ...perangkatForm, skPengangkatan: e.target.value })
                }
                placeholder="Masukkan nomor SK"
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal SK</Label>
              <Input
                type="date"
                value={perangkatForm.tanggalSk}
                onChange={(e) =>
                  setPerangkatForm({ ...perangkatForm, tanggalSk: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Alamat</Label>
              <Input
                value={perangkatForm.alamat}
                onChange={(e) => setPerangkatForm({ ...perangkatForm, alamat: e.target.value })}
                placeholder="Masukkan alamat"
              />
            </div>

            <div className="space-y-2">
              <Label>No. HP</Label>
              <Input
                value={perangkatForm.noHp}
                onChange={(e) => setPerangkatForm({ ...perangkatForm, noHp: e.target.value })}
                placeholder="Masukkan nomor HP"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPerangkatDialog(false)}>
              Batal
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSavePerangkat}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePerangkat} className="bg-red-600 hover:bg-red-700">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
