'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Home as HomeIcon, User, UserCheck, TrendingUp,
  PieChart as PieChartIcon, Filter, ChevronDown, ChevronRight, MapPin,
  Printer, Calendar, Heart, GraduationCap,
  Search, ArrowUpDown, ArrowUp, ArrowDown, Table2, BarChart3, Download,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
} from 'recharts';

// ============ TYPES ============

interface OverviewStats {
  totalPenduduk: number; totalKK: number; lakiLaki: number; perempuan: number;
  sexRatio: number; rataAnggotaKK: number; pendatangAktif: number;
  pendatangPulang: number; disabilitas: number;
  medianUsia: number;
  kepadatan: number;
  totalYatimPiatu: number;
  dependencyRatio: { total: number; youth: number; oldAge: number };
  growthData: { kelahiranBulanIni: number; kematianBulanIni: number; pindahMasukBulanIni: number; pindahKeluarBulanIni: number };
}

type StatData = Record<string, { count: number; percentage: number }>;
type SimpleData = Record<string, number>;
interface ListData { label: string; count: number; percentage: number; }
interface WnaNegaraItem { negara: string; count: number; }

interface MutasiTrendItem { bulan: string; kelahiran: number; kematian: number; pindahMasuk: number; pindahKeluar: number; perkawinan: number; perceraian: number; pengadopsian: number; mutasiKK: number; }

interface PiramidaItem { range: string; lakiLaki: number; perempuan: number; }

interface StatsResponse {
  overview: OverviewStats; jenisKelamin: SimpleData;
  pendidikan: ListData[]; pekerjaan: ListData[]; statusPerkawinan: StatData;
  agama: StatData; golonganDarah: ListData[];
  kewarganegaraan: { WNI: number; WNA: number; wnaNegaraAsal?: WnaNegaraItem[] };
  statusPenduduk: SimpleData;
  hubunganKeluarga: ListData[];
  statusKTP: ListData[];
  statusAnak: ListData[];
  disabilitas: ListData[];
  umurProduktif: ListData[];
  piramidaPenduduk: PiramidaItem[];
  mutasiTrend: MutasiTrendItem[];
}

interface WilayahDusun {
  id: string; nama: string;
  rwList: { id: string; nomor: string; rtList: { id: string; nomor: string }[] }[];
}

// Per Wilayah tab
interface WRTData { rtId: string; rtNomor: string; lakiLaki: number; perempuan: number; total: number; kkCount: number; kepadatan: number; sexRatio: number; }
interface WRWData { rwId: string; rwNomor: string; lakiLaki: number; perempuan: number; total: number; kkCount: number; kepadatan: number; sexRatio: number; rtList: WRTData[]; }
interface WDusunData { dusunId: string; dusunNama: string; lakiLaki: number; perempuan: number; total: number; kkCount: number; kepadatan: number; sexRatio: number; rwList: WRWData[]; }
interface WStatsResponse {
  wilayah: WDusunData[];
  grandTotal: { lakiLaki: number; perempuan: number; total: number };
  totalDusun: number; totalRW: number; totalRT: number; totalKK: number;
  grandKepadatan: number; grandSexRatio: number;
}

// Category × Wilayah (all other tabs)
interface CRTData { rtId: string; rtNomor: string; lakiLaki: number; perempuan: number; total: number; negaraList?: { negara: string; count: number }[]; }
interface CRWData { rwId: string; rwNomor: string; lakiLaki: number; perempuan: number; total: number; rtList: CRTData[]; }
interface CDusunData { dusunId: string; dusunNama: string; lakiLaki: number; perempuan: number; total: number; rwList: CRWData[]; }
interface CItemData { name: string; lakiLaki: number; perempuan: number; total: number; percentage: number; dusunList: CDusunData[]; }
interface CWilayahResponse { items: CItemData[]; grandTotal: { lakiLaki: number; perempuan: number; total: number }; }

// ============ CONSTANTS ============

const COLORS = ['#10b981','#0d9488','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#6366f1','#84cc16','#06b6d4','#e11d48','#a855f7','#22d3ee','#facc15'];
const PYRAMID_COLORS = { male: '#0891b2', female: '#e11d48' };

const TABS = [
  { id: 'per-wilayah', label: 'Per Wilayah' },
  { id: 'pendidikan', label: 'Pendidikan' },
  { id: 'pekerjaan', label: 'Pekerjaan' },
  { id: 'perkawinan', label: 'Perkawinan' },
  { id: 'agama', label: 'Agama' },
  { id: 'darah', label: 'Gol. Darah' },
  { id: 'status', label: 'Status' },
  { id: 'jenis-kelamin', label: 'Jenis Kelamin' },
  { id: 'hubungan-keluarga', label: 'Hub. Keluarga' },
  { id: 'status-ktp', label: 'Status KTP' },
  { id: 'disabilitas', label: 'Disabilitas' },
  { id: 'kewarganegaraan', label: 'Kewarganegaraan' },
  { id: 'umur-produktif', label: 'Umur Produktif' },
  { id: 'piramida', label: 'Kel Umur' },
  { id: 'mutasi', label: 'Mutasi' },
  { id: 'yatim-piatu', label: 'Yatim Piatu' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const TAB_CAT: Record<string, string> = {
  pendidikan: 'pendidikan', pekerjaan: 'pekerjaan',
  perkawinan: 'perkawinan', agama: 'agama', darah: 'darah', status: 'status',
  'jenis-kelamin': 'jenis-kelamin', 'hubungan-keluarga': 'hubungan-keluarga', 'status-ktp': 'status-ktp',
  disabilitas: 'disabilitas', kewarganegaraan: 'kewarganegaraan', 'umur-produktif': 'umurProduktif',
  piramida: 'kelompok-umur', 'yatim-piatu': 'status-anak',
};

const TAB_GROUPS = [
  { id: 'wilayah', label: 'Wilayah', icon: MapPin, tabs: ['per-wilayah'] as const },
  { id: 'demografi', label: 'Demografi', icon: Users, tabs: ['jenis-kelamin', 'piramida', 'umur-produktif', 'kewarganegaraan'] as const },
  { id: 'sosial', label: 'Sosial', icon: GraduationCap, tabs: ['pendidikan', 'pekerjaan', 'agama', 'perkawinan'] as const },
  { id: 'kependudukan', label: 'Kependudukan', icon: UserCheck, tabs: ['status', 'hubungan-keluarga', 'darah', 'status-ktp', 'disabilitas', 'yatim-piatu'] as const },
  { id: 'mutasi', label: 'Mutasi', icon: TrendingUp, tabs: ['mutasi'] as const },
] as const;

type GroupId = (typeof TAB_GROUPS)[number]['id'];

// Map tab id → group id for reverse lookup
const TAB_TO_GROUP: Record<string, GroupId> = {};
for (const g of TAB_GROUPS) {
  for (const t of g.tabs) TAB_TO_GROUP[t] = g.id;
}

// ============ TOOLTIP ============

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; payload?: { percentage?: number; percentage_label?: number } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  const p = d.payload?.percentage ?? d.payload?.percentage_label ?? 0;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
      <p className="font-medium text-gray-900 dark:text-gray-100">{label || d.name}</p>
      <p className="text-gray-600 dark:text-gray-400">{Math.abs(d.value).toLocaleString('id-ID')} orang{p > 0 && <span className="text-gray-400 ml-1">({p}%)</span>}</p>
    </div>
  );
}

// ============ TOGGLE HELPER ============

function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) {
  setter(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
}

// ============ KPI CARD ============

interface KPICardProps {
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
  label: string;
  value: string;
  subtitle?: string;
  delay?: number;
}

function KPICard({ icon, gradient, iconBg, label, value, subtitle, delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className={cn(
        'border-0 shadow-sm bg-gradient-to-br transition-all duration-300 hover:shadow-md hover:-translate-y-0.5',
        gradient
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn('p-2.5 rounded-xl shrink-0', iconBg)}>
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
              {subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============ GROWTH SUMMARY BAR ============

function GrowthSummaryBar({ data }: { data: OverviewStats['growthData'] }) {
  const items = [
    { label: 'Kelahiran', value: data.kelahiranBulanIni, color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-400' },
    { label: 'Kematian', value: data.kematianBulanIni, color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-400' },
    { label: 'Pindah Masuk', value: data.pindahMasukBulanIni, color: 'bg-cyan-500', textColor: 'text-cyan-700 dark:text-cyan-400' },
    { label: 'Pindah Keluar', value: data.pindahKeluarBulanIni, color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.5 }}
    >
      <Card className="border-0 shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide shrink-0">
              Bulan ini:
            </span>
            {items.map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full shrink-0', item.color)} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}:</span>
                <span className={cn('text-xs font-bold', item.textColor)}>{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============ CHART RENDERER ============

function renderChart(tab: TabId, stats: StatsResponse) {
  switch (tab) {
    case 'pendidikan': return <BarV data={stats.pendidikan} label="Pendidikan" />;
    case 'pekerjaan': return <BarV data={stats.pekerjaan} label="Pekerjaan" />;
    case 'perkawinan': return <BarV data={Object.entries(stats.statusPerkawinan).map(([n, v]) => ({ label: n, count: v.count, percentage: v.percentage }))} label="Status Perkawinan" />;
    case 'jenis-kelamin': return <JenisKelaminChart data={stats.jenisKelamin} total={stats.overview.totalPenduduk} />;
    case 'hubungan-keluarga': return <BarV data={stats.hubunganKeluarga || []} label="Hubungan dalam Keluarga" />;
    case 'status-ktp': return <BarV data={stats.statusKTP || []} label="Status KTP" />;
    case 'agama': {
      const d = Object.entries(stats.agama).filter(([, v]) => v.count > 0).map(([n, v]) => ({ name: n, value: v.count, percentage: v.percentage }));
      return (
        <div className="space-y-3"><h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Distribusi Agama</h4>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart><Pie data={d} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="value" label={(({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`)} labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}>
              {d.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip content={<ChartTip />} /></PieChart>
          </ResponsiveContainer>
        </div>
      );
    }
    case 'darah': return <BarV data={stats.golonganDarah} label="Golongan Darah" />;
    case 'status': return <BarV data={Object.entries(stats.statusPenduduk).map(([n, v]) => ({ label: n, count: v, percentage: stats.overview.totalPenduduk > 0 ? Math.round((v / stats.overview.totalPenduduk) * 1000) / 10 : 0 }))} label="Status Penduduk" />;
    case 'disabilitas': {
      const d = (stats.disabilitas || []).filter(item => item.count > 0);
      return d.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Distribusi Disabilitas</h4>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={d} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="count"
                label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}>
                {d.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : <div className="flex items-center justify-center h-[260px]"><p className="text-gray-400 text-sm">Tidak ada data disabilitas</p></div>;
    }
    case 'kewarganegaraan': {
      const kn = stats.kewarganegaraan;
      const d = Object.entries({ WNI: kn.WNI, WNA: kn.WNA }).map(([name, value]) => ({ name, value }));
      const wnaList = kn.wnaNegaraAsal || [];
      return (
        <div className="space-y-4">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Kewarganegaraan</h4>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={d} cx="50%" cy="50%" outerRadius={90} paddingAngle={2} dataKey="value"
                  label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}>
                  {d.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {kn.WNA > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                <h5 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                  Negara Asal WNA ({kn.WNA} orang)
                </h5>
              </div>
              {wnaList.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {wnaList.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{item.negara}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-3 text-center text-sm text-gray-400">
                  Belum ada data negara asal
                </div>
              )}
            </div>
          )}
        </div>
      );
    }
    case 'umur-produktif': return <BarV data={stats.umurProduktif || []} label="Umur Produktif" />;
    case 'piramida': return <PiramidaPendudukChart data={stats.piramidaPenduduk || []} />;
    case 'mutasi': return <MutasiTrendChart data={stats.mutasiTrend || []} overview={stats.overview} />;
    case 'yatim-piatu': return <BarV data={stats.statusAnak || []} label="Status Anak (Yatim/Piatu)" />;
  }
}

function BarV({ data, label }: { data: ListData[]; label: string }) {
  const yAxisWidth = Math.max(120, Math.min(200, (data.reduce((max, d) => Math.max(max, d.label.length), 0) * 7) + 10));
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{label}</h4>
      <ResponsiveContainer width="100%" height={Math.max(260, data.length * 42 + 30)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
          <XAxis type="number" tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={yAxisWidth} />
          <Tooltip content={<ChartTip />} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={24}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            <LabelList dataKey="percentage" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============ JENIS KELAMIN CHART ============

function JenisKelaminChart({ data, total }: { data: SimpleData; total: number }) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
  const laki = data['Laki-laki'] || 0;
  const perempuan = data['Perempuan'] || 0;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Distribusi Jenis Kelamin</h4>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/30">
          <User className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-cyan-700 dark:text-cyan-400">{laki.toLocaleString('id-ID')}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Laki-laki ({pct(laki)}%)</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30">
          <User className="w-5 h-5 text-rose-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-rose-700 dark:text-rose-400">{perempuan.toLocaleString('id-ID')}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Perempuan ({pct(perempuan)}%)</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
          <Users className="w-5 h-5 text-gray-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900 dark:text-white">{total.toLocaleString('id-ID')}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total</p>
        </div>
      </div>
      {/* Pie */}
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2} dataKey="value"
            label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
            labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}>
            <Cell fill={PYRAMID_COLORS.male} />
            <Cell fill={PYRAMID_COLORS.female} />
          </Pie>
          <Tooltip content={<ChartTip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============ PIRAMIDA PENDUDUK CHART ============

function PiramidaTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; dataKey: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
      <p className="font-medium text-gray-900 dark:text-gray-100">Usia {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.dataKey === 'lakiLaki' ? PYRAMID_COLORS.male : PYRAMID_COLORS.female }}>
          {p.dataKey === 'lakiLaki' ? 'Laki-laki' : 'Perempuan'}: {Math.abs(p.value).toLocaleString('id-ID')}
        </p>
      ))}
    </div>
  );
}

function PiramidaPendudukChart({ data }: { data: PiramidaItem[] }) {
  const totalL = data.reduce((s, d) => s + d.lakiLaki, 0);
  const totalP = data.reduce((s, d) => s + d.perempuan, 0);

  // Reverse for pyramid (oldest at top, youngest at bottom)
  const reversed = [...data].reverse();

  const chartData = reversed.map(d => ({
    range: d.range,
    lakiLaki: -d.lakiLaki, // negative for left-side bar
    perempuan: d.perempuan,
    lakiLakiAbs: d.lakiLaki,
    perempuanAbs: d.perempuan,
  }));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/30">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Laki-laki</p>
          <p className="text-base font-bold text-cyan-700 dark:text-cyan-400">{totalL.toLocaleString('id-ID')}</p>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Penduduk</p>
          <p className="text-base font-bold text-gray-900 dark:text-white">{(totalL + totalP).toLocaleString('id-ID')}</p>
        </div>
        <div className="text-center p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Perempuan</p>
          <p className="text-base font-bold text-rose-700 dark:text-rose-400">{totalP.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Piramida Penduduk</h4>
        <p className="text-xs text-gray-400">Distribusi usia × jenis kelamin (BPS Standard)</p>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(320, data.length * 28 + 60)}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
          <XAxis
            type="number"
            tick={{ fontSize: 10 }}
            tickFormatter={(v: number) => `${Math.abs(v)}`}
          />
          <YAxis type="category" dataKey="range" tick={{ fontSize: 10 }} width={48} />
          <Tooltip content={<PiramidaTip />} />
          <Bar dataKey="lakiLaki" fill={PYRAMID_COLORS.male} barSize={16} radius={[4, 0, 0, 4]} name="Laki-laki">
            <LabelList dataKey="lakiLakiAbs" position="insideLeft" formatter={(v) => typeof v === 'number' && v > 0 ? v.toLocaleString('id-ID') : ''} style={{ fontSize: 8, fill: 'white', fontWeight: 600 }} />
            {chartData.map((_, i) => <Cell key={i} fill={PYRAMID_COLORS.male} />)}
          </Bar>
          <Bar dataKey="perempuan" fill={PYRAMID_COLORS.female} barSize={16} radius={[0, 4, 4, 0]} name="Perempuan">
            <LabelList dataKey="perempuanAbs" position="insideRight" formatter={(v) => typeof v === 'number' && v > 0 ? v.toLocaleString('id-ID') : ''} style={{ fontSize: 8, fill: 'white', fontWeight: 600 }} />
            {chartData.map((_, i) => <Cell key={i} fill={PYRAMID_COLORS.female} />)}
          </Bar>
          <Legend
            iconSize={10}
            wrapperStyle={{ fontSize: '11px' }}
            formatter={(value: string) => (value === 'lakiLaki' || value === 'Laki-laki' ? '♂ Laki-laki' : '♀ Perempuan')}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============ PIRAMIDA TABLE ============

/** Parse range string "0-4" → {min:0, max:4}, "75+" → {min:75, max:Infinity} */
function parseRange(range: string): { min: number; max: number } {
  if (range.endsWith('+')) return { min: parseInt(range), max: Infinity };
  const [a, b] = range.split('-').map(Number);
  return { min: a, max: b };
}

function PiramidaTable({ data, totalPenduduk, onViewPenduduk }: {
  data: PiramidaItem[];
  totalPenduduk: number;
  onViewPenduduk: (range: string, umurMin: number, umurMax: number) => void;
}) {
  const totalInChart = data.reduce((s, d) => s + d.lakiLaki + d.perempuan, 0);
  const totalL = data.reduce((s, d) => s + d.lakiLaki, 0);
  const totalP = data.reduce((s, d) => s + d.perempuan, 0);
  const withoutBirthDate = totalPenduduk - totalInChart;
  const gt = totalPenduduk;
  const pct = (n: number) => gt > 0 ? Math.round((n / gt) * 1000) / 10 : 0;

  return (
    <Card className="border-0 shadow-sm overflow-hidden rounded-2xl">
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            Detail Kelompok Umur per Wilayah
            <span className="text-[10px] font-normal text-gray-400">Klik &quot;Lihat&quot; untuk data penduduk</span>
          </h3>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="w-8" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Kelompok Umur</th>
                <WLH>
                  <User className="w-3.5 h-3.5 text-cyan-500 inline mr-1" />Laki-laki
                </WLH>
                <WLH>
                  <User className="w-3.5 h-3.5 text-rose-500 inline mr-1" />Perempuan
                </WLH>
                <WLH>Total</WLH>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-16">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.map((item, idx) => {
                const total = item.lakiLaki + item.perempuan;
                const barPct = gt > 0 ? Math.min((total / gt) * 100, 100) : 0;
                const { min, max } = parseRange(item.range);
                const maxVal = max === Infinity ? 999 : max;
                return (
                  <tr key={item.range} className={cn('transition-colors hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20', idx % 2 === 1 && 'bg-gray-50/30 dark:bg-gray-800/20')}>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 inline-block" /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.range}</span>
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">{total}</span>
                        <button
                          onClick={() => onViewPenduduk(item.range, min, maxVal)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded transition-colors ml-1"
                        >
                          <Users className="w-3 h-3" />Lihat
                        </button>
                      </div>
                      <div className="mt-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden w-32"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${barPct}%` }} /></div>
                    </td>
                    <WNum color="text-cyan-700 dark:text-cyan-400">{item.lakiLaki.toLocaleString('id-ID')}</WNum>
                    <WNum color="text-rose-700 dark:text-rose-400">{item.perempuan.toLocaleString('id-ID')}</WNum>
                    <td className="px-4 py-3 text-center">
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{total.toLocaleString('id-ID')}</span>
                        <GenderBar laki={item.lakiLaki} perempuan={item.perempuan} total={total} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{pct(total)}%</span></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50 dark:bg-emerald-900/20 border-t-2 border-emerald-200 dark:border-emerald-800">
                <td colSpan={2} className="px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-300">GRAND TOTAL</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-cyan-700 dark:text-cyan-400">{totalL.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-rose-700 dark:text-rose-400">{totalP.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-gray-100">{totalInChart.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-gray-100 w-16">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Info strip */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span className="font-medium">{data.length} kelompok umur</span>
            <span className="text-gray-300 dark:text-gray-600">&middot;</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{totalInChart.toLocaleString('id-ID')} penduduk</span>
            {withoutBirthDate > 0 && (
              <>
                <span className="text-gray-300 dark:text-gray-600">&middot;</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {withoutBirthDate.toLocaleString('id-ID')} tidak memiliki tanggal lahir
                </span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ MUTASI TREND CHART ============

const MUTASI_COLORS = {
  kelahiran: '#10b981',
  kematian: '#ef4444',
  pindahMasuk: '#06b6d4',
  pindahKeluar: '#f59e0b',
  perkawinan: '#8b5cf6',
  perceraian: '#ec4899',
  pengadopsian: '#6366f1',
  mutasiKK: '#84cc16',
};

function MutasiTrendTip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
      <p className="font-medium text-gray-900 dark:text-gray-100">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-gray-600 dark:text-gray-400" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString('id-ID')}
        </p>
      ))}
    </div>
  );
}

function MutasiTrendChart({ data, overview }: { data: MutasiTrendItem[]; overview: OverviewStats }) {
  const totalAll = data.reduce((s, d) => s + d.kelahiran + d.kematian + d.pindahMasuk + d.pindahKeluar + d.perkawinan + d.perceraian + d.pengadopsian + d.mutasiKK, 0);
  const totalKelahiran = data.reduce((s, d) => s + d.kelahiran, 0);
  const totalKematian = data.reduce((s, d) => s + d.kematian, 0);
  const totalPindahMasuk = data.reduce((s, d) => s + d.pindahMasuk, 0);
  const totalPindahKeluar = data.reduce((s, d) => s + d.pindahKeluar, 0);
  const totalPerkawinan = data.reduce((s, d) => s + d.perkawinan, 0);
  const totalPerceraian = data.reduce((s, d) => s + d.perceraian, 0);
  const totalPengadopsian = data.reduce((s, d) => s + d.pengadopsian, 0);
  const totalMutasiKK = data.reduce((s, d) => s + d.mutasiKK, 0);

  const formattedData = data.map(d => ({
    ...d,
    bulanLabel: new Date(d.bulan + '-01').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
  }));

  const summaryItems = [
    { label: 'Total Peristiwa', value: totalAll, color: 'text-gray-800 dark:text-gray-200' },
    { label: 'Kelahiran', value: totalKelahiran, color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Kematian', value: totalKematian, color: 'text-red-600 dark:text-red-400' },
    { label: 'Pindah Masuk', value: totalPindahMasuk, color: 'text-cyan-600 dark:text-cyan-400' },
    { label: 'Pindah Keluar', value: totalPindahKeluar, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Perkawinan', value: totalPerkawinan, color: 'text-violet-600 dark:text-violet-400' },
    { label: 'Perceraian', value: totalPerceraian, color: 'text-pink-600 dark:text-pink-400' },
    { label: 'Pengadopsian', value: totalPengadopsian, color: 'text-indigo-600 dark:text-indigo-400' },
    { label: 'Mutasi KK', value: totalMutasiKK, color: 'text-lime-600 dark:text-lime-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
        {summaryItems.map(item => (
          <div key={item.label} className="text-center p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight">{item.label}</p>
            <p className={cn('text-base font-bold mt-0.5', item.color)}>{item.value.toLocaleString('id-ID')}</p>
          </div>
        ))}
      </div>
      {/* Area Chart */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="text-center">
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Tren Mutasi Penduduk</h4>
              <p className="text-xs text-gray-400 mt-0.5">12 bulan terakhir (8 jenis peristiwa)</p>
            </div>
            <ResponsiveContainer width="100%" height={380}>
              <AreaChart data={formattedData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
                <XAxis dataKey="bulanLabel" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<MutasiTrendTip />} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="kelahiran" name="Kelahiran" stroke={MUTASI_COLORS.kelahiran} fill={MUTASI_COLORS.kelahiran} fillOpacity={0.15} strokeWidth={2} dot={{ r: 3 }} />
                <Area type="monotone" dataKey="kematian" name="Kematian" stroke={MUTASI_COLORS.kematian} fill={MUTASI_COLORS.kematian} fillOpacity={0.15} strokeWidth={2} dot={{ r: 3 }} />
                <Area type="monotone" dataKey="pindahMasuk" name="Pindah Masuk" stroke={MUTASI_COLORS.pindahMasuk} fill={MUTASI_COLORS.pindahMasuk} fillOpacity={0.15} strokeWidth={2} dot={{ r: 3 }} />
                <Area type="monotone" dataKey="pindahKeluar" name="Pindah Keluar" stroke={MUTASI_COLORS.pindahKeluar} fill={MUTASI_COLORS.pindahKeluar} fillOpacity={0.15} strokeWidth={2} dot={{ r: 3 }} />
                <Area type="monotone" dataKey="perkawinan" name="Perkawinan" stroke={MUTASI_COLORS.perkawinan} fill={MUTASI_COLORS.perkawinan} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2 }} />
                <Area type="monotone" dataKey="perceraian" name="Perceraian" stroke={MUTASI_COLORS.perceraian} fill={MUTASI_COLORS.perceraian} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2 }} />
                <Area type="monotone" dataKey="pengadopsian" name="Pengadopsian" stroke={MUTASI_COLORS.pengadopsian} fill={MUTASI_COLORS.pengadopsian} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2 }} />
                <Area type="monotone" dataKey="mutasiKK" name="Mutasi KK" stroke={MUTASI_COLORS.mutasiKK} fill={MUTASI_COLORS.mutasiKK} fillOpacity={0.1} strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ WILAYAH TABLE (Per Wilayah Tab) ============

function WSortHeader({ children, field, sortBy, sortOrder, onSort, className }: {
  children: React.ReactNode; field: string; sortBy: string; sortOrder: string;
  onSort: (f: string) => void; className?: string;
}) {
  const isActive = sortBy === field;
  return (
    <th className={cn(
      'px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors',
      isActive ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
               : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200',
      className
    )} onClick={() => onSort(field)}>
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive ? (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
      </span>
    </th>
  );
}

function KepadatanBadge({ value }: { value: number }) {
  const color = value < 5
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : value <= 8
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', color)}>{value.toFixed(1)}</span>;
}

function SexRatioBadge({ value }: { value: number }) {
  const color = value > 1.01
    ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
    : value < 0.99
      ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
  return <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', color)}>{value.toFixed(2)}</span>;
}

function GenderBar({ laki, perempuan, total }: { laki: number; perempuan: number; total: number }) {
  if (total === 0) return null;
  const lPct = (laki / total) * 100;
  return (
    <div className="w-14 h-1.5 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-700 mt-0.5">
      <div className="h-full bg-cyan-500 rounded-l-full" style={{ width: `${lPct}%` }} />
      <div className="h-full bg-rose-500 rounded-r-full" style={{ width: `${100 - lPct}%` }} />
    </div>
  );
}

function exportWilayahExcel(data: WStatsResponse) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const rows: (string | number)[][] = [];
  rows.push(['Level', 'Nama', 'Laki-laki', 'Perempuan', 'Total', 'KK', 'Kepadatan', 'Sex Ratio']);
  for (const d of data.wilayah) {
    rows.push(['Dusun', d.dusunNama, d.lakiLaki, d.perempuan, d.total, d.kkCount, d.kepadatan, d.sexRatio]);
    for (const rw of d.rwList) {
      rows.push(['  RW', `RW ${rw.rwNomor}`, rw.lakiLaki, rw.perempuan, rw.total, rw.kkCount, rw.kepadatan, rw.sexRatio]);
      for (const rt of rw.rtList) {
        rows.push(['    RT', `RT ${rt.rtNomor}`, rt.lakiLaki, rt.perempuan, rt.total, rt.kkCount, rt.kepadatan, rt.sexRatio]);
      }
    }
  }
  rows.push(['GRAND TOTAL', '', data.grandTotal.lakiLaki, data.grandTotal.perempuan, data.grandTotal.total, '', '', '']);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Statistik Wilayah');
  XLSX.writeFile(wb, 'statistik-wilayah.xlsx');
  toast.success('Excel berhasil diunduh');
}

function WilayahTable({ data, loading, expDusun, expRW, onDusun, onRW, sortBy, sortOrder, onSort }: {
  data: WStatsResponse | null; loading: boolean; expDusun: Set<string>; expRW: Set<string>;
  onDusun: (id: string) => void; onRW: (id: string) => void;
  sortBy: string; sortOrder: string; onSort: (f: string) => void;
}) {
  const gt = data?.grandTotal?.total ?? 0;
  const pct = (n: number) => gt > 0 ? Math.round((n / gt) * 1000) / 10 : 0;

  if (loading) return <Card className="border-0 shadow-sm"><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-48" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></CardContent></Card>;
  if (!data || data.wilayah.length === 0) return <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center"><MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500 text-sm">Belum ada data wilayah</p></CardContent></Card>;

  // ── TABLE ──
  return (
    <Card className="border-0 shadow-sm overflow-hidden rounded-2xl">
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="w-8 px-2 py-3 bg-gray-50 dark:bg-gray-800" />
                <WSortHeader field="nama" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="!text-left">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 inline mr-1" />Wilayah
                </WSortHeader>
                <WSortHeader field="lakiLaki" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                  <span className="text-cyan-500">L</span>
                </WSortHeader>
                <WSortHeader field="perempuan" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                  <span className="text-rose-500">P</span>
                </WSortHeader>
                <WSortHeader field="total" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>Total</WSortHeader>
                <WLH>KK</WLH>
                <WSortHeader field="kepadatan" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>Kepadatan</WSortHeader>
                <WSortHeader field="sexRatio" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>Sex Ratio</WSortHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.wilayah.map((dusun, i) => (
                <WDusun key={dusun.dusunId} d={dusun} idx={i} gt={gt} pct={pct} exp={expDusun.has(dusun.dusunId)} expRW={expRW}
                  onToggle={() => onDusun(dusun.dusunId)} onRW={onRW} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50 dark:bg-emerald-900/20 border-t-2 border-emerald-200 dark:border-emerald-800">
                <td className="bg-emerald-50 dark:bg-emerald-900/20" />
                <td className="px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-300">GRAND TOTAL</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-cyan-700 dark:text-cyan-400">{data.grandTotal.lakiLaki.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-rose-700 dark:text-rose-400">{data.grandTotal.perempuan.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-gray-100">{data.grandTotal.total.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-gray-700 dark:text-gray-300">{data.totalKK.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center"><KepadatanBadge value={data.grandKepadatan} /></td>
                <td className="px-4 py-3 text-center"><SexRatioBadge value={data.grandSexRatio} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
        {/* Enhanced Summary Strip */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{data.totalDusun} Dusun</span>
            <span className="text-[11px] text-gray-300 dark:text-gray-600">&middot;</span>
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{data.totalRW} RW</span>
            <span className="text-[11px] text-gray-300 dark:text-gray-600">&middot;</span>
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{data.totalRT} RT</span>
            <span className="text-[11px] text-gray-300 dark:text-gray-600">&middot;</span>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">{data.totalKK.toLocaleString('id-ID')} KK</span>
            <span className="text-[11px] text-gray-300 dark:text-gray-600">&middot;</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Kepadatan: <KepadatanBadge value={data.grandKepadatan} /></span>
            <span className="text-[11px] text-gray-300 dark:text-gray-600">&middot;</span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Sex Ratio: <SexRatioBadge value={data.grandSexRatio} /></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ WILAYAH CHART (StackedBarChart View) ============

function WilayahChart({ data, search, filteredWilayah }: { data: WStatsResponse; search: string; filteredWilayah: WDusunData[] }) {
  const chartData = filteredWilayah.map(d => ({
    name: d.dusunNama,
    'Laki-laki': d.lakiLaki,
    'Perempuan': d.perempuan,
  }));

  if (chartData.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Tidak ada dusun yang cocok dengan &quot;{search}&quot;</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden rounded-2xl">
      <CardContent className="p-6">
        <div className="space-y-3">
          <div className="text-center">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Distribusi Penduduk per Dusun</h4>
            <p className="text-xs text-gray-400 mt-0.5">Perbandingan Laki-laki vs Perempuan</p>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 48 + 40)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip content={<ChartTip />} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="Laki-laki" fill={PYRAMID_COLORS.male} stackId="a" barSize={20} radius={chartData.length === 1 ? [4, 4, 4, 4] : [0, 0, 0, 4]}>
                {chartData.map((_, i) => <Cell key={i} fill={PYRAMID_COLORS.male} />)}
              </Bar>
              <Bar dataKey="Perempuan" fill={PYRAMID_COLORS.female} stackId="a" barSize={20} radius={chartData.length === 1 ? [4, 4, 4, 4] : [0, 4, 4, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={PYRAMID_COLORS.female} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ SHARED WILAYAH HELPERS (used by CategoryWilayahTable too) ============

function WLH({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{children}</th>;
}

function WNum({ children, color }: { children: React.ReactNode; color?: string }) {
  return <td className={cn('px-4 py-2.5 text-center text-sm font-medium', color || 'text-gray-900 dark:text-gray-100')}>{children}</td>;
}

// ============ ENHANCED DUSUN / RW ROWS ============

function WDusun({ d, idx, gt, pct, exp, expRW, onToggle, onRW }: {
  d: WDusunData; idx: number; gt: number; pct: (n: number) => number;
  exp: boolean; expRW: Set<string>; onToggle: () => void; onRW: (id: string) => void;
}) {
  return (
    <>
      <tr className={cn('transition-colors cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20', exp && 'bg-emerald-50/30 dark:bg-emerald-900/10', idx % 2 === 1 && 'bg-gray-50/30 dark:bg-gray-800/20')} onClick={onToggle}>
        <td className="w-8 px-2 py-2.5"><ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200 inline-block', exp && 'rotate-180')} /></td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{d.dusunNama}</span>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">{d.rwList.length} RW</span>
          </div>
        </td>
        <WNum color="text-cyan-700 dark:text-cyan-400">{d.lakiLaki.toLocaleString('id-ID')}</WNum>
        <WNum color="text-rose-700 dark:text-rose-400">{d.perempuan.toLocaleString('id-ID')}</WNum>
        <td className="px-4 py-2.5 text-center">
          <div>
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{d.total.toLocaleString('id-ID')}</span>
            <GenderBar laki={d.lakiLaki} perempuan={d.perempuan} total={d.total} />
          </div>
        </td>
        <WNum><span className="text-xs text-gray-700 dark:text-gray-300">{d.kkCount.toLocaleString('id-ID')}</span></WNum>
        <td className="px-4 py-2.5 text-center"><KepadatanBadge value={d.kepadatan} /></td>
        <td className="px-4 py-2.5 text-center"><SexRatioBadge value={d.sexRatio} /></td>
      </tr>
      {exp && d.rwList.map(rw => (
        <WRW key={rw.rwId} rw={rw} gt={gt} pct={pct} exp={expRW.has(rw.rwId)} onToggle={() => onRW(rw.rwId)} />
      ))}
    </>
  );
}

function WRW({ rw, gt, pct, exp, onToggle }: { rw: WRWData; gt: number; pct: (n: number) => number; exp: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className={cn('bg-cyan-50/30 dark:bg-cyan-900/10 hover:bg-cyan-50/60 dark:hover:bg-cyan-900/20 transition-colors cursor-pointer', exp && 'bg-cyan-50/50 dark:bg-cyan-900/15')} onClick={onToggle}>
        <td className="w-8 px-2 py-2 pl-7"><ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform duration-200 inline-block', exp && 'rotate-180')} /></td>
        <td className="px-4 py-2 pl-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-300 dark:text-gray-600 font-mono select-none">└</span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">RW {rw.rwNomor}</span>
            <span className="text-[10px] bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded font-medium">{rw.rtList.length} RT</span>
          </div>
        </td>
        <WNum color="text-cyan-700 dark:text-cyan-400">{rw.lakiLaki.toLocaleString('id-ID')}</WNum>
        <WNum color="text-rose-700 dark:text-rose-400">{rw.perempuan.toLocaleString('id-ID')}</WNum>
        <td className="px-4 py-2.5 text-center">
          <div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rw.total.toLocaleString('id-ID')}</span>
            <GenderBar laki={rw.lakiLaki} perempuan={rw.perempuan} total={rw.total} />
          </div>
        </td>
        <WNum><span className="text-xs text-gray-700 dark:text-gray-300">{rw.kkCount.toLocaleString('id-ID')}</span></WNum>
        <td className="px-4 py-2.5 text-center"><KepadatanBadge value={rw.kepadatan} /></td>
        <td className="px-4 py-2.5 text-center"><SexRatioBadge value={rw.sexRatio} /></td>
      </tr>
      {exp && rw.rtList.map(rt => (
        <tr key={rt.rtId} className="hover:bg-teal-50/50 dark:hover:bg-teal-900/10 transition-colors">
          <td className="w-8 px-2 py-2 pl-12"><ChevronRight className="w-3 h-3 text-gray-300 inline-block" /></td>
          <td className="px-4 py-2 pl-16">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-300 dark:text-gray-600 font-mono select-none">└</span>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">RT {rt.rtNomor}</span>
            </div>
          </td>
          <WNum color="text-cyan-700 dark:text-cyan-400">{rt.lakiLaki.toLocaleString('id-ID')}</WNum>
          <WNum color="text-rose-700 dark:text-rose-400">{rt.perempuan.toLocaleString('id-ID')}</WNum>
          <td className="px-4 py-2.5 text-center">
            <div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rt.total.toLocaleString('id-ID')}</span>
              <GenderBar laki={rt.lakiLaki} perempuan={rt.perempuan} total={rt.total} />
            </div>
          </td>
          <WNum><span className="text-xs text-gray-700 dark:text-gray-300">{rt.kkCount.toLocaleString('id-ID')}</span></WNum>
          <td className="px-4 py-2.5 text-center"><KepadatanBadge value={rt.kepadatan} /></td>
          <td className="px-4 py-2.5 text-center"><SexRatioBadge value={rt.sexRatio} /></td>
        </tr>
      ))}
    </>
  );
}

// ============ CATEGORY × WILAYAH TABLE (All Other Tabs) ============

function CategoryWilayahTable({ data, loading, tabLabel, expCat, expDusun, expRW, onCat, onDusun, onRW, onViewPenduduk }: {
  data: CWilayahResponse | null; loading: boolean; tabLabel: string;
  expCat: Set<string>; expDusun: Set<string>; expRW: Set<string>;
  onCat: (id: string) => void; onDusun: (id: string) => void; onRW: (id: string) => void;
  onViewPenduduk?: (value: string) => void;
}) {
  const gt = data?.grandTotal?.total ?? 0;
  const pct = (n: number) => gt > 0 ? Math.round((n / gt) * 1000) / 10 : 0;

  if (loading) return <Card className="border-0 shadow-sm"><CardContent className="p-6 space-y-4"><Skeleton className="h-6 w-64" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></CardContent></Card>;
  if (!data || data.items.length === 0) return <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center"><MapPin className="w-10 h-10 text-gray-300 mx-auto mb-2" /><p className="text-gray-500 text-sm">Tidak ada data</p></CardContent></Card>;

  return (
    <Card className="border-0 shadow-sm overflow-hidden rounded-2xl">
      <CardContent className="p-0">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            Detail {tabLabel} per Wilayah
            <span className="text-[10px] font-normal text-gray-400">Klik kategori untuk lihat detail Dusun/RW/RT</span>
          </h3>
        </div>

        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="w-8" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Kategori</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 inline mr-1" />Dusun / RW / RT
                </th>
                <WLH><User className="w-3.5 h-3.5 text-cyan-500 inline mr-1" />Laki-laki</WLH>
                <WLH><User className="w-3.5 h-3.5 text-rose-500 inline mr-1" />Perempuan</WLH>
                <WLH>Total</WLH>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider w-16">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.items.map(item => (
                <CCatRow key={item.name} item={item} gt={gt} pct={pct}
                  exp={expCat.has(item.name)} expDusun={expDusun} expRW={expRW}
                  onToggle={() => onCat(item.name)} onDusun={onDusun} onRW={onRW}
                  onViewPenduduk={onViewPenduduk} />
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50 dark:bg-emerald-900/20 border-t-2 border-emerald-200 dark:border-emerald-800">
                <td colSpan={3} className="px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-300">GRAND TOTAL</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-cyan-700 dark:text-cyan-400">{data.grandTotal.lakiLaki.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-rose-700 dark:text-rose-400">{data.grandTotal.perempuan.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-gray-100">{data.grandTotal.total.toLocaleString('id-ID')}</td>
                <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-gray-100 w-16">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function CCatRow({ item, gt, pct, exp, expDusun, expRW, onToggle, onDusun, onRW, onViewPenduduk }: {
  item: CItemData; gt: number; pct: (n: number) => number;
  exp: boolean; expDusun: Set<string>; expRW: Set<string>;
  onToggle: () => void; onDusun: (id: string) => void; onRW: (id: string) => void;
  onViewPenduduk?: (value: string) => void;
}) {
  const barPct = gt > 0 ? Math.min((item.total / gt) * 100, 100) : 0;
  return (
    <>
      <tr className={cn('transition-colors cursor-pointer hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20', exp && 'bg-emerald-50/20 dark:bg-emerald-900/10')} onClick={onToggle}>
        <td className="px-4 py-3"><ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200 inline-block', exp && 'rotate-180')} /></td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.name}</span>
            <span className="text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">{item.total}</span>
            {onViewPenduduk && (
              <button
                onClick={(e) => { e.stopPropagation(); onViewPenduduk(item.name); }}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded transition-colors ml-1"
              >
                <Users className="w-3 h-3" />Lihat
              </button>
            )}
          </div>
          <div className="mt-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden w-32"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${barPct}%` }} /></div>
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">{item.dusunList.length} dusun &middot; {item.percentage}%</td>
        <WNum color="text-cyan-700 dark:text-cyan-400">{item.lakiLaki.toLocaleString('id-ID')}</WNum>
        <WNum color="text-rose-700 dark:text-rose-400">{item.perempuan.toLocaleString('id-ID')}</WNum>
        <WNum><span className="font-bold">{item.total.toLocaleString('id-ID')}</span></WNum>
        <WNum><span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{pct(item.total)}%</span></WNum>
      </tr>

      {exp && item.dusunList.map(dusun => {
        const dKey = `${item.name}::${dusun.dusunId}`;
        return (
          <CDusun key={dusun.dusunId} d={dusun} gt={gt} pct={pct}
            exp={expDusun.has(dKey)} expRW={expRW}
            onToggle={() => onDusun(dKey)} onRW={onRW} />
        );
      })}
    </>
  );
}

function CDusun({ d, gt, pct, exp, expRW, onToggle, onRW }: {
  d: CDusunData; gt: number; pct: (n: number) => number;
  exp: boolean; expRW: Set<string>; onToggle: () => void; onRW: (id: string) => void;
}) {
  return (
    <>
      <tr className={cn('bg-amber-50/30 dark:bg-amber-900/10 hover:bg-amber-50/50 dark:hover:bg-amber-900/20 transition-colors cursor-pointer', exp && 'bg-amber-50/40 dark:bg-amber-900/15')} onClick={onToggle}>
        <td className="px-4 pl-8"><ChevronDown className={cn('w-3.5 h-3.5 text-gray-400 transition-transform duration-200 inline-block', exp && 'rotate-180')} /></td>
        <td className="px-4 py-2" />
        <td className="px-4 py-2"><div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-gray-400" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{d.dusunNama}</span><span className="text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">{d.rwList.length} RW</span></div></td>
        <WNum color="text-cyan-700 dark:text-cyan-400">{d.lakiLaki.toLocaleString('id-ID')}</WNum>
        <WNum color="text-rose-700 dark:text-rose-400">{d.perempuan.toLocaleString('id-ID')}</WNum>
        <WNum><span className="font-semibold">{d.total.toLocaleString('id-ID')}</span></WNum>
        <WNum><span className="text-xs text-gray-500">{pct(d.total)}%</span></WNum>
      </tr>
      {exp && d.rwList.map(rw => {
        const rwKey = `${d.dusunId}::${rw.rwId}`;
        return (
          <CRW key={rw.rwId} rw={rw} gt={gt} pct={pct} exp={expRW.has(rwKey)} onToggle={() => onRW(rwKey)} />
        );
      })}
    </>
  );
}

function CRW({ rw, gt, pct, exp, onToggle }: { rw: CRWData; gt: number; pct: (n: number) => number; exp: boolean; onToggle: () => void }) {
  return (
    <>
      <tr className={cn('bg-cyan-50/20 dark:bg-cyan-900/10 hover:bg-cyan-50/40 dark:hover:bg-cyan-900/20 transition-colors cursor-pointer', exp && 'bg-cyan-50/40 dark:bg-cyan-900/15')} onClick={onToggle}>
        <td className="px-4 pl-12"><ChevronDown className={cn('w-3 h-3 text-gray-400 transition-transform duration-200 inline-block', exp && 'rotate-180')} /></td>
        <td /><td className="px-4 py-2 pl-8"><div className="flex items-center gap-2"><span className="text-sm text-gray-600 dark:text-gray-400">RW {rw.rwNomor}</span><span className="text-[10px] bg-cyan-50 dark:bg-cyan-900/30 text-cyan-500 px-1.5 py-0.5 rounded font-medium">{rw.rtList.length} RT</span></div></td>
        <WNum color="text-cyan-700 dark:text-cyan-400">{rw.lakiLaki.toLocaleString('id-ID')}</WNum>
        <WNum color="text-rose-700 dark:text-rose-400">{rw.perempuan.toLocaleString('id-ID')}</WNum>
        <WNum><span className="font-semibold">{rw.total.toLocaleString('id-ID')}</span></WNum>
        <WNum><span className="text-xs text-gray-500">{pct(rw.total)}%</span></WNum>
      </tr>
      {exp && rw.rtList.map(rt => {
        const negaraBadges = rt.negaraList && rt.negaraList.length > 0;
        return (
            <tr key={rt.rtId} className="hover:bg-teal-50/40 dark:hover:bg-teal-900/10 transition-colors">
              <td /><td className="px-4 pl-16"><ChevronRight className="w-3 h-3 text-gray-300 inline-block" /></td>
              <td className="px-4 py-2 pl-12">
                <div className="space-y-1">
                  <span className="text-sm text-gray-500 dark:text-gray-400">RT {rt.rtNomor}</span>
                  {negaraBadges && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rt.negaraList!.map(n => (
                        <span key={n.negara} className="inline-flex items-center gap-1 text-[10px] bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded font-medium">
                          {n.negara}: {n.count}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              <WNum color="text-cyan-700 dark:text-cyan-400">{rt.lakiLaki.toLocaleString('id-ID')}</WNum>
              <WNum color="text-rose-700 dark:text-rose-400">{rt.perempuan.toLocaleString('id-ID')}</WNum>
              <WNum><span className="font-semibold">{rt.total.toLocaleString('id-ID')}</span></WNum>
              <WNum><span className="text-xs text-gray-500">{pct(rt.total)}%</span></WNum>
            </tr>
        );
      })}
    </>
  );
}

// ============ PENDUDUK LIST MODAL ============

interface PendudukModalData {
  category: string;
  value: string;
  umurMin?: number;
  umurMax?: number;
}

interface WilayahOption { id: string; nama?: string; nomor?: string; rwList?: { id: string; nomor: string; rtList: { id: string; nomor: string }[] }[]; }

function PendudukListModal({ open, data, onClose }: { open: boolean; data: PendudukModalData | null; onClose: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Wilayah filter state
  const [wilayahList, setWilayahList] = useState<WilayahOption[]>([]);
  const [fDusunId, setFDusunId] = useState('');
  const [fRwId, setFRwId] = useState('');
  const [fRtId, setFRtId] = useState('');
  const [fJk, setFJk] = useState('');

  const cat = TAB_CAT[data?.category || ''] || data?.category || '';
  const tabLabel = TABS.find(t => t.id === data?.category)?.label || data?.category || '';

  // Derived options for cascading dropdowns
  const selDusun = wilayahList.find(d => d.id === fDusunId);
  const rwOpts = selDusun?.rwList ?? [];
  const selRw = rwOpts.find(rw => rw.id === fRwId);
  const rtOpts = selRw?.rtList ?? [];

  // Reset cascading dropdowns
  const handleDusunChange = (id: string) => {
    setFDusunId(id); setFRwId(''); setFRtId(''); setPage(1);
  };
  const handleRwChange = (id: string) => {
    setFRwId(id); setFRtId(''); setPage(1);
  };
  const handleRtChange = (id: string) => { setFRtId(id); setPage(1); };
  const handleJkChange = (v: string) => { setFJk(v); setPage(1); };
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  // Count active filters
  const activeFilterCount = [fDusunId, fRwId, fRtId, fJk].filter(Boolean).length;

  // Fetch wilayah data on mount
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/wilayah');
        const d = await r.json();
        if (!cancelled && d.success) setWilayahList(d.data.dusun || []);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Fetch penduduk list
  const mountedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      if (!data || !cat || !open) return;
      if (cancelled) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          category: cat, value: data.value,
          page: String(mountedRef.current ? page : 1),
          limit: String(limit),
        });
        if (data.umurMin !== undefined) params.append('umurMin', String(data.umurMin));
        if (data.umurMax !== undefined) params.append('umurMax', String(data.umurMax));
        if (fDusunId) params.append('dusunId', fDusunId);
        if (fRwId) params.append('rwId', fRwId);
        if (fRtId) params.append('rtId', fRtId);
        if (fJk) params.append('jenisKelamin', fJk);
        const s = mountedRef.current ? search : '';
        if (s.trim()) params.append('search', s.trim());
        const r = await fetch(`/api/kependudukan/statistik/penduduk-list?${params}`);
        const d = await r.json();
        if (cancelled) return;
        if (d.success) {
          setItems(d.data.items);
          setTotalPages(d.data.totalPages);
          setTotal(d.data.total);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    };
    doFetch();
    mountedRef.current = true;
    return () => { cancelled = true; };
  }, [open, page, search, data, cat, limit, fDusunId, fRwId, fRtId, fJk]);

  if (!data || !cat) return null;

  // Build location label for header
  const locationParts: string[] = [];
  if (fDusunId) {
    const d = wilayahList.find(w => w.id === fDusunId);
    if (d) locationParts.push(d.nama || '');
  }
  if (fRwId) {
    const rw = rwOpts.find(r => r.id === fRwId);
    if (rw) locationParts.push(`RW ${rw.nomor}`);
  }
  if (fRtId) {
    const rt = rtOpts.find(r => r.id === fRtId);
    if (rt) locationParts.push(`RT ${rt.nomor}`);
  }
  const locationLabel = locationParts.length > 0 ? locationParts.join(' · ') : 'Semua Wilayah';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500 shrink-0" />
                  Data Penduduk
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {tabLabel}: <span className="font-medium text-gray-700 dark:text-gray-300">{data.value}</span>
                  {activeFilterCount > 0 && (
                    <span className="ml-1">
                      &middot; <span className="text-emerald-600 dark:text-emerald-400 font-medium">{locationLabel}</span>
                      {fJk && <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-1">· {fJk === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}</span>}
                    </span>
                  )}
                  &middot; <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{total} orang</span>
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400 shrink-0 ml-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Dusun */}
                <select
                  value={fDusunId}
                  onChange={e => handleDusunChange(e.target.value)}
                  className="px-2.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                >
                  <option value="">Semua Dusun</option>
                  {wilayahList.map(d => (
                    <option key={d.id} value={d.id}>{d.nama}</option>
                  ))}
                </select>
                {/* RW */}
                <select
                  value={fRwId}
                  onChange={e => handleRwChange(e.target.value)}
                  disabled={!fDusunId}
                  className="px-2.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                >
                  <option value="">Semua RW</option>
                  {rwOpts.map(rw => (
                    <option key={rw.id} value={rw.id}>RW {rw.nomor}</option>
                  ))}
                </select>
                {/* RT */}
                <select
                  value={fRtId}
                  onChange={e => handleRtChange(e.target.value)}
                  disabled={!fRwId}
                  className="px-2.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                >
                  <option value="">Semua RT</option>
                  {rtOpts.map(rt => (
                    <option key={rt.id} value={rt.id}>RT {rt.nomor}</option>
                  ))}
                </select>
                {/* Jenis Kelamin */}
                <select
                  value={fJk}
                  onChange={e => handleJkChange(e.target.value)}
                  className="px-2.5 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                >
                  <option value="">Semua JK</option>
                  <option value="LAKI_LAKI">Laki-laki</option>
                  <option value="PEREMPUAN">Perempuan</option>
                </select>
              </div>
              {/* Search */}
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text" placeholder="Cari nama atau NIK..." value={search}
                  onChange={e => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {loading && items.length === 0 ? (
                <div className="p-10 text-center"><Skeleton className="h-6 w-32 mx-auto mb-3" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
              ) : items.length === 0 ? (
                <div className="p-10 text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">
                    {activeFilterCount > 0 || search ? 'Tidak ada data sesuai filter' : 'Tidak ada data penduduk'}
                  </p>
                  {(activeFilterCount > 0 || search) && (
                    <button
                      onClick={() => { setFDusunId(''); setFRwId(''); setFRtId(''); setFJk(''); setSearch(''); }}
                      className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                    >Reset Filter</button>
                  )}
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider w-10">No</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">NIK</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">JK</th>
                      <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Usia</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pendidikan</th>
                      <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Pekerjaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {items.map((item: any, i: number) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="px-4 py-2 text-xs text-gray-400">{(page - 1) * limit + i + 1}</td>
                        <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 font-mono">{item.nik || '-'}</td>
                        <td className="px-4 py-2 text-xs font-medium text-gray-800 dark:text-gray-200">{item.namaLengkap}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium',
                            item.jenisKelamin === 'LAKI_LAKI'
                              ? 'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400'
                          )}>
                            {item.jenisKelamin === 'LAKI_LAKI' ? 'L' : 'P'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 text-center">{item.usia ?? '-'}</td>
                        <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">{item.pendidikan || '-'}</td>
                        <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400">{item.pekerjaan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
              <p className="text-xs text-gray-500">
                Halaman {page} dari {totalPages} ({total} data)
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Sebelumnya</button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >Selanjutnya</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============ KPI CARDS SKELETON ============

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-2 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export function StatistikPenduduk() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [wStats, setWStats] = useState<WStatsResponse | null>(null);
  const [catW, setCatW] = useState<CWilayahResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [wLoading, setWLoading] = useState(false);
  const [catWLoading, setCatWLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('per-wilayah');
  const [activeGroup, setActiveGroup] = useState<GroupId>('wilayah');

  const handleGroupChange = useCallback((groupId: GroupId) => {
    setActiveGroup(groupId);
    const group = TAB_GROUPS.find(g => g.id === groupId);
    if (group) setActiveTab(group.tabs[0] as TabId);
  }, []);
  const [expDusun, setExpDusun] = useState<Set<string>>(new Set());
  const [expRW, setExpRW] = useState<Set<string>>(new Set());
  const [expCat, setExpCat] = useState<Set<string>>(new Set());
  const [expCDusun, setExpCDusun] = useState<Set<string>>(new Set());
  const [expCRW, setExpCRW] = useState<Set<string>>(new Set());
  const [pendudukModal, setPendudukModal] = useState<PendudukModalData | null>(null);

  const [wilData, setWilData] = useState<WilayahDusun[]>([]);
  const [fDusun, setFDusun] = useState('');
  const [fRW, setFRW] = useState('');
  const [fRT, setFRT] = useState('');

  const selDusun = wilData.find(d => d.id === fDusun);
  const rwOpts = selDusun?.rwList ?? [];
  const selRW = rwOpts.find(rw => rw.id === fRW);
  const rtOpts = selRW?.rtList ?? [];

  const fetchWil = useCallback(async () => { try { const r = await fetch('/api/wilayah'); const d = await r.json(); if (d.success) setWilData(d.data.dusun); } catch { /* */ } }, []);
  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (fRT) p.append('rtId', fRT); else if (fRW) p.append('rwId', fRW); else if (fDusun) p.append('dusunId', fDusun);
      const r = await fetch(`/api/kependudukan/statistik?${p}`);
      const d = await r.json(); if (d.success) setStats(d.data); else toast.error(d.error || 'Gagal memuat');
    } catch { toast.error('Gagal memuat'); } finally { setLoading(false); }
  }, [fDusun, fRW, fRT]);
  const [sortBy, setSortBy] = useState<string>('nama');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchWStats = useCallback(async () => {
    setWLoading(true);
    try {
      const p = new URLSearchParams(); if (fDusun) p.append('dusunId', fDusun); if (fRW) p.append('rwId', fRW);
      p.append('sort', sortBy); p.append('order', sortOrder);
      const r = await fetch(`/api/kependudukan/statistik/wilayah?${p}`); const d = await r.json();
      if (d.success) setWStats(d.data); else toast.error(d.error || 'Gagal memuat');
    } catch { toast.error('Gagal memuat'); } finally { setWLoading(false); }
  }, [fDusun, fRW, sortBy, sortOrder]);
  const fetchCatW = useCallback(async () => {
    const cat = TAB_CAT[activeTab]; if (!cat) { setCatW(null); return; }
    setCatWLoading(true);
    try {
      const p = new URLSearchParams({ category: cat }); if (fDusun) p.append('dusunId', fDusun); if (fRW) p.append('rwId', fRW); if (fRT) p.append('rtId', fRT);
      const r = await fetch(`/api/kependudukan/statistik/wilayah-detail?${p}`); const d = await r.json();
      if (d.success) setCatW(d.data); else toast.error(d.error || 'Gagal memuat detail');
    } catch { toast.error('Gagal memuat detail'); } finally { setCatWLoading(false); }
  }, [activeTab, fDusun, fRW, fRT]);

  useEffect(() => { fetchWil(); }, [fetchWil]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchWStats(); }, [fetchWStats]);
  useEffect(() => { fetchCatW(); }, [fetchCatW]);

  const chDusun = (v: string) => { setFDusun(v === 'all' ? '' : v); setFRW(''); setFRT(''); setSortBy('nama'); };
  const chRW = (v: string) => { setFRW(v === 'all' ? '' : v); setFRT(''); };
  const toggleSort = (field: string) => {
    if (sortBy === field) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
  };
  const SORT_OPTIONS = [
    { key: 'nama', label: 'Nama' },
    { key: 'total', label: 'Total Penduduk' },
    { key: 'lakiLaki', label: 'Laki-laki' },
    { key: 'perempuan', label: 'Perempuan' },
    { key: 'kepadatan', label: 'Kepadatan' },
    { key: 'sexRatio', label: 'Sex Ratio' },
  ];

  const disabilitasPct = stats?.overview.totalPenduduk
    ? Math.round((stats.overview.disabilitas / stats.overview.totalPenduduk) * 1000) / 10
    : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ====== HEADER ====== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/40 dark:to-teal-900/20">
            <PieChartIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Statistik Penduduk</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Rekapitulasi data kependudukan desa</p>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="no-print inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
        >
          <Printer className="w-4 h-4" />
          Cetak
        </button>
      </div>

      {/* ====== KPI OVERVIEW CARDS (8 cards) ====== */}
      {loading ? (
        <KPISkeleton />
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={<Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
            gradient="from-emerald-50 to-white dark:from-emerald-950/40 dark:to-gray-900"
            iconBg="bg-emerald-100 dark:bg-emerald-900/40"
            label="Total Penduduk"
            value={stats.overview.totalPenduduk.toLocaleString('id-ID')}
            delay={0}
          />
          <KPICard
            icon={<HomeIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
            gradient="from-teal-50 to-white dark:from-teal-950/40 dark:to-gray-900"
            iconBg="bg-teal-100 dark:bg-teal-900/40"
            label="Total KK"
            value={stats.overview.totalKK.toLocaleString('id-ID')}
            subtitle={`Rata-rata ${stats.overview.rataAnggotaKK} anggota/KK`}
            delay={0.05}
          />
          <KPICard
            icon={<User className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />}
            gradient="from-cyan-50 to-white dark:from-cyan-950/40 dark:to-gray-900"
            iconBg="bg-cyan-100 dark:bg-cyan-900/40"
            label="Laki-laki : Perempuan"
            value={`${stats.overview.lakiLaki} : ${stats.overview.perempuan}`}
            subtitle={`Sex Ratio ${stats.overview.sexRatio}`}
            delay={0.1}
          />
          <KPICard
            icon={<Calendar className="w-5 h-5 text-amber-600 dark:text-amber-400" />}
            gradient="from-amber-50 to-white dark:from-amber-950/40 dark:to-gray-900"
            iconBg="bg-amber-100 dark:bg-amber-900/40"
            label="Median Usia"
            value={`${stats.overview.medianUsia} tahun`}
            subtitle="Median usia penduduk"
            delay={0.15}
          />
          <KPICard
            icon={<TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
            gradient="from-violet-50 to-white dark:from-violet-950/40 dark:to-gray-900"
            iconBg="bg-violet-100 dark:bg-violet-900/40"
            label="Rasio Ketergantungan"
            value={`${stats.overview.dependencyRatio.total}%`}
            subtitle={`Youth ${stats.overview.dependencyRatio.youth}% · Old-age ${stats.overview.dependencyRatio.oldAge}%`}
            delay={0.2}
          />
          <KPICard
            icon={<MapPin className="w-5 h-5 text-rose-600 dark:text-rose-400" />}
            gradient="from-rose-50 to-white dark:from-rose-950/40 dark:to-gray-900"
            iconBg="bg-rose-100 dark:bg-rose-900/40"
            label="Kepadatan"
            value={`${stats.overview.kepadatan}`}
            subtitle="Penduduk per KK"
            delay={0.25}
          />
          <KPICard
            icon={<UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />}
            gradient="from-teal-50 to-white dark:from-teal-950/40 dark:to-gray-900"
            iconBg="bg-teal-100 dark:bg-teal-900/40"
            label="Pendatang Aktif"
            value={`${stats.overview.pendatangAktif}`}
            subtitle={`${stats.overview.pendatangPulang} sudah pulang`}
            delay={0.3}
          />
          <KPICard
            icon={<Heart className="w-5 h-5 text-pink-600 dark:text-pink-400" />}
            gradient="from-pink-50 to-white dark:from-pink-950/40 dark:to-gray-900"
            iconBg="bg-pink-100 dark:bg-pink-900/40"
            label="Disabilitas"
            value={`${stats.overview.disabilitas}`}
            subtitle={`${disabilitasPct}% dari total penduduk`}
            delay={0.35}
          />
        </div>
      ) : null}

      {/* ====== GROWTH SUMMARY BAR ====== */}
      {!loading && stats && (
        <GrowthSummaryBar data={stats.overview.growthData} />
      )}

      {/* ====== FILTER + TABS ====== */}
      <Card className="border-0 shadow-sm no-print overflow-hidden rounded-2xl">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 shrink-0">
              <Filter className="w-4 h-4" />
              <span className="font-medium">Filter:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
              <select
                value={fDusun || 'all'}
                onChange={e => chDusun(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-gray-200"
              >
                <option value="all">Semua Dusun</option>
                {wilData.map(d => <option key={d.id} value={d.id}>{d.nama}</option>)}
              </select>
              <select
                value={fRW || 'all'}
                onChange={e => chRW(e.target.value)}
                disabled={!fDusun}
                className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-200"
              >
                <option value="all">Semua RW</option>
                {rwOpts.map(rw => <option key={rw.id} value={rw.id}>RW {rw.nomor}</option>)}
              </select>
              <select
                value={fRT || 'all'}
                onChange={e => setFRT(e.target.value === 'all' ? '' : e.target.value)}
                disabled={!fRW}
                className="h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-200"
              >
                <option value="all">Semua RT</option>
                {rtOpts.map(rt => <option key={rt.id} value={rt.id}>RT {rt.nomor}</option>)}
              </select>
            </div>
          </div>
          {/* Level 1: Category pills */}
          <div className="flex flex-wrap gap-2">
            {TAB_GROUPS.map(group => {
              const Icon = group.icon;
              const isActive = activeGroup === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => handleGroupChange(group.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-200 dark:ring-emerald-800'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {group.label}
                </button>
              );
            })}
          </div>
          {/* Level 2: Sub-tabs */}
          <div className="flex gap-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeGroup}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2 }}
                className="flex gap-1"
              >
                {TAB_GROUPS.find(g => g.id === activeGroup)!.tabs.map(tabId => {
                  const tab = TABS.find(t => t.id === tabId);
                  if (!tab) return null;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
                        activeTab === tab.id
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>

      {/* ====== TAB CONTENT ====== */}
      <AnimatePresence mode="wait">
        {activeTab === 'per-wilayah' ? (
          <motion.div
            key="per-wilayah"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* ── 1. SUMMARY STAT CARDS ── */}
            {wStats && !wLoading && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                  <MapPin className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{wStats.totalDusun}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Dusun</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                  <HomeIcon className="w-4 h-4 text-teal-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{wStats.totalKK.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">KK</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                  <Users className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{wStats.grandTotal.total.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Penduduk</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                  <User className="w-4 h-4 text-cyan-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{wStats.grandTotal.lakiLaki.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Laki-laki</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                  <User className="w-4 h-4 text-rose-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{wStats.grandTotal.perempuan.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Perempuan</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                  <TrendingUp className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{wStats.grandKepadatan.toFixed(1)}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide">Kepadatan/KK</p>
                </div>
              </div>
            )}

            {/* ── 2. CHARTS ROW ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left: Stacked Bar Chart (3/5) */}
              <Card className="border-0 shadow-sm overflow-hidden rounded-2xl lg:col-span-3">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Penduduk per Dusun</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Perbandingan Laki-laki vs Perempuan</p>
                    </div>
                    <ResponsiveContainer width="100%" height={Math.max(200, (wStats?.wilayah?.length || 0) * 44 + 30)}>
                      <BarChart data={(wStats?.wilayah || []).map(d => ({ name: d.dusunNama, 'Laki-laki': d.lakiLaki, 'Perempuan': d.perempuan, total: d.total }))} layout="vertical" margin={{ left: 10, right: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-700" />
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                        <Tooltip content={<ChartTip />} />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="Laki-laki" fill={PYRAMID_COLORS.male} stackId="a" barSize={18} radius={[0, 0, 0, 4]}>
                          {(wStats?.wilayah || []).map((_, i) => <Cell key={i} fill={PYRAMID_COLORS.male} />)}
                        </Bar>
                        <Bar dataKey="Perempuan" fill={PYRAMID_COLORS.female} stackId="a" barSize={18} radius={[0, 4, 4, 0]}>
                          {(wStats?.wilayah || []).map((_, i) => <Cell key={i} fill={PYRAMID_COLORS.female} />)}
                          <LabelList dataKey="total" position="right" formatter={(v: any) => Number(v).toLocaleString('id-ID')} style={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Right: Pie Chart Distribution (2/5) */}
              <Card className="border-0 shadow-sm overflow-hidden rounded-2xl lg:col-span-2">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Distribusi Wilayah</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Persentase penduduk per Dusun</p>
                    </div>
                    <ResponsiveContainer width="100%" height={Math.max(200, (wStats?.wilayah?.length || 0) * 44 + 30)}>
                      <PieChart>
                        <Pie
                          data={(wStats?.wilayah || []).map(d => ({ name: d.dusunNama, value: d.total, _count: d.total }))}
                          cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} dataKey="value"
                          label={(({ name, percent }: any) => `${((percent ?? 0) * 100).toFixed(0)}%`)}
                          labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}>
                          {(wStats?.wilayah || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<ChartTip />} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── 3. DETAIL TABLE ── */}
            <WilayahTable data={wStats} loading={wLoading} expDusun={expDusun} expRW={expRW}
              onDusun={id => toggleSet(setExpDusun, id)} onRW={id => toggleSet(setExpRW, id)}
              sortBy={sortBy} sortOrder={sortOrder} onSort={toggleSort} />
          </motion.div>
        ) : loading && !stats ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </motion.div>
        ) : stats ? (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {activeTab === 'mutasi' ? (
              renderChart('mutasi', stats)
            ) : activeTab === 'piramida' ? (
              renderChart('piramida', stats)
            ) : (
              <Card className="border-0 shadow-sm overflow-hidden rounded-2xl">
                <CardContent className="p-6">
                  <div className="min-h-[320px]">{renderChart(activeTab, stats)}</div>
                </CardContent>
              </Card>
            )}
            {activeTab !== 'mutasi' && (
              <CategoryWilayahTable data={catW} loading={catWLoading} tabLabel={TABS.find(t => t.id === activeTab)?.label || ''}
                expCat={expCat} expDusun={expCDusun} expRW={expCRW}
                onCat={id => toggleSet(setExpCat, id)} onDusun={id => toggleSet(setExpCDusun, id)} onRW={id => toggleSet(setExpCRW, id)}
                onViewPenduduk={(value) => {
                  if (activeTab === 'piramida') {
                    const { min, max } = parseRange(value);
                    setPendudukModal({ category: 'kelompok-umur', value, umurMin: min, umurMax: max === Infinity ? 999 : max });
                  } else {
                    setPendudukModal({ category: activeTab, value });
                  }
                }} />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ====== PENDUDUK LIST MODAL ====== */}
      <PendudukListModal
        key={pendudukModal ? `${pendudukModal.category}::${pendudukModal.value}::${pendudukModal.umurMin}::${pendudukModal.umurMax}` : 'closed'}
        open={!!pendudukModal}
        data={pendudukModal}
        onClose={() => setPendudukModal(null)}
      />

      {/* ====== PRINT STYLES ====== */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .shadow-sm { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
