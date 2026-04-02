'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Users,
  Home,
  X,
  Loader2,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Types
interface Dusun {
  id: string;
  nama: string;
  kode: string | null;
  jumlahKK: number;
  jumlahPenduduk: number;
  totalRW: number;
  totalRT: number;
  createdAt: string;
}

interface RW {
  id: string;
  nomor: string;
  jumlahKK: number;
  jumlahPenduduk: number;
  totalRT: number;
  dusunId: string;
  dusun: { id: string; nama: string };
  createdAt: string;
}

interface RT {
  id: string;
  nomor: string;
  jumlahKK: number;
  jumlahPenduduk: number;
  rwId: string;
  rw: {
    id: string;
    nomor: string;
    dusun: { id: string; nama: string };
  };
  createdAt: string;
}

type FormType = 'dusun' | 'rw' | 'rt';

export function WilayahManagement() {
  // State
  const [dusunList, setDusunList] = useState<Dusun[]>([]);
  const [rwMap, setRwMap] = useState<Record<string, RW[]>>({});
  const [rtMap, setRtMap] = useState<Record<string, RT[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDusun, setExpandedDusun] = useState<string[]>([]);
  const [expandedRW, setExpandedRW] = useState<string[]>([]);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<FormType>('dusun');
  const [editingItem, setEditingItem] = useState<Dusun | RW | RT | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ type: FormType; item: Dusun | RW | RT } | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    nama: '',
    dusunId: '',
    rwId: '',
    nomor: '',
  });

  // Fetch all Dusun
  const fetchDusun = useCallback(async () => {
    try {
      const response = await fetch('/api/wilayah/dusun');
      const data = await response.json();
      if (data.success) {
        setDusunList(data.data);
      }
    } catch (error) {
      console.error('Error fetching dusun:', error);
      toast.error('Gagal mengambil data dusun');
    }
  }, []);

  // Fetch RW by Dusun
  const fetchRW = useCallback(async (dusunId: string) => {
    try {
      const response = await fetch(`/api/wilayah/rw?dusunId=${dusunId}`);
      const data = await response.json();
      if (data.success) {
        setRwMap(prev => ({ ...prev, [dusunId]: data.data }));
      }
    } catch (error) {
      console.error('Error fetching RW:', error);
    }
  }, []);

  // Fetch RT by RW
  const fetchRT = useCallback(async (rwId: string) => {
    try {
      const response = await fetch(`/api/wilayah/rt?rwId=${rwId}`);
      const data = await response.json();
      if (data.success) {
        setRtMap(prev => ({ ...prev, [rwId]: data.data }));
      }
    } catch (error) {
      console.error('Error fetching RT:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchDusun();
      setLoading(false);
    };
    loadData();
  }, [fetchDusun]);

  // Toggle Dusun expansion
  const toggleDusun = async (dusunId: string) => {
    if (expandedDusun.includes(dusunId)) {
      setExpandedDusun(prev => prev.filter(id => id !== dusunId));
    } else {
      setExpandedDusun(prev => [...prev, dusunId]);
      if (!rwMap[dusunId]) {
        await fetchRW(dusunId);
      }
    }
  };

  // Toggle RW expansion
  const toggleRW = async (rwId: string) => {
    if (expandedRW.includes(rwId)) {
      setExpandedRW(prev => prev.filter(id => id !== rwId));
    } else {
      setExpandedRW(prev => [...prev, rwId]);
      if (!rtMap[rwId]) {
        await fetchRT(rwId);
      }
    }
  };

  // Open form for create
  const openCreateForm = (type: FormType, parentId?: string) => {
    setFormType(type);
    setEditingItem(null);
    setFormData({
      nama: '',
      dusunId: parentId || '',
      rwId: '',
      nomor: '',
    });
    setShowForm(true);
  };

  // Open form for edit
  const openEditForm = (type: FormType, item: Dusun | RW | RT) => {
    setFormType(type);
    setEditingItem(item);
    
    if (type === 'dusun') {
      const d = item as Dusun;
      setFormData({
        nama: d.nama,
        dusunId: '',
        rwId: '',
        nomor: '',
      });
    } else if (type === 'rw') {
      const rw = item as RW;
      setFormData({
        nama: '',
        dusunId: rw.dusunId,
        rwId: '',
        nomor: rw.nomor,
      });
    } else {
      const rt = item as RT;
      setFormData({
        nama: '',
        dusunId: '',
        rwId: rt.rwId,
        nomor: rt.nomor,
      });
    }
    setShowForm(true);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let url = '';
      let method = 'POST';
      let body: any = {};

      if (formType === 'dusun') {
        url = editingItem ? `/api/wilayah/dusun/${editingItem.id}` : '/api/wilayah/dusun';
        method = editingItem ? 'PUT' : 'POST';
        body = {
          nama: formData.nama,
        };
      } else if (formType === 'rw') {
        url = editingItem ? `/api/wilayah/rw/${editingItem.id}` : '/api/wilayah/rw';
        method = editingItem ? 'PUT' : 'POST';
        body = {
          dusunId: formData.dusunId,
          nomor: formData.nomor,
        };
      } else {
        url = editingItem ? `/api/wilayah/rt/${editingItem.id}` : '/api/wilayah/rt';
        method = editingItem ? 'PUT' : 'POST';
        body = {
          rwId: formData.rwId,
          nomor: formData.nomor,
        };
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Data berhasil disimpan');
        setShowForm(false);
        setEditingItem(null);

        // Refresh data
        if (formType === 'dusun') {
          await fetchDusun();
        } else if (formType === 'rw') {
          await fetchRW(formData.dusunId);
        } else {
          await fetchRT(formData.rwId);
        }
      } else {
        toast.error(data.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingItem) return;
    setSubmitting(true);

    try {
      let url = '';
      if (deletingItem.type === 'dusun') {
        url = `/api/wilayah/dusun/${deletingItem.item.id}`;
      } else if (deletingItem.type === 'rw') {
        url = `/api/wilayah/rw/${deletingItem.item.id}`;
      } else {
        url = `/api/wilayah/rt/${deletingItem.item.id}`;
      }

      const response = await fetch(url, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Data berhasil dihapus');
        setShowDeleteConfirm(false);
        setDeletingItem(null);

        // Refresh data
        fetchDusun();
        if (deletingItem.type === 'rw' && 'dusunId' in deletingItem.item) {
          fetchRW((deletingItem.item as RW).dusunId);
        } else if (deletingItem.type === 'rt' && 'rwId' in deletingItem.item) {
          fetchRT((deletingItem.item as RT).rwId);
        }
      } else {
        toast.error(data.error || 'Gagal menghapus data');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // Stats
  const totalDusun = dusunList.length;
  const totalRW = Object.values(rwMap).flat().length;
  const totalRT = Object.values(rtMap).flat().length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Data Wilayah</h2>
          <p className="text-gray-500 mt-1">Kelola Dusun, RW, dan RT</p>
        </div>
        <Button
          onClick={() => openCreateForm('dusun')}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Dusun
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Dusun</p>
                <p className="text-xl font-bold text-gray-900">{totalDusun}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total RW</p>
                <p className="text-xl font-bold text-gray-900">{totalRW}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Home className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total RT</p>
                <p className="text-xl font-bold text-gray-900">{totalRT}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tree View */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Struktur Wilayah
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : dusunList.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-gray-500">Belum ada data dusun</p>
              <Button
                variant="outline"
                onClick={() => openCreateForm('dusun')}
                className="mt-3"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Dusun Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {dusunList.map((dusun) => {
                const isDusunExpanded = expandedDusun.includes(dusun.id);
                const rwList = rwMap[dusun.id] || [];

                return (
                  <div key={dusun.id} className="border rounded-lg">
                    {/* Dusun Row */}
                    <div
                      className={cn(
                        'flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50',
                        isDusunExpanded && 'bg-gray-50'
                      )}
                      onClick={() => toggleDusun(dusun.id)}
                    >
                      <div className="flex items-center gap-3">
                        {isDusunExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        <Building2 className="w-5 h-5 text-purple-600" />
                        <div>
                          <span className="font-medium text-gray-900">
                            {dusun.kode && <span className="text-gray-500 mr-1">[{dusun.kode}]</span>}
                            {dusun.nama}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {dusun.totalRW} RW
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {dusun.totalRT} RT
                        </Badge>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openCreateForm('rw', dusun.id)}
                            className="h-7 px-2 text-emerald-600 hover:bg-emerald-50"
                            title="Tambah RW"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditForm('dusun', dusun)}
                            className="h-7 px-2 text-gray-600 hover:bg-gray-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingItem({ type: 'dusun', item: dusun });
                              setShowDeleteConfirm(true);
                            }}
                            className="h-7 px-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* RW List */}
                    <AnimatePresence>
                      {isDusunExpanded && rwList.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t bg-gray-50/50"
                        >
                          {rwList.map((rw) => {
                            const isRwExpanded = expandedRW.includes(rw.id);
                            const rtList = rtMap[rw.id] || [];

                            return (
                              <div key={rw.id} className="ml-6 border-l-2 border-gray-200">
                                {/* RW Row */}
                                <div
                                  className={cn(
                                    'flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100/50',
                                    isRwExpanded && 'bg-gray-100/50'
                                  )}
                                  onClick={() => toggleRW(rw.id)}
                                >
                                  <div className="flex items-center gap-3">
                                    {isRwExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                    <Users className="w-4 h-4 text-blue-600" />
                                    <div>
                                      <span className="font-medium text-gray-800">
                                        RW {rw.nomor}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {rw.totalRT} RT
                                    </Badge>
                                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openCreateForm('rt', rw.id)}
                                        className="h-7 px-2 text-emerald-600 hover:bg-emerald-50"
                                        title="Tambah RT"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditForm('rw', rw)}
                                        className="h-7 px-2 text-gray-600 hover:bg-gray-100"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          setDeletingItem({ type: 'rw', item: rw });
                                          setShowDeleteConfirm(true);
                                        }}
                                        className="h-7 px-2 text-red-600 hover:bg-red-50"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>

                                {/* RT List */}
                                <AnimatePresence>
                                  {isRwExpanded && rtList.length > 0 && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="border-t border-gray-100"
                                    >
                                      {rtList.map((rt) => (
                                        <div
                                          key={rt.id}
                                          className="ml-6 border-l-2 border-gray-200 flex items-center justify-between p-3 hover:bg-gray-100/50"
                                        >
                                          <div className="flex items-center gap-3">
                                            <Home className="w-4 h-4 text-emerald-600" />
                                            <div>
                                              <span className="font-medium text-gray-700">
                                                RT {rt.nomor}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => openEditForm('rt', rt)}
                                              className="h-7 px-2 text-gray-600 hover:bg-gray-100"
                                            >
                                              <Edit2 className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setDeletingItem({ type: 'rt', item: rt });
                                                setShowDeleteConfirm(true);
                                              }}
                                              className="h-7 px-2 text-red-600 hover:bg-red-50"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* Empty RT */}
                                <AnimatePresence>
                                  {isRwExpanded && rtList.length === 0 && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="ml-6 border-l-2 border-gray-200 p-3 text-sm text-gray-500"
                                    >
                                      Belum ada RT.{' '}
                                      <button
                                        onClick={() => openCreateForm('rt', rw.id)}
                                        className="text-emerald-600 hover:underline"
                                      >
                                        Tambah RT
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Empty RW */}
                    <AnimatePresence>
                      {isDusunExpanded && rwList.length === 0 && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-3 text-sm text-gray-500 border-t"
                        >
                          Belum ada RW.{' '}
                          <button
                            onClick={() => openCreateForm('rw', dusun.id)}
                            className="text-emerald-600 hover:underline"
                          >
                            Tambah RW
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? `Edit ${formType === 'dusun' ? 'Dusun' : formType === 'rw' ? 'RW' : 'RT'}`
                : `Tambah ${formType === 'dusun' ? 'Dusun' : formType === 'rw' ? 'RW' : 'RT'} Baru`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formType === 'dusun' && (
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Dusun *</Label>
                <Input
                  id="nama"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  placeholder="Contoh: Dusun Sukamaju"
                  required
                />
                <p className="text-xs text-gray-500">Kode dusun akan dibuat otomatis</p>
              </div>
            )}

            {formType === 'rw' && (
              <>
                {!editingItem && (
                  <div className="space-y-2">
                    <Label>Dusun *</Label>
                    <Select
                      value={formData.dusunId}
                      onValueChange={(value) => setFormData({ ...formData, dusunId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Dusun" />
                      </SelectTrigger>
                      <SelectContent>
                        {dusunList.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.nama}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="nomor">Nomor RW *</Label>
                  <Input
                    id="nomor"
                    value={formData.nomor}
                    onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
                    placeholder="Contoh: 001"
                    required
                  />
                </div>
              </>
            )}

            {formType === 'rt' && (
              <>
                {!editingItem && (
                  <div className="space-y-2">
                    <Label>RW *</Label>
                    <Select
                      value={formData.rwId}
                      onValueChange={(value) => setFormData({ ...formData, rwId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih RW" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(rwMap)
                          .flat()
                          .sort((a, b) => a.dusun.nama.localeCompare(b.dusun.nama) || a.nomor.localeCompare(b.nomor))
                          .map((rw) => (
                            <SelectItem key={rw.id} value={rw.id}>
                              {rw.dusun.nama} - RW {rw.nomor}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="nomor">Nomor RT *</Label>
                  <Input
                    id="nomor"
                    value={formData.nomor}
                    onChange={(e) => setFormData({ ...formData, nomor: e.target.value })}
                    placeholder="Contoh: 001"
                    required
                  />
                </div>
              </>
            )}

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
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  'Simpan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          {deletingItem && (
            <>
              <p className="text-gray-600">
                Apakah Anda yakin ingin menghapus{' '}
                <span className="font-medium">
                  {deletingItem.type === 'dusun'
                    ? (deletingItem.item as Dusun).nama
                    : deletingItem.type === 'rw'
                    ? `RW ${(deletingItem.item as RW).nomor}`
                    : `RT ${(deletingItem.item as RT).nomor}`}
                </span>
                ?
              </p>
              {deletingItem.type === 'dusun' && (
                <p className="text-sm text-red-600">
                  Semua RW dan RT di dalamnya juga akan dihapus.
                </p>
              )}
              {deletingItem.type === 'rw' && (
                <p className="text-sm text-red-600">
                  Semua RT di dalamnya juga akan dihapus.
                </p>
              )}
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
