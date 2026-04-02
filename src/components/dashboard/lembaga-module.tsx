'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  Phone,
  User,
  Building2,
  Loader2,
  ChevronUp,
  ChevronDown,
  Heart,
  Shield,
  Store,
  CircleDollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { pekerjaanGroups } from '@/lib/kependudukan-constants';
import { type LembagaConfig } from '@/lib/lembaga-config';

// Generic interface for all lembaga anggota
interface LembagaAnggota {
  id: string;
  namaLengkap: string;
  tempatLahir: string | null;
  tanggalLahir: Date | string | null;
  jenisKelamin: 'LAKI_LAKI' | 'PEREMPUAN';
  pendidikanTerakhir: string | null;
  pekerjaan: string | null;
  jabatan: string;
  periodeMulai: Date | string | null;
  periodeSelesai: Date | string | null;
  skPengangkatan: string | null;
  tanggalSk: Date | string | null;
  alamat: string | null;
  noHp: string | null;
  foto: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface LembagaModuleProps {
  config: LembagaConfig;
  viewMode: 'card' | 'table';
  searchQuery: string;
}

const iconMap: Record<string, React.ElementType> = {
  Users,
  Building2,
  Heart,
  Shield,
  Store,
  CircleDollarSign,
};

const getFormDefaults = (config: LembagaConfig) => ({
  namaLengkap: '',
  tempatLahir: '',
  tanggalLahir: '',
  jenisKelamin: 'LAKI_LAKI' as 'LAKI_LAKI' | 'PEREMPUAN',
  pendidikanTerakhir: '',
  pekerjaan: '',
  jabatan: config.defaultJabatan,
  periodeMulai: '',
  periodeSelesai: '',
  skPengangkatan: '',
  tanggalSk: '',
  alamat: '',
  noHp: '',
  foto: '',
  isActive: true,
});

type LembagaForm = ReturnType<typeof getFormDefaults>;

export function LembagaModule({ config, viewMode, searchQuery }: LembagaModuleProps) {
  const [list, setList] = useState<LembagaAnggota[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState<LembagaForm>(getFormDefaults(config));
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<LembagaAnggota | null>(null);
  const [deleteItem, setDeleteItem] = useState<LembagaAnggota | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(config.apiUrl);
      if (res.ok) {
        const data = await res.json();
        setList(data.data || []);
      }
    } catch (error) {
      console.error(`Error fetching ${config.nama}:`, error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  }, [config.apiUrl, config.nama]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm(getFormDefaults(config));
    setEditingItem(null);
  };

  const openAdd = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (item: LembagaAnggota) => {
    setEditingItem(item);
    setForm({
      namaLengkap: item.namaLengkap,
      tempatLahir: item.tempatLahir || '',
      tanggalLahir: item.tanggalLahir ? new Date(item.tanggalLahir).toISOString().split('T')[0] : '',
      jenisKelamin: item.jenisKelamin,
      pendidikanTerakhir: item.pendidikanTerakhir || '',
      pekerjaan: item.pekerjaan || '',
      jabatan: item.jabatan,
      periodeMulai: item.periodeMulai ? new Date(item.periodeMulai).toISOString().split('T')[0] : '',
      periodeSelesai: item.periodeSelesai ? new Date(item.periodeSelesai).toISOString().split('T')[0] : '',
      skPengangkatan: item.skPengangkatan || '',
      tanggalSk: item.tanggalSk ? new Date(item.tanggalSk).toISOString().split('T')[0] : '',
      alamat: item.alamat || '',
      noHp: item.noHp || '',
      foto: item.foto || '',
      isActive: item.isActive,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.namaLengkap) {
      toast.error('Nama lengkap wajib diisi');
      return;
    }
    try {
      const url = editingItem
        ? `${config.apiUrl}/${editingItem.id}`
        : config.apiUrl;
      const method = editingItem ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(editingItem ? 'Data berhasil diperbarui' : 'Data berhasil ditambahkan');
        setShowDialog(false);
        resetForm();
        fetchData();
      } else {
        toast.error(result.error || 'Terjadi kesalahan');
      }
    } catch (error) {
      console.error(`Error saving ${config.nama}:`, error);
      toast.error('Gagal menyimpan data');
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      const response = await fetch(`${config.apiUrl}/${deleteItem.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        toast.success('Data berhasil dihapus');
        fetchData();
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

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    try {
      const response = await fetch(config.reorderUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, direction }),
      });
      const result = await response.json();
      if (result.success) {
        fetchData();
      } else {
        toast.error(result.error || 'Gagal mengubah urutan');
      }
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error('Gagal mengubah urutan');
    }
  };

  const filteredList = list.filter(
    (item) =>
      item.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jabatan.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const EmptyIcon = iconMap[config.icon] || Users;

  const updateField = (field: keyof LembagaForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          {config.deskripsi ? (
            <div>
              <CardTitle className="text-lg">{config.listTitle}</CardTitle>
              <p className="text-sm text-gray-500">{config.deskripsi}</p>
            </div>
          ) : (
            <CardTitle className="text-lg">{config.listTitle}</CardTitle>
          )}
          <Button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Tambah {config.anggotaLabel}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <EmptyIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{config.emptyTitle}</p>
              <p className="text-sm mt-1">
                Klik tombol &quot;Tambah {config.anggotaLabel}&quot; untuk menambahkan data
              </p>
            </div>
          ) : viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.map((item, index) => (
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
                        <div
                          className={cn(
                            'w-16 h-16 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0 overflow-hidden',
                            config.gradientFrom,
                            config.gradientTo
                          )}
                        >
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
                            className={cn('mt-1', config.badgeBg, config.badgeText, config.badgeBorder)}
                          >
                            {item.jabatan}
                          </Badge>
                          {config.showPekerjaan && item.pekerjaan && (
                            <p className="text-xs text-gray-500 mt-1">{item.pekerjaan}</p>
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
                            onClick={() => handleReorder(item.id, 'up')}
                            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                            title="Pindah ke atas"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorder(item.id, 'down')}
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
                            onClick={() => openEdit(item)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteItem(item);
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
                    {config.showPekerjaan && <TableHead>Pekerjaan</TableHead>}
                    <TableHead>Pendidikan</TableHead>
                    <TableHead>No. HP</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center w-32">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((item, index) => (
                    <TableRow key={item.id} className={!item.isActive ? 'opacity-60' : ''}>
                      <TableCell className="text-center font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center overflow-hidden',
                              config.gradientFrom,
                              config.gradientTo
                            )}
                          >
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
                          className={cn(config.badgeBg, config.badgeText, config.badgeBorder)}
                        >
                          {item.jabatan}
                        </Badge>
                      </TableCell>
                      {config.showPekerjaan && (
                        <TableCell>{item.pekerjaan || '-'}</TableCell>
                      )}
                      <TableCell>{item.pendidikanTerakhir || '-'}</TableCell>
                      <TableCell>{item.noHp || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.isActive ? 'default' : 'secondary'}
                          className={
                            item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
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
                            onClick={() => handleReorder(item.id, 'up')}
                            className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                            title="Naik"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReorder(item.id, 'down')}
                            className="text-gray-400 hover:text-gray-600 h-8 w-8 p-0"
                            title="Turun"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(item)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteItem(item);
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

      {/* Form Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? config.dialogEditTitle : config.dialogTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Nama Lengkap */}
            <div className="space-y-2">
              <Label>Nama Lengkap *</Label>
              <Input
                value={form.namaLengkap}
                onChange={(e) => updateField('namaLengkap', e.target.value)}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            {/* Jabatan */}
            <div className="space-y-2">
              <Label>{config.jabatanLabel} *</Label>
              {config.jabatanType === 'text' ? (
                <Input
                  value={form.jabatan}
                  onChange={(e) => updateField('jabatan', e.target.value)}
                  placeholder="Contoh: Ketua RT 001, Sekretaris RT 003"
                />
              ) : (
                <Select
                  value={form.jabatan}
                  onValueChange={(value) => updateField('jabatan', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {config.jabatanOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Tempat Lahir */}
            <div className="space-y-2">
              <Label>Tempat Lahir</Label>
              <Input
                value={form.tempatLahir}
                onChange={(e) => updateField('tempatLahir', e.target.value)}
                placeholder="Masukkan tempat lahir"
              />
            </div>

            {/* Tanggal Lahir */}
            <div className="space-y-2">
              <Label>Tanggal Lahir</Label>
              <Input
                type="date"
                value={form.tanggalLahir}
                onChange={(e) => updateField('tanggalLahir', e.target.value)}
              />
            </div>

            {/* Jenis Kelamin */}
            <div className="space-y-2">
              <Label>Jenis Kelamin</Label>
              <Select
                value={form.jenisKelamin}
                onValueChange={(value: 'LAKI_LAKI' | 'PEREMPUAN') =>
                  updateField('jenisKelamin', value)
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

            {/* Pendidikan Terakhir */}
            <div className="space-y-2">
              <Label>Pendidikan Terakhir</Label>
              <Input
                value={form.pendidikanTerakhir}
                onChange={(e) => updateField('pendidikanTerakhir', e.target.value)}
                placeholder="Contoh: S1"
              />
            </div>

            {/* Pekerjaan */}
            {config.showPekerjaan && (
              <div className="space-y-2">
                <SearchableCombobox
                  value={form.pekerjaan}
                  onChange={(v) => updateField('pekerjaan', v)}
                  options={pekerjaanGroups}
                  placeholder="Pilih pekerjaan..."
                  searchPlaceholder="Ketik pekerjaan..."
                  emptyMessage="Pekerjaan tidak ditemukan"
                  label="Pekerjaan"
                />
              </div>
            )}

            {/* Periode Mulai */}
            <div className="space-y-2">
              <Label>Periode Mulai</Label>
              <Input
                type="date"
                value={form.periodeMulai}
                onChange={(e) => updateField('periodeMulai', e.target.value)}
              />
            </div>

            {/* Periode Selesai */}
            <div className="space-y-2">
              <Label>Periode Selesai</Label>
              <Input
                type="date"
                value={form.periodeSelesai}
                onChange={(e) => updateField('periodeSelesai', e.target.value)}
              />
            </div>

            {/* SK Fields (conditional) */}
            {config.showSkFields && (
              <>
                <div className="space-y-2">
                  <Label>No. SK Pengangkatan</Label>
                  <Input
                    value={form.skPengangkatan}
                    onChange={(e) => updateField('skPengangkatan', e.target.value)}
                    placeholder="Masukkan nomor SK"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal SK</Label>
                  <Input
                    type="date"
                    value={form.tanggalSk}
                    onChange={(e) => updateField('tanggalSk', e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Alamat */}
            <div className="space-y-2 md:col-span-2">
              <Label>Alamat</Label>
              <Input
                value={form.alamat}
                onChange={(e) => updateField('alamat', e.target.value)}
                placeholder="Masukkan alamat"
              />
            </div>

            {/* No HP */}
            <div className="space-y-2">
              <Label>No. HP</Label>
              <Input
                value={form.noHp}
                onChange={(e) => updateField('noHp', e.target.value)}
                placeholder="Masukkan nomor HP"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
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
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
