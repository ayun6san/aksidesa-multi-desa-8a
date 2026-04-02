'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  User,
  Home,
  RefreshCw,
  Baby,
  HeartCrack,
  ArrowRightLeft,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface MonitoringData {
  periode: {
    tahun: number;
    bulan: number;
  };
  summary: {
    totalPenduduk: number;
    totalLakiLaki: number;
    totalPerempuan: number;
    totalKK: number;
    pendatangAktif: number;
  };
  peristiwaBulanIni: {
    kelahiran: number;
    kematian: number;
    pindahMasuk: number;
    pindahKeluar: number;
    perkawinan: number;
    perceraian: number;
  };
  dusunStats: Array<{
    id: string;
    nama: string;
    jumlahPenduduk: number;
    jumlahKK: number;
  }>;
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
  agamaDistribution: Array<{
    agama: string;
    jumlah: number;
  }>;
  pekerjaanDistribution: Array<{
    pekerjaan: string;
    jumlah: number;
  }>;
  pendidikanDistribution: Array<{
    pendidikan: string;
    jumlah: number;
  }>;
  statusPerkawinanDistribution: Array<{
    status: string;
    jumlah: number;
  }>;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

const agamaLabels: Record<string, string> = {
  ISLAM: 'Islam',
  KRISTEN: 'Kristen',
  KATOLIK: 'Katolik',
  HINDU: 'Hindu',
  BUDDHA: 'Buddha',
  KONGHUCU: 'Konghucu',
  LAINNYA: 'Lainnya',
};

const statusPerkawinanLabels: Record<string, string> = {
  BELUM_KAWIN: 'Belum Kawin',
  KAWIN_TERCATAT: 'Kawin Tercatat',
  KAWIN_TIDAK_TERCATAT: 'Kawin Tidak Tercatat',
  CERAI_HIDUP_TERCATAT: 'Cerai Hidup Tercatat',
  CERAI_HIDUP_TIDAK_TERCATAT: 'Cerai Hidup Tidak Tercatat',
  CERAI_MATI: 'Cerai Mati',
};

export function MonitoringData() {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
  ];

  // Fetch monitoring data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('tahun', tahun.toString());
      params.append('bulan', bulan.toString());

      const response = await fetch(`/api/kependudukan/monitoring?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Error fetching monitoring data:', error);
      toast.error('Gagal mengambil data monitoring');
    } finally {
      setLoading(false);
    }
  }, [tahun, bulan]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-gray-500">Memuat data monitoring...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          Tidak ada data monitoring tersedia
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Monitoring Data Kependudukan</h2>
          <p className="text-gray-500 mt-1">Statistik dan visualisasi data kependudukan</p>
        </div>
        <div className="flex gap-2">
          <Select
            value={bulan.toString()}
            onValueChange={(value) => setBulan(parseInt(value))}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Pilih bulan" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value.toString()}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={tahun.toString()}
            onValueChange={(value) => setTahun(parseInt(value))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Pilih tahun" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Penduduk</p>
                <p className="text-xl font-bold text-gray-900">{data.summary.totalPenduduk}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Laki-laki</p>
                <p className="text-xl font-bold text-gray-900">{data.summary.totalLakiLaki}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-50 rounded-lg">
                <User className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Perempuan</p>
                <p className="text-xl font-bold text-gray-900">{data.summary.totalPerempuan}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Home className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total KK</p>
                <p className="text-xl font-bold text-gray-900">{data.summary.totalKK}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <MapPin className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pendatang</p>
                <p className="text-xl font-bold text-gray-900">{data.summary.pendatangAktif}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peristiwa Bulan Ini */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Peristiwa Bulan {months.find(m => m.value === bulan)?.label} {tahun}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
            <div className="text-center p-4 bg-pink-50 rounded-lg">
              <Baby className="w-8 h-8 mx-auto text-pink-600 mb-2" />
              <p className="text-2xl font-bold text-pink-700">{data.peristiwaBulanIni.kelahiran}</p>
              <p className="text-sm text-pink-600">Kelahiran</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <HeartCrack className="w-8 h-8 mx-auto text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-gray-700">{data.peristiwaBulanIni.kematian}</p>
              <p className="text-sm text-gray-600">Kematian</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <ArrowRightLeft className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-700">{data.peristiwaBulanIni.pindahMasuk}</p>
              <p className="text-sm text-blue-600">Pindah Masuk</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <ArrowRightLeft className="w-8 h-8 mx-auto text-amber-600 mb-2" />
              <p className="text-2xl font-bold text-amber-700">{data.peristiwaBulanIni.pindahKeluar}</p>
              <p className="text-sm text-amber-600">Pindah Keluar</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-700">{data.peristiwaBulanIni.perkawinan}</p>
              <p className="text-sm text-red-600">Perkawinan</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="w-8 h-8 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold text-purple-700">{data.peristiwaBulanIni.perceraian}</p>
              <p className="text-sm text-purple-600">Perceraian</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Tren Peristiwa Kependudukan {tahun}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="namaBulan" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="kelahiran"
                    stroke="#EC4899"
                    strokeWidth={2}
                    name="Kelahiran"
                  />
                  <Line
                    type="monotone"
                    dataKey="kematian"
                    stroke="#6B7280"
                    strokeWidth={2}
                    name="Kematian"
                  />
                  <Line
                    type="monotone"
                    dataKey="pindahMasuk"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Pindah Masuk"
                  />
                  <Line
                    type="monotone"
                    dataKey="pindahKeluar"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="Pindah Keluar"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Age Distribution Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Distribusi Usia Penduduk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ageDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="group" type="category" tick={{ fontSize: 12 }} width={50} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="lakiLaki" stackId="a" fill="#3B82F6" name="Laki-laki" />
                  <Bar dataKey="perempuan" stackId="a" fill="#EC4899" name="Perempuan" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Religion Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Distribusi Agama</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.agamaDistribution.map(a => ({
                      name: agamaLabels[a.agama] || a.agama,
                      value: a.jumlah
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.agamaDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Perkawinan */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Status Perkawinan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusPerkawinanDistribution.map(s => ({
                      name: statusPerkawinanLabels[s.status] || s.status,
                      value: s.jumlah
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {data.statusPerkawinanDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Dusun Stats */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Penduduk per Dusun</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dusunStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="nama" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="jumlahPenduduk" fill="#10B981" name="Penduduk" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pekerjaan Distribution */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Distribusi Pekerjaan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.pekerjaanDistribution.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="pekerjaan" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="jumlah" fill="#3B82F6" name="Jumlah" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pendidikan Distribution */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Distribusi Pendidikan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.pendidikanDistribution.map((item, index) => (
              <Badge
                key={item.pendidikan}
                className="px-4 py-2 text-sm"
                style={{
                  backgroundColor: `${COLORS[index % COLORS.length]}20`,
                  color: COLORS[index % COLORS.length],
                  borderColor: COLORS[index % COLORS.length],
                }}
              >
                {item.pendidikan}: {item.jumlah}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
