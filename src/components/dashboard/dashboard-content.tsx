'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Home, 
  UserPlus, 
  HeartCrack, 
  Heart,
  Download,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StatistikData {
  totalPenduduk: number;
  totalKK: number;
  pendatang: number;
  kematian: number;
  kelahiran: number;
  pindah: number;
  totalYatimPiatu: number;
}

interface DashboardContentProps {
  statistik: StatistikData;
  onNavigate?: (menu: string) => void;
}

interface MonitoringData {
  summary?: {
    totalPenduduk: number;
    totalLakiLaki: number;
    totalPerempuan: number;
    totalKK: number;
    pendatangAktif: number;
  };
  monthlyData: Array<{
    bulan: number;
    namaBulan: string;
    kelahiran: number;
    kematian: number;
    pindahMasuk: number;
    pindahKeluar: number;
  }>;
  ageDistribution: Array<{
    group: string;
    lakiLaki: number;
    perempuan: number;
    total: number;
  }>;
}

interface LogAktivitas {
  id: string;
  aksi: string;
  modul: string;
  deskripsi: string | null;
  createdAt: string;
  user: {
    namaLengkap: string;
    username: string;
    role: string;
  } | null;
}

function getFormattedDate() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function DashboardContent({ statistik, onNavigate }: DashboardContentProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [recentActivities, setRecentActivities] = useState<LogAktivitas[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [monitoringRes, logRes] = await Promise.all([
          fetch('/api/kependudukan/monitoring'),
          fetch('/api/log-aktivitas?limit=5'),
        ]);

        if (monitoringRes.ok) {
          const json = await monitoringRes.json();
          if (json.success) {
            setMonitoringData(json.data);
          }
        }

        if (logRes.ok) {
          const json = await logRes.json();
          if (json.success) {
            setRecentActivities(json.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Export age group data to CSV
  const handleExportAgeGroup = () => {
    if (ageGroupChartData.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }

    const headers = ['Kelompok Usia', 'Jumlah'];
    const rows = ageGroupChartData.map(item => [item.kelompok, item.jumlah]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `data_kelompok_usia_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);

    toast.success('Data kelompok usia berhasil diunduh');
  };

  // Build chart data from real API responses
  const monthlyChartData = monitoringData?.monthlyData.map(m => ({
    bulan: m.namaBulan,
    kelahiran: m.kelahiran,
    kematian: m.kematian,
    pindahMasuk: m.pindahMasuk,
    pindahKeluar: m.pindahKeluar,
  })) ?? [];

  // FIX: Use real gender data from monitoring API instead of fake half-split
  const totalLakiLaki = monitoringData?.summary?.totalLakiLaki ?? 0;
  const totalPerempuan = monitoringData?.summary?.totalPerempuan ?? 0;
  const genderChartData = [
    { name: 'Laki-laki', value: totalLakiLaki, color: '#10b981' },
    { name: 'Perempuan', value: totalPerempuan, color: '#f59e0b' },
  ];

  const ageGroupChartData = monitoringData?.ageDistribution.map(a => ({
    kelompok: a.group,
    jumlah: a.total,
  })) ?? [];

  const statCards = [
    {
      title: 'Total Penduduk',
      value: statistik.totalPenduduk,
      icon: Users,
      color: 'bg-primary',
      bgColor: 'bg-primary/5',
      textColor: 'text-primary',
    },
    {
      title: 'Total KK',
      value: statistik.totalKK,
      icon: Home,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-500/5',
      textColor: 'text-emerald-600',
    },
    {
      title: 'Kelahiran',
      value: statistik.kelahiran,
      icon: UserPlus,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-500/5',
      textColor: 'text-amber-600',
    },
    {
      title: 'Kematian',
      value: statistik.kematian,
      icon: HeartCrack,
      color: 'bg-red-500',
      bgColor: 'bg-red-500/5',
      textColor: 'text-red-600',
    },
    {
      title: 'Yatim Piatu',
      value: statistik.totalYatimPiatu,
      icon: Heart,
      color: 'bg-rose-500',
      bgColor: 'bg-rose-500/5',
      textColor: 'text-rose-600',
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-muted rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-foreground">Selamat Datang</h2>
          <p className="text-muted-foreground mt-1">{getFormattedDate()}</p>
          <p className="text-sm text-muted-foreground/80 mt-2">
            Berikut ringkasan data desa Anda hari ini. Pantau perkembangan dan kelola administrasi desa dengan mudah.
          </p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
            >
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={cn('p-3 rounded-xl', stat.bgColor)}>
                      <Icon className={cn('w-5 h-5', stat.textColor)} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {stat.value.toLocaleString('id-ID')}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Population Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2"
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Peristiwa Kependudukan Bulanan
              </CardTitle>
              {/* Placeholder for future chart actions */}
            </CardHeader>
            <CardContent>
              {monthlyChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="bulan" stroke="#9ca3af" fontSize={12} />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                          padding: '12px'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="kelahiran" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={{ fill: '#10b981', strokeWidth: 2 }}
                        name="Kelahiran"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="kematian" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        dot={{ fill: '#ef4444', strokeWidth: 2 }}
                        name="Kematian"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pindahMasuk" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                        name="Pindah Masuk"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pindahKeluar" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                        name="Pindah Keluar"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-400 text-sm">
                  Belum ada data peristiwa kependudukan
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Gender Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Distribusi Jenis Kelamin
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalLakiLaki + totalPerempuan > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {genderChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                  Belum ada data distribusi gender
                </div>
              )}
              <div className="flex justify-center gap-6 mt-4">
                {genderChartData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {item.value.toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Age Group & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Age Group Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Kelompok Usia
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleExportAgeGroup}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {ageGroupChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageGroupChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                      <YAxis type="category" dataKey="kelompok" stroke="#9ca3af" fontSize={12} width={60} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                          padding: '12px'
                        }} 
                      />
                      <Bar dataKey="jumlah" fill="#10b981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                  Belum ada data kelompok usia
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Aktivitas Terbaru
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" onClick={() => onNavigate?.('log-aktivitas')}>
                Lihat Semua
              </Button>
            </CardHeader>
            <CardContent>
              {recentActivities.length > 0 ? (
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{activity.user?.namaLengkap || 'System'}</span>
                          {' '}{activity.aksi}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{formatRelativeTime(activity.createdAt)}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {activity.modul}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                  Belum ada aktivitas terbaru
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </div>
  );
}
