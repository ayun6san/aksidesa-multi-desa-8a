'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  RefreshCw,
  MoreVertical,
  User,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  KeyRound,
  Power,
  Trash2,
  Edit2,
  Building2,
  Loader2,
  X,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Desa {
  id: string;
  namaDesa: string;
  kecamatan: string;
  kabupaten: string;
}

interface UserItem {
  id: string;
  namaLengkap: string;
  username: string;
  email: string;
  noHp: string | null;
  role: string;
  status: string;
  isFirstChild: boolean;
  wajibGantiPassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  desaId: string | null;
  desa: { id: string; namaDesa: string; slug: string; kecamatan: string; kabupaten: string } | null;
  isOnline: boolean;
}

interface UserFormData {
  namaLengkap: string;
  username: string;
  email: string;
  noHp: string;
  password: string;
  confirmPassword: string;
  role: string;
  status: string;
  desaId: string;
}

const initialFormData: UserFormData = {
  namaLengkap: '',
  username: '',
  email: '',
  noHp: '',
  password: '',
  confirmPassword: '',
  role: 'OPERATOR',
  status: 'ACTIVE',
  desaId: '',
};

const ROLE_OPTIONS = [
  { value: 'ADMIN_DESA', label: 'Admin Desa' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'WARGA', label: 'Warga' },
];

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Aktif', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'INACTIVE', label: 'Nonaktif', color: 'bg-gray-100 text-gray-700' },
  { value: 'SUSPENDED', label: 'Ditangguhkan', color: 'bg-red-100 text-red-700' },
];

export function SuperAdminUserManagement() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDesa, setFilterDesa] = useState('');
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterKabupaten, setFilterKabupaten] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userDetail, setUserDetail] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [resetPwdForm, setResetPwdForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterRole) params.append('role', filterRole);
      if (filterStatus) params.append('status', filterStatus);
      if (filterDesa) params.append('desaId', filterDesa);
      if (filterKecamatan) params.append('kecamatan', filterKecamatan);
      if (filterKabupaten) params.append('kabupaten', filterKabupaten);
      params.append('page', page.toString());
      params.append('limit', '10');

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Gagal mengambil data user');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterStatus, filterDesa, filterKecamatan, filterKabupaten, page]);

  // Derived filter lists
  const kecamatanList = [...new Set(desaList.map((d) => d.kecamatan))].filter(Boolean).sort();
  const kabupatenList = [...new Set(desaList.map((d) => d.kabupaten))].filter(Boolean).sort();
  const filteredDesaByKec = filterKecamatan
    ? desaList.filter((d) => d.kecamatan === filterKecamatan)
    : desaList;
  const filteredDesaByKab = filterKabupaten
    ? desaList.filter((d) => d.kabupaten === filterKabupaten)
    : filteredDesaByKec;

  const fetchDesaList = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/desa');
      const data = await res.json();
      if (data.data) {
        setDesaList(data.data.map((d: { id: string; namaDesa: string; kecamatan: string; kabupaten: string }) => ({
          id: d.id,
          namaDesa: d.namaDesa,
          kecamatan: d.kecamatan || '',
          kabupaten: d.kabupaten || '',
        })));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchDesaList();
  }, [fetchDesaList]);

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingUser(null);
    setShowPassword(false);
  };

  const openAddModal = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setFormData({
      namaLengkap: user.namaLengkap,
      username: user.username,
      email: user.email,
      noHp: user.noHp || '',
      password: '',
      confirmPassword: '',
      role: user.role,
      status: user.status,
      desaId: user.desaId || '',
    });
    setShowForm(true);
  };

  const validateForm = (): boolean => {
    if (!formData.namaLengkap.trim()) { toast.error('Nama lengkap wajib diisi'); return false; }
    if (!editingUser && !formData.username.trim()) { toast.error('Username wajib diisi'); return false; }
    if (!editingUser && formData.username.length < 3) { toast.error('Username minimal 3 karakter'); return false; }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) { toast.error('Email tidak valid'); return false; }
    if (!editingUser && !formData.password) { toast.error('Password wajib diisi'); return false; }
    if (formData.password && formData.password.length < 6) { toast.error('Password minimal 6 karakter'); return false; }
    if (formData.password && formData.password !== formData.confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return false; }
    if (formData.role === 'ADMIN_DESA' || formData.role === 'OPERATOR') {
      if (!formData.desaId) { toast.error('Pilih desa untuk role ini'); return false; }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const body: Record<string, unknown> = {
        namaLengkap: formData.namaLengkap,
        email: formData.email,
        noHp: formData.noHp || null,
        role: formData.role,
        status: formData.status,
      };

      if (!editingUser) {
        body.username = formData.username;
        body.password = formData.password;
      }
      if (formData.password) body.password = formData.password;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingUser ? 'User berhasil diupdate' : 'User berhasil ditambahkan');
        setShowForm(false);
        resetForm();
        fetchUsers();
      } else {
        toast.error(data.error || 'Terjadi kesalahan');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        toast.success('User berhasil dihapus');
        setShowDeleteConfirm(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal menghapus');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    if (!resetPwdForm.password) { toast.error('Password wajib diisi'); return; }
    if (resetPwdForm.password.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    if (resetPwdForm.password !== resetPwdForm.confirm) { toast.error('Konfirmasi password tidak cocok'); return; }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPwdForm.password }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setShowResetPassword(false);
        setSelectedUser(null);
        setResetPwdForm({ password: '', confirm: '' });
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal reset password');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const newStatus = selectedUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Status user berhasil diubah');
        setShowStatusConfirm(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal mengubah status');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = async (user: UserItem) => {
    setSelectedUser(user);
    setShowDetail(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`);
      const data = await res.json();
      if (data.success) setUserDetail(data.data);
    } catch {
      // ignore
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      SUPER_ADMIN: 'bg-purple-100 text-purple-700',
      ADMIN_DESA: 'bg-amber-100 text-amber-700',
      OPERATOR: 'bg-cyan-100 text-cyan-700',
      WARGA: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN_DESA: 'Admin Desa',
      OPERATOR: 'Operator',
      WARGA: 'Warga',
    };
    return <Badge className={colors[role] || 'bg-gray-100 text-gray-700'}>{labels[role] || role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return <Badge className={opt?.color || 'bg-gray-100 text-gray-700'}>{opt?.label || status}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kelola User</h2>
          <p className="text-gray-500 mt-1">Kelola semua pengguna sistem AKSIDESA</p>
        </div>
        <Button onClick={openAddModal} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <User className="w-4 h-4 mr-2" />
          Tambah User
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><User className="w-5 h-5 text-blue-600" /></div>
              <div><p className="text-sm text-gray-500">Total User</p><p className="text-xl font-bold">{total}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
              <div><p className="text-sm text-gray-500">Aktif</p><p className="text-xl font-bold">{users.filter((u) => u.status === 'ACTIVE').length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg"><Shield className="w-5 h-5 text-amber-600" /></div>
              <div><p className="text-sm text-gray-500">Admin Desa</p><p className="text-xl font-bold">{users.filter((u) => u.role === 'ADMIN_DESA').length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg"><Building2 className="w-5 h-5 text-green-600" /></div>
              <div><p className="text-sm text-gray-500">Online</p><p className="text-xl font-bold">{users.filter((u) => u.isOnline).length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Cari nama, username, atau email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
            <Select value={filterRole || 'all'} onValueChange={(v) => { setFilterRole(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Semua Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterKabupaten || 'all'} onValueChange={(v) => { setFilterKabupaten(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Semua Kabupaten" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kabupaten</SelectItem>
                {kabupatenList.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterKecamatan || 'all'} onValueChange={(v) => { setFilterKecamatan(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Semua Kecamatan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kecamatan</SelectItem>
                {(filterKabupaten
                  ? kecamatanList.filter((k) => desaList.some((d) => d.kabupaten === filterKabupaten && d.kecamatan === k))
                  : kecamatanList
                ).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterDesa || 'all'} onValueChange={(v) => { setFilterDesa(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Semua Desa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Desa</SelectItem>
                {filteredDesaByKab.map((d) => <SelectItem key={d.id} value={d.id}>{d.namaDesa}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus || 'all'} onValueChange={(v) => { setFilterStatus(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Semua Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  {['No', 'User', 'Desa', 'Kecamatan', 'Kabupaten', 'Role', 'Status', 'Login Terakhir', 'Aksi'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-gray-400 mx-auto mb-2" />
                    <span className="text-gray-500">Memuat data...</span>
                  </td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <User className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    Tidak ada data user
                  </td></tr>
                ) : users.map((user, idx) => (
                  <motion.tr key={user.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{(page - 1) * 10 + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium text-xs">
                              {user.namaLengkap.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          {user.isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
                            {user.namaLengkap}
                            {user.isFirstChild && <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">SA</Badge>}
                          </p>
                          <p className="text-xs text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{user.desa?.namaDesa || <span className="text-gray-400">-</span>}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{user.desa?.kecamatan || <span className="text-gray-400">-</span>}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{user.desa?.kabupaten || <span className="text-gray-400">-</span>}</p>
                    </td>
                    <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {getStatusBadge(user.status)}
                        {user.wajibGantiPassword && <Badge className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0"><KeyRound className="w-2.5 h-2.5 mr-0.5" />Reset</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(user.lastLoginAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetail(user)} className="text-gray-600 hover:text-blue-600 hover:bg-blue-50">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(user)} disabled={user.isFirstChild} className="text-gray-600 hover:text-emerald-600 hover:bg-emerald-50">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-gray-600 hover:bg-gray-100" disabled={user.isFirstChild}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setResetPwdForm({ password: '', confirm: '' }); setShowResetPassword(true); }} className="text-amber-600">
                              <KeyRound className="w-4 h-4 mr-2" />Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setShowStatusConfirm(true); }} className={user.status === 'ACTIVE' ? 'text-red-600' : 'text-emerald-600'}>
                              <Power className="w-4 h-4 mr-2" />{user.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { setSelectedUser(user); setShowDeleteConfirm(true); }} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />Hapus
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} dari {total}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Sebelumnya</Button>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pn: number;
                    if (totalPages <= 5) pn = i + 1;
                    else if (page <= 3) pn = i + 1;
                    else if (page >= totalPages - 2) pn = totalPages - 4 + i;
                    else pn = page - 2 + i;
                    return (
                      <Button key={pn} variant={page === pn ? 'default' : 'outline'} size="sm" onClick={() => setPage(pn)} className={cn('w-8 h-8 p-0', page === pn && 'bg-emerald-600 hover:bg-emerald-700')}>
                        {pn}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Selanjutnya</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit User Modal */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nama Lengkap <span className="text-red-500">*</span></Label>
              <Input value={formData.namaLengkap} onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })} placeholder="Nama lengkap" />
            </div>
            <div className="space-y-1.5">
              <Label>Username <span className="text-red-500">*</span></Label>
              <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="Username" disabled={!!editingUser} />
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-red-500">*</span></Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="Email" />
            </div>
            <div className="space-y-1.5">
              <Label>No. HP</Label>
              <Input value={formData.noHp} onChange={(e) => setFormData({ ...formData, noHp: e.target.value })} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role <span className="text-red-500">*</span></Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih role" /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih status" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(formData.role === 'ADMIN_DESA' || formData.role === 'OPERATOR') && (
              <div className="space-y-1.5">
                <Label>Desa <span className="text-red-500">*</span></Label>
                <Select value={formData.desaId} onValueChange={(v) => setFormData({ ...formData, desaId: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih desa" /></SelectTrigger>
                  <SelectContent>
                    {desaList.map((d) => <SelectItem key={d.id} value={d.id}>{d.namaDesa}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>
                Password {!editingUser && <span className="text-red-500">*</span>}
                {editingUser && <span className="text-gray-400 text-xs">(kosongkan jika tidak diubah)</span>}
              </Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Min. 6 karakter" className="pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {formData.password && (
              <div className="space-y-1.5">
                <Label>Konfirmasi Password</Label>
                <Input type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="Ulangi password" />
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Batal</Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                {submitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : editingUser ? 'Update' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={showResetPassword} onOpenChange={(open) => { if (!open) setShowResetPassword(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600"><KeyRound className="w-5 h-5" />Reset Password</DialogTitle>
            <DialogDescription>Atur password baru untuk user <strong>{selectedUser?.namaLengkap}</strong></DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Password Baru</Label>
              <div className="relative">
                <Input type={showResetPwd ? 'text' : 'password'} value={resetPwdForm.password} onChange={(e) => setResetPwdForm({ ...resetPwdForm, password: e.target.value })} placeholder="Min. 6 karakter" className="pr-10" />
                <button type="button" onClick={() => setShowResetPwd(!showResetPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showResetPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Konfirmasi Password</Label>
              <Input type="password" value={resetPwdForm.confirm} onChange={(e) => setResetPwdForm({ ...resetPwdForm, confirm: e.target.value })} placeholder="Ulangi password" />
            </div>
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              User akan di-logout dari semua device dan wajib mengganti password saat login berikutnya.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPassword(false)}>Batal</Button>
            <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleResetPassword} disabled={submitting}>
              {submitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Memproses...</> : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><AlertCircle className="w-5 h-5" />Hapus User</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">Yakin ingin menghapus user <strong>{selectedUser?.namaLengkap}</strong>?</p>
            <p className="text-sm text-red-500 mt-2">Data akan dihapus permanen.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Menghapus...</> : 'Hapus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Toggle */}
      <Dialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className={cn('flex items-center gap-2', selectedUser?.status === 'ACTIVE' ? 'text-red-600' : 'text-emerald-600')}>
              <Power className="w-5 h-5" />
              {selectedUser?.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'} User
            </DialogTitle>
          </DialogHeader>
          <p className="py-4 text-gray-600">
            Yakin ingin {selectedUser?.status === 'ACTIVE' ? 'menonaktifkan' : 'mengaktifkan'} user <strong>{selectedUser?.namaLengkap}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusConfirm(false)}>Batal</Button>
            <Button onClick={handleToggleStatus} disabled={submitting}>
              {submitting ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Memproses...</> : 'Ya, Lanjutkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><User className="w-5 h-5" />Detail User</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {selectedUser.namaLengkap.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedUser.namaLengkap}</h3>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                  <div className="flex gap-2 mt-1">{getRoleBadge(selectedUser.role)} {getStatusBadge(selectedUser.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Email</span><p className="font-medium">{selectedUser.email}</p></div>
                <div><span className="text-gray-500">No. HP</span><p className="font-medium">{selectedUser.noHp || '-'}</p></div>
                <div><span className="text-gray-500">Desa</span><p className="font-medium">{selectedUser.desa?.namaDesa || '-'}</p></div>
                <div><span className="text-gray-500">Login Terakhir</span><p className="font-medium">{formatDate(selectedUser.lastLoginAt)}</p></div>
                <div><span className="text-gray-500">Terdaftar</span><p className="font-medium">{formatDate(selectedUser.createdAt)}</p></div>
                <div>
                  <span className="text-gray-500">Wajib Ganti Password</span>
                  <p className="font-medium">{selectedUser.wajibGantiPassword ? 'Ya' : 'Tidak'}</p>
                </div>
              </div>

              {/* Sessions */}
              {userDetail && (userDetail as Record<string, unknown[]>).sessions && ((userDetail as Record<string, unknown[]>).sessions as Array<Record<string, unknown>>).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Session Aktif</h4>
                  <div className="space-y-2">
                    {((userDetail as Record<string, unknown[]>).sessions as Array<Record<string, unknown>>).map((s) => (
                      <div key={s.id as string} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{(s.deviceInfo as string) || 'Unknown'}</span>
                          <Badge className="bg-green-100 text-green-700 text-xs">Aktif</Badge>
                        </div>
                        <p className="text-gray-400 text-xs mt-1">Terakhir: {formatDate(s.lastActivityAt as string)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Logs */}
              {userDetail && (userDetail as Record<string, unknown[]>).logAktivitas && ((userDetail as Record<string, unknown[]>).logAktivitas as Array<Record<string, unknown>>).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Log Aktivitas Terakhir</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {((userDetail as Record<string, unknown[]>).logAktivitas as Array<Record<string, unknown>>).map((log) => (
                      <div key={log.id as string} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{log.aksi as string}</span>
                          <span className="text-gray-400 text-xs">{formatDate(log.createdAt as string)}</span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">{log.deskripsi as string}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
