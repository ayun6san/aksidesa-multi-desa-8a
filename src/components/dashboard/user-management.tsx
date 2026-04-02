'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Power,
  MoreVertical,
  User,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Monitor,
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

interface User {
  id: string;
  namaLengkap: string;
  username: string;
  email: string;
  noHp: string | null;
  role: string;
  status: string;
  isFirstChild: boolean;
  lastLoginAt: string | null;
  lastDeviceInfo: string | null;
  createdAt: string;
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
};

const roleOptions = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', disabled: true },
  { value: 'ADMIN_DESA', label: 'Admin Desa', disabled: false },
  { value: 'OPERATOR', label: 'Operator', disabled: false },
];

const statusOptions = [
  { value: 'ACTIVE', label: 'Aktif', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'INACTIVE', label: 'Nonaktif', color: 'bg-gray-100 text-gray-700' },
  { value: 'SUSPENDED', label: 'Ditangguhkan', color: 'bg-red-100 text-red-700' },
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<UserFormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterRole) params.append('role', filterRole);
      if (filterStatus) params.append('status', filterStatus);
      params.append('page', page.toString());
      params.append('limit', '10');

      const response = await fetch(`/api/users?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data);
        setTotalPages(data.pagination.totalPages);
        setTotal(data.pagination.total);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Gagal mengambil data user');
    } finally {
      setLoading(false);
    }
  }, [search, filterRole, filterStatus, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset form
  const resetForm = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setEditingUser(null);
    setShowPassword(false);
  };

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setShowForm(true);
  };

  // Open edit modal
  const openEditModal = (user: User) => {
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
    });
    setShowForm(true);
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Partial<UserFormData> = {};

    if (!formData.namaLengkap.trim()) {
      errors.namaLengkap = 'Nama lengkap wajib diisi';
    }
    if (!formData.username.trim()) {
      errors.username = 'Username wajib diisi';
    } else if (formData.username.length < 3) {
      errors.username = 'Username minimal 3 karakter';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email wajib diisi';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Format email tidak valid';
    }
    if (!editingUser) {
      if (!formData.password) {
        errors.password = 'Password wajib diisi';
      } else if (formData.password.length < 6) {
        errors.password = 'Password minimal 6 karakter';
      }
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Konfirmasi password tidak cocok';
      }
    } else {
      if (formData.password && formData.password.length < 6) {
        errors.password = 'Password minimal 6 karakter';
      }
      if (formData.password && formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Konfirmasi password tidak cocok';
      }
    }
    if (!formData.role) {
      errors.role = 'Role wajib dipilih';
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
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const body: any = {
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

      if (formData.password) {
        body.password = formData.password;
      }



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
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete user
  const handleDelete = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success('User berhasil dihapus');
        setShowDeleteConfirm(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal menghapus user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset user
  const handleReset = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/reset`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowResetConfirm(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal mereset user');
      }
    } catch (error) {
      console.error('Error resetting user:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle status
  const handleToggleStatus = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${selectedUser.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: selectedUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setShowStatusConfirm(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        toast.error(data.error || 'Gagal mengubah status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    const roleColors: Record<string, string> = {
      SUPER_ADMIN: 'bg-purple-100 text-purple-700',
      ADMIN_DESA: 'bg-blue-100 text-blue-700',
      OPERATOR: 'bg-cyan-100 text-cyan-700',
      WARGA: 'bg-gray-100 text-gray-700',
    };
    const roleLabels: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN_DESA: 'Admin Desa',
      OPERATOR: 'Operator',
      WARGA: 'Warga',
    };
    return (
      <Badge className={roleColors[role] || 'bg-gray-100 text-gray-700'}>
        {roleLabels[role] || role}
      </Badge>
    );
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find((s) => s.value === status);
    return (
      <Badge className={statusConfig?.color || 'bg-gray-100 text-gray-700'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen User</h2>
          <p className="text-gray-500 mt-1">Kelola pengguna sistem AKSIDESA</p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total User</p>
                <p className="text-xl font-bold text-gray-900">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Aktif</p>
                <p className="text-xl font-bold text-gray-900">
                  {users.filter((u) => u.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Admin</p>
                <p className="text-xl font-bold text-gray-900">
                  {users.filter((u) => u.role === 'ADMIN_DESA' || u.role === 'SUPER_ADMIN').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Monitor className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Online</p>
                <p className="text-xl font-bold text-gray-900">
                  {users.filter((u) => u.isOnline).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nama, username, atau email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={filterRole}
              onValueChange={(value) => {
                setFilterRole(value === 'all' ? '' : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Semua Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Role</SelectItem>
                {roleOptions.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
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
                {statusOptions.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
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
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    No
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Kontak
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
                        <span className="text-gray-500">Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <User className="w-10 h-10 text-gray-300" />
                        <span className="text-gray-500">Tidak ada data user</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <motion.tr
                      key={user.id}
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
                          <div className="relative">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {user.namaLengkap
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            </div>
                            {user.isOnline && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 flex items-center gap-2">
                              {user.namaLengkap}
                              {user.isFirstChild && (
                                <Badge className="bg-purple-100 text-purple-700 text-xs">
                                  Super Admin
                                </Badge>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{user.email}</p>
                        <p className="text-sm text-gray-500">{user.noHp || '-'}</p>
                      </td>
                      <td className="px-4 py-3">{getRoleBadge(user.role)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(user.status)}
                          {user.isOnline && (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              Online
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-600">
                          {formatDate(user.lastLoginAt)}
                        </p>
                        {user.lastDeviceInfo && (
                          <p className="text-xs text-gray-400 truncate max-w-[150px]">
                            {user.lastDeviceInfo}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(user)}
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
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowResetConfirm(true);
                                }}
                                className="text-amber-600"
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reset (Force Logout)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowStatusConfirm(true);
                                }}
                                disabled={user.isFirstChild}
                                className={cn(
                                  user.status === 'ACTIVE'
                                    ? 'text-red-600'
                                    : 'text-emerald-600'
                                )}
                              >
                                <Power className="w-4 h-4 mr-2" />
                                {user.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteConfirm(true);
                                }}
                                disabled={user.isFirstChild}
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
                Menampilkan {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} dari{' '}
                {total} data
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

      {/* Add/Edit User Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Edit User' : 'Tambah User Baru'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nama Lengkap */}
            <div className="space-y-2">
              <Label htmlFor="namaLengkap">
                Nama Lengkap <span className="text-red-500">*</span>
              </Label>
              <Input
                id="namaLengkap"
                value={formData.namaLengkap}
                onChange={(e) =>
                  setFormData({ ...formData, namaLengkap: e.target.value })
                }
                placeholder="Masukkan nama lengkap"
                className={formErrors.namaLengkap ? 'border-red-500' : ''}
              />
              {formErrors.namaLengkap && (
                <p className="text-sm text-red-500">{formErrors.namaLengkap}</p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="Masukkan username"
                disabled={!!editingUser}
                className={formErrors.username ? 'border-red-500' : ''}
              />
              {formErrors.username && (
                <p className="text-sm text-red-500">{formErrors.username}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Masukkan email"
                className={formErrors.email ? 'border-red-500' : ''}
              />
              {formErrors.email && (
                <p className="text-sm text-red-500">{formErrors.email}</p>
              )}
            </div>

            {/* No HP */}
            <div className="space-y-2">
              <Label htmlFor="noHp">No. HP</Label>
              <Input
                id="noHp"
                value={formData.noHp}
                onChange={(e) =>
                  setFormData({ ...formData, noHp: e.target.value })
                }
                placeholder="Masukkan nomor HP"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Password{' '}
                {!editingUser && <span className="text-red-500">*</span>}
                {editingUser && (
                  <span className="text-gray-400 text-sm">
                    (kosongkan jika tidak ingin mengubah)
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="Masukkan password"
                  className={cn('pr-10', formErrors.password ? 'border-red-500' : '')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="text-sm text-red-500">{formErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                Konfirmasi Password{' '}
                {!editingUser && <span className="text-red-500">*</span>}
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                placeholder="Konfirmasi password"
                className={formErrors.confirmPassword ? 'border-red-500' : ''}
              />
              {formErrors.confirmPassword && (
                <p className="text-sm text-red-500">{formErrors.confirmPassword}</p>
              )}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">
                Role <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
                disabled={editingUser?.isFirstChild}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map((role) => (
                    <SelectItem 
                      key={role.value} 
                      value={role.value}
                      disabled={role.disabled}
                    >
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingUser?.isFirstChild && (
                <p className="text-xs text-amber-600">
                  Role Super Admin tidak dapat diubah
                </p>
              )}
              {formErrors.role && (
                <p className="text-sm text-red-500">{formErrors.role}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
                disabled={editingUser?.isFirstChild}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingUser?.isFirstChild && (
                <p className="text-xs text-amber-600">
                  Status Super Admin tidak dapat diubah
                </p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Menyimpan...
                  </>
                ) : editingUser ? (
                  'Update'
                ) : (
                  'Simpan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Hapus User
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Yakin ingin menghapus user{' '}
              <span className="font-semibold">{selectedUser?.namaLengkap}</span>?
            </p>
            <p className="text-sm text-red-500 mt-2">
              Data user akan dihapus permanen dan tidak dapat dikembalikan.
            </p>
          </div>
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
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                'Hapus'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Modal */}
      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <RefreshCw className="w-5 h-5" />
              Reset User
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Yakin ingin mereset user{' '}
              <span className="font-semibold">{selectedUser?.namaLengkap}</span>?
            </p>
            <p className="text-sm text-amber-600 mt-2">
              User akan dipaksa logout dari semua device yang aktif.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
            >
              Batal
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              onClick={handleReset}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Mereset...
                </>
              ) : (
                'Reset'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Toggle Confirmation Modal */}
      <Dialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle
              className={cn(
                'flex items-center gap-2',
                selectedUser?.status === 'ACTIVE'
                  ? 'text-red-600'
                  : 'text-emerald-600'
              )}
            >
              <Power className="w-5 h-5" />
              {selectedUser?.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'} User
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              Yakin ingin{' '}
              {selectedUser?.status === 'ACTIVE' ? 'menonaktifkan' : 'mengaktifkan'}{' '}
              user <span className="font-semibold">{selectedUser?.namaLengkap}</span>?
            </p>
            {selectedUser?.status === 'ACTIVE' && (
              <p className="text-sm text-red-500 mt-2">
                User tidak akan bisa login hingga diaktifkan kembali.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusConfirm(false)}
            >
              Batal
            </Button>
            <Button
              className={cn(
                selectedUser?.status === 'ACTIVE'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              )}
              onClick={handleToggleStatus}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : selectedUser?.status === 'ACTIVE' ? (
                'Nonaktifkan'
              ) : (
                'Aktifkan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
