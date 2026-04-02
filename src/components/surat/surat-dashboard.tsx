'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  List,
  BarChart3,
  ArrowRight,
  Loader2,
  TrendingUp,
  Timer,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { SuratStatusBadge } from './surat-status-badge';
import { getKategoriLabel } from '@/lib/surat-utils';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { cn } from '@/lib/utils';

// ============ TYPES ============

interface StatistikData {
  totalSurat: number;
  statusCounts: Record<string, number>;
  kategoriCounts: Record<string, number>;
  monthlyTrend: MonthlyTrendItem[];
  topJenis: TopJenisItem[];
  recentSurat: RecentSuratItem[];
  metrics: MetricsData;
}

interface MonthlyTrendItem {
  bulan: string;
  bulanNum: number;
  tahun: number;
  total: number;
  selesai: number;
  ditolak: number;
}

interface TopJenisItem {
  id: string;
  nama: string;
  kategori: string | null;
  total: number;
}

interface RecentSuratItem {
  id: string;
  nomorSurat: string | null;
  nomorRegisterFmt: string | null;
  jenisSurat: { id: string; nama: string; kategori: string };
  pemohon: { id: string; namaLengkap: string; nik: string } | null;
  pemohonNama: string;
  status: string;
  createdAt: string;
  tanggalAjukan: string | null;
}

interface MetricsData {
  avgProcessingDays: number;
  completionRate: number;
  rejectionRate: number;
  pendingCount: number;
}

interface SuratDashboardProps {
  onNavigate?: (menu: string) => void;
}

// ============ COLORS ============

const COLORS = ['#10b981', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// ============ CHART TOOLTIP ============

function BarChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-sm">
      <p className="font-medium text-gray-900">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function PieChartTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number; payload?: { percentage: number } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-sm">
      <p className="font-medium text-gray-900">{d.name}</p>
      <p className="text-gray-600">{d.value} surat</p>
    </div>
  );
}

// ============ STAT CARD ============

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  gradient: string;
  iconBg: string;
  delay: number;
}

function StatCard({ icon, label, value, gradient, iconBg, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className={cn(
        'border-0 shadow-sm bg-gradient-to-br transition-all duration-300 hover:shadow-md hover:-translate-y-0.5',
        gradient,
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn('p-2.5 rounded-xl shrink-0', iconBg)}>
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">
                {value.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============ METRIC CARD ============

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  color: string;
}

function MetricCard({ icon, label, value, subtext, color }: MetricCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
      <div className={cn('p-2 rounded-lg', color)}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-gray-900">{value}</p>
        {subtext && <p className="text-[10px] text-gray-400">{subtext}</p>}
      </div>
    </div>
  );
}

// ============ EMPTY STATE ============

function EmptyDashboard() {
  return (
    <div className="text-center py-16">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <FileText className="w-10 h-10 text-emerald-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Belum Ada Surat</h3>
      <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
        Mulai kelola pelayanan surat desa dengan mengajukan surat baru.
      </p>
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function SuratDashboard({ onNavigate }: SuratDashboardProps) {
  const [data, setData] = useState<StatistikData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistik = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/surat/statistik?periode=bulan');
      if (!response.ok) throw new Error('Gagal mengambil data');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Gagal memuat data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatistik();
  }, [fetchStatistik]);

  // Format recent surat date
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
          <Card><CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gagal Memuat Data</h3>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button onClick={fetchStatistik} variant="outline">
            <Loader2 className="w-4 h-4 mr-2" />
            Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  if (!data || data.totalSurat === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Pelayanan Surat</h2>
            <p className="text-sm text-gray-500 mt-1">Kelola pelayanan surat desa</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onNavigate?.('surat-list')}>
              <List className="w-4 h-4 mr-2" />
              Daftar Surat
            </Button>
            <Button onClick={() => onNavigate?.('surat-ajukan')}>
              <Plus className="w-4 h-4 mr-2" />
              Ajukan Surat
            </Button>
          </div>
        </div>
        <EmptyDashboard />
      </div>
    );
  }

  const pendingCount = data.metrics.pendingCount;
  const selesaiBulanIni = data.statusCounts.SELESAI + data.statusCounts.DITANDATANGANI || 0;
  const ditolakCount = data.statusCounts.DITOLAK || 0;

  // Bar chart data
  const barData = data.monthlyTrend.map((item) => ({
    name: item.bulan,
    total: item.total,
    selesai: item.selesai,
    ditolak: item.ditolak,
  }));

  // Pie chart data
  const pieData = Object.entries(data.kategoriCounts)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: getKategoriLabel(key),
      value,
    }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pelayanan Surat</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola pelayanan surat desa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onNavigate?.('surat-list')}>
            <List className="w-4 h-4 mr-2" />
            Daftar Surat
          </Button>
          <Button onClick={() => onNavigate?.('surat-ajukan')}>
            <Plus className="w-4 h-4 mr-2" />
            Ajukan Surat
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<FileText className="w-5 h-5 text-blue-600" />}
          label="Total Surat"
          value={data.totalSurat}
          gradient="from-blue-50 to-blue-100/50"
          iconBg="bg-blue-100"
          delay={0}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          label="Menunggu Proses"
          value={pendingCount}
          gradient="from-amber-50 to-amber-100/50"
          iconBg="bg-amber-100"
          delay={0.1}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          label="Selesai Bulan Ini"
          value={selesaiBulanIni}
          gradient="from-emerald-50 to-emerald-100/50"
          iconBg="bg-emerald-100"
          delay={0.2}
        />
        <StatCard
          icon={<XCircle className="w-5 h-5 text-red-600" />}
          label="Ditolak"
          value={ditolakCount}
          gradient="from-red-50 to-red-100/50"
          iconBg="bg-red-100"
          delay={0.3}
        />
      </div>

      {/* Performance Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <MetricCard
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          label="Rasio Selesai"
          value={`${data.metrics.completionRate}%`}
          subtext={`${data.totalSurat} total surat`}
          color="bg-emerald-50"
        />
        <MetricCard
          icon={<Timer className="w-4 h-4 text-blue-600" />}
          label="Rata-rata Proses"
          value={`${data.metrics.avgProcessingDays} hari`}
          subtext="Dari pengajuan hingga selesai"
          color="bg-blue-50"
        />
        <MetricCard
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          label="Rasio Penolakan"
          value={`${data.metrics.rejectionRate}%`}
          subtext={ditolakCount > 0 ? `${ditolakCount} surat ditolak` : 'Tidak ada penolakan'}
          color="bg-amber-50"
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                Surat per Bulan (12 Bulan Terakhir)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<BarChartTooltip />} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="total" name="Total" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={18} />
                  <Bar dataKey="selesai" name="Selesai" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} />
                  <Bar dataKey="ditolak" name="Ditolak" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Kategori Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Surat per Kategori
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px]">
                  <p className="text-gray-400 text-sm">Belum ada data kategori</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Section: Top Jenis + Recent Surat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Surat Jenis */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Surat Terbanyak
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                {data.topJenis.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                      idx === 0 && 'bg-amber-100 text-amber-700',
                      idx === 1 && 'bg-gray-200 text-gray-600',
                      idx === 2 && 'bg-orange-100 text-orange-700',
                      idx > 2 && 'bg-gray-100 text-gray-500',
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.nama}</p>
                      <p className="text-[11px] text-gray-400">{item.kategori ? getKategoriLabel(item.kategori) : '-'}</p>
                    </div>
                    <Badge variant="secondary" className="font-semibold">
                      {item.total}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Surat */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  Surat Terbaru
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                  onClick={() => onNavigate?.('surat-list')}
                >
                  Lihat Semua <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {data.recentSurat.map((surat) => (
                  <div
                    key={surat.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.(`surat-detail-${surat.id}`)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {surat.jenisSurat.nama}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {surat.pemohon?.namaLengkap || surat.pemohonNama} &middot; {formatDate(surat.createdAt)}
                      </p>
                    </div>
                    <SuratStatusBadge status={surat.status} size="sm" />
                  </div>
                ))}
                {data.recentSurat.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Belum ada surat</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    </div>
  );
}
