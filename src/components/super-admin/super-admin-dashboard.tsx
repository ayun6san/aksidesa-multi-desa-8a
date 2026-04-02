'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  MapPin,
  UserCheck,
  Plus,
  Search,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { SuperAdminUserManagement } from '@/components/super-admin/user-management';

// Types
interface CurrentUser {
  id: string;
  namaLengkap: string;
  username: string;
  email: string;
  role: string;
  desaId?: string;
  desa?: {
    id: string;
    namaDesa: string;
    slug: string;
  } | null;
}

interface Desa {
  id: string;
  namaDesa: string;
  slug: string;
  kodeDesa: string;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  paket: string;
  isActive: boolean;
  createdAt: string;
  _count?: {
    users: number;
    dusun: number;
    kk: number;
    penduduk: number;
  };
}

interface Statistik {
  totalDesa: number;
  activeDesa: number;
  inactiveDesa: number;
  totalUsers: number;
  totalAdminDesa: number;
  totalOperator: number;
  totalWarga: number;
  totalDusun: number;
  totalRW: number;
  totalRT: number;
  totalKK: number;
  totalPenduduk: number;
}

interface SuperAdminDashboardProps {
  user: CurrentUser;
  onLogout: () => void;
}

type ActiveMenu = 'dashboard' | 'desa' | 'users' | 'settings';

// Menu items
const menuItems: { id: ActiveMenu; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'desa', label: 'Kelola Desa', icon: Building2 },
  { id: 'users', label: 'Kelola User', icon: Users },
  { id: 'settings', label: 'Pengaturan', icon: Settings },
];

export function SuperAdminDashboard({ user, onLogout }: SuperAdminDashboardProps) {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [statistik, setStatistik] = useState<Statistik | null>(null);
  const [desaList, setDesaList] = useState<Desa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [showDesaDialog, setShowDesaDialog] = useState(false);
  const [desaFormLoading, setDesaFormLoading] = useState(false);

  // Form states
  const [desaForm, setDesaForm] = useState({
    namaDesa: '',
    kodeDesa: '',
    kodePos: '',
    kecamatan: '',
    kabupaten: '',
    provinsi: 'Jawa Barat',
    alamatKantor: '',
    telepon: '',
    email: '',
    createAdmin: false,
    adminNamaLengkap: '',
    adminUsername: '',
    adminEmail: '',
    adminNoHp: '',
    adminPassword: '',
  });

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  // Handle logout function
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      onLogout();
    }
  }, [onLogout]);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      handleLogout();
    }, IDLE_TIMEOUT);
  }, [handleLogout]);

  // Auto logout on idle
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer);
    });

    resetIdleTimer();

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [resetIdleTimer]);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statRes, desaRes] = await Promise.all([
        fetch('/api/admin/statistik'),
        fetch('/api/admin/desa'),
      ]);

      if (statRes.ok) {
        const statData = await statRes.json();
        setStatistik(statData.data.summary);
      }

      if (desaRes.ok) {
        const desaData = await desaRes.json();
        setDesaList(desaData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle create desa
  const handleCreateDesa = async () => {
    setDesaFormLoading(true);
    try {
      const response = await fetch('/api/admin/desa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(desaForm),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Gagal membuat desa');
        return;
      }

      toast.success('Desa berhasil dibuat');
      setShowDesaDialog(false);
      resetDesaForm();
      fetchData();
    } catch (error) {
      console.error('Error creating desa:', error);
      toast.error('Terjadi kesalahan');
    } finally {
      setDesaFormLoading(false);
    }
  };

  // Handle toggle desa status
  const handleToggleDesaStatus = async (desa: Desa) => {
    try {
      const response = await fetch(`/api/admin/desa/${desa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !desa.isActive }),
      });

      if (!response.ok) {
        toast.error('Gagal mengubah status desa');
        return;
      }

      toast.success(`Desa berhasil ${desa.isActive ? 'dinonaktifkan' : 'diaktifkan'}`);
      fetchData();
    } catch (error) {
      console.error('Error toggling desa status:', error);
      toast.error('Terjadi kesalahan');
    }
  };

  // Reset form
  const resetDesaForm = () => {
    setDesaForm({
      namaDesa: '',
      kodeDesa: '',
      kodePos: '',
      kecamatan: '',
      kabupaten: '',
      provinsi: 'Jawa Barat',
      alamatKantor: '',
      telepon: '',
      email: '',
      createAdmin: false,
      adminNamaLengkap: '',
      adminUsername: '',
      adminEmail: '',
      adminNoHp: '',
      adminPassword: '',
    });
  };

  // Filter desa by search
  const filteredDesa = desaList.filter(desa =>
    desa.namaDesa.toLowerCase().includes(searchQuery.toLowerCase()) ||
    desa.kodeDesa.includes(searchQuery) ||
    desa.kabupaten.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render content based on menu
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      );
    }

    switch (activeMenu) {
      case 'dashboard':
        return renderDashboard();
      case 'desa':
        return renderDesaManagement();
      case 'users':
        return renderUsersManagement();
      case 'settings':
        return renderSettings();
      default:
        return renderDashboard();
    }
  };

  // Dashboard content
  const renderDashboard = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Super Admin</h1>
        <p className="text-gray-500">Selamat datang, {user.namaLengkap}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Desa</CardTitle>
            <Building2 className="w-5 h-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistik?.totalDesa || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {statistik?.activeDesa || 0} aktif, {statistik?.inactiveDesa || 0} nonaktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Penduduk</CardTitle>
            <Users className="w-5 h-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistik?.totalPenduduk?.toLocaleString() || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {statistik?.totalKK?.toLocaleString() || 0} KK terdaftar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total User</CardTitle>
            <UserCheck className="w-5 h-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistik?.totalUsers || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {statistik?.totalAdminDesa || 0} Admin, {statistik?.totalOperator || 0} Operator
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Wilayah</CardTitle>
            <MapPin className="w-5 h-5 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistik?.totalDusun || 0} Dusun</div>
            <p className="text-xs text-gray-500 mt-1">
              {statistik?.totalRW || 0} RW, {statistik?.totalRT || 0} RT
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Desa */}
      <Card>
        <CardHeader>
          <CardTitle>Desa Terbaru</CardTitle>
          <CardDescription>Daftar desa yang baru terdaftar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredDesa.slice(0, 5).map((desa) => (
              <div key={desa.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium">{desa.namaDesa}</p>
                    <p className="text-sm text-gray-500">{desa.kecamatan}, {desa.kabupaten}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={desa.isActive ? 'default' : 'secondary'}>
                    {desa.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                  <Badge variant="outline">{desa.paket}</Badge>
                </div>
              </div>
            ))}
            {filteredDesa.length === 0 && (
              <p className="text-center text-gray-500 py-4">Belum ada desa terdaftar</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Desa management content
  const renderDesaManagement = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Desa</h1>
        <Button onClick={() => setShowDesaDialog(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Desa
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Cari desa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Desa Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Desa
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lokasi
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paket
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statistik
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredDesa.map((desa) => (
                  <tr key={desa.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{desa.namaDesa}</p>
                          <p className="text-sm text-gray-500">Kode: {desa.kodeDesa}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{desa.kecamatan}</p>
                      <p className="text-sm text-gray-500">{desa.kabupaten}, {desa.provinsi}</p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline">{desa.paket}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p>{desa._count?.penduduk || 0} penduduk</p>
                        <p className="text-gray-500">{desa._count?.users || 0} user</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={desa.isActive ? 'default' : 'secondary'}>
                        {desa.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <X className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleDesaStatus(desa)}>
                            {desa.isActive ? (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Nonaktifkan
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Aktifkan
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredDesa.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? 'Tidak ada desa yang cocok' : 'Belum ada desa terdaftar'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // Users management content
  const renderUsersManagement = () => <SuperAdminUserManagement />;

  // Settings content
  const renderSettings = () => (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>

      <Card>
        <CardContent className="p-8 text-center">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Pengaturan Sistem</h3>
          <p className="text-gray-500">Fitur ini dalam pengembangan...</p>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-emerald-700 to-teal-800 text-white transition-transform duration-300',
          !sidebarOpen && '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-bold text-lg">AKSIDESA</h1>
              <p className="text-xs text-emerald-200">Super Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                activeMenu === item.id
                  ? 'bg-white/20 text-white'
                  : 'text-emerald-100 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {activeMenu === item.id && (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium">{user.namaLengkap.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.namaLengkap}</p>
              <p className="text-xs text-emerald-200">Super Admin</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full text-emerald-100 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn('flex-1 transition-all duration-300', sidebarOpen && 'ml-64')}>
        {/* Top Bar */}
        <header className="bg-white border-b sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Super Admin
              </Badge>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-73px)]">
          <motion.div
            key={activeMenu}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </main>

        {/* Footer - sticky to bottom */}
        <footer className="mt-auto bg-card border-t border-border px-6 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} AKSIDESA - Sistem Informasi Digital Desa</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
              Versi 1.0.0
            </span>
          </div>
        </footer>
      </div>

      {/* Dialog Tambah Desa */}
      <Dialog open={showDesaDialog} onOpenChange={setShowDesaDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Desa Baru</DialogTitle>
            <DialogDescription>
              Isi data desa dan admin desa pertama
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Desa Data */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Data Desa</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nama Desa *</Label>
                  <Input
                    value={desaForm.namaDesa}
                    onChange={(e) => setDesaForm({ ...desaForm, namaDesa: e.target.value })}
                    placeholder="Nama desa"
                  />
                </div>
                <div>
                  <Label>Kode Desa *</Label>
                  <Input
                    value={desaForm.kodeDesa}
                    onChange={(e) => setDesaForm({ ...desaForm, kodeDesa: e.target.value })}
                    placeholder="Kode desa"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Kecamatan *</Label>
                  <Input
                    value={desaForm.kecamatan}
                    onChange={(e) => setDesaForm({ ...desaForm, kecamatan: e.target.value })}
                    placeholder="Kecamatan"
                  />
                </div>
                <div>
                  <Label>Kabupaten *</Label>
                  <Input
                    value={desaForm.kabupaten}
                    onChange={(e) => setDesaForm({ ...desaForm, kabupaten: e.target.value })}
                    placeholder="Kabupaten"
                  />
                </div>
                <div>
                  <Label>Provinsi *</Label>
                  <Input
                    value={desaForm.provinsi}
                    onChange={(e) => setDesaForm({ ...desaForm, provinsi: e.target.value })}
                    placeholder="Provinsi"
                  />
                </div>
              </div>
            </div>

            {/* Create Admin Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="createAdmin"
                checked={desaForm.createAdmin}
                onChange={(e) => setDesaForm({ ...desaForm, createAdmin: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="createAdmin">Buat Admin Desa sekarang</Label>
            </div>

            {/* Admin Desa Data */}
            {desaForm.createAdmin && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">Data Admin Desa</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nama Lengkap Admin *</Label>
                    <Input
                      value={desaForm.adminNamaLengkap}
                      onChange={(e) => setDesaForm({ ...desaForm, adminNamaLengkap: e.target.value })}
                      placeholder="Nama lengkap"
                    />
                  </div>
                  <div>
                    <Label>Username *</Label>
                    <Input
                      value={desaForm.adminUsername}
                      onChange={(e) => setDesaForm({ ...desaForm, adminUsername: e.target.value })}
                      placeholder="Username"
                    />
                  </div>
                  <div>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={desaForm.adminEmail}
                      onChange={(e) => setDesaForm({ ...desaForm, adminEmail: e.target.value })}
                      placeholder="Email"
                    />
                  </div>
                  <div>
                    <Label>No. HP *</Label>
                    <Input
                      value={desaForm.adminNoHp}
                      onChange={(e) => setDesaForm({ ...desaForm, adminNoHp: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={desaForm.adminPassword}
                      onChange={(e) => setDesaForm({ ...desaForm, adminPassword: e.target.value })}
                      placeholder="Min. 6 karakter"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDesaDialog(false)}>
              Batal
            </Button>
            <Button
              onClick={handleCreateDesa}
              disabled={desaFormLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {desaFormLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
