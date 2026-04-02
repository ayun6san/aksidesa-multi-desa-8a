'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  User,
  Users,
  FileText,
  Edit,
  Trash2,
  Plus,
  Eye,
  X,
  Clock,
  ChevronDown,
  ChevronUp,
  Monitor,
  MapPin,
  RefreshCw,
  AlertCircle,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { fieldLabels } from '@/lib/field-labels';

// Types
interface AuditLogEntry {
  id: string;
  userName: string;
  user?: {
    id: string;
    namaLengkap: string;
    username: string;
    role: string;
  } | null;
  aksi: string;
  modul: string;
  deskripsi: string;
  dataRef: {
    pendudukId?: string;
    kkId?: string;
    nik?: string;
    nomorKK?: string;
    nama?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    changedFields?: string[];
  } | null;
  deviceInfo?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface AuditLogTimelineProps {
  // Entity reference
  pendudukId?: string;
  kkId?: string;
  // UI props
  title?: string;
  maxHeight?: string;
  showFilters?: boolean;
  limit?: number;
  className?: string;
}

// Action config
const actionConfig: Record<string, { color: string; bgColor: string; icon: typeof Plus; label: string }> = {
  CREATE: { color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: Plus, label: 'Dibuat' },
  UPDATE: { color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Edit, label: 'Diperbarui' },
  DELETE: { color: 'text-red-600', bgColor: 'bg-red-100', icon: Trash2, label: 'Dihapus' },
  GANTI_KEPALA: { color: 'text-amber-600', bgColor: 'bg-amber-100', icon: ArrowRightLeft, label: 'Ganti Kepala' },
  VIEW: { color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Eye, label: 'Dilihat' },
  LOGIN: { color: 'text-indigo-600', bgColor: 'bg-indigo-100', icon: User, label: 'Login' },
  LOGOUT: { color: 'text-orange-600', bgColor: 'bg-orange-100', icon: X, label: 'Logout' },
};

const modulConfig: Record<string, { color: string; icon: typeof User; label: string }> = {
  PENDUDUK: { color: 'text-emerald-600', icon: User, label: 'Penduduk' },
  KK: { color: 'text-blue-600', icon: Users, label: 'Kartu Keluarga' },
  USER: { color: 'text-purple-600', icon: User, label: 'Pengguna' },
  AUTH: { color: 'text-indigo-600', icon: Monitor, label: 'Autentikasi' },
  KEPENDUDUKAN: { color: 'text-emerald-600', icon: Users, label: 'Kependudukan' },
};

export function AuditLogTimeline({
  pendudukId,
  kkId,
  title = 'Riwayat Perubahan',
  maxHeight = '400px',
  showFilters = false,
  limit = 20,
  className,
}: AuditLogTimelineProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filterAksi, setFilterAksi] = useState<string>('ALL');

  // Fetch logs
  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (pendudukId) params.append('pendudukId', pendudukId);
        if (kkId) params.append('kkId', kkId);
        params.append('limit', limit.toString());
        if (filterAksi && filterAksi !== 'ALL') params.append('aksi', filterAksi);

        const response = await fetch(`/api/audit-log?${params.toString()}`);
        const result = await response.json();

        if (result.success) {
          setLogs(result.data);
        } else {
          setError(result.error || 'Gagal memuat data');
        }
      } catch (err) {
        setError('Gagal memuat riwayat perubahan');
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [pendudukId, kkId, limit, filterAksi]);

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins} menit lalu`;
    if (diffHours < 24) return `${diffHours} jam lalu`;
    if (diffDays < 7) return `${diffDays} hari lalu`;

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Render change details
  const renderChangeDetails = (log: AuditLogEntry) => {
    if (!log.dataRef?.changedFields?.length) return null;

    return (
      <div className="mt-3 space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Perubahan:</p>
        <div className="space-y-1.5">
          {log.dataRef.changedFields.map((field) => {
            const label = fieldLabels[field] || field;
            const before = log.dataRef?.before?.[field];
            const after = log.dataRef?.after?.[field];

            return (
              <div key={field} className="flex items-start gap-2 text-sm">
                <span className="text-gray-600 min-w-[120px]">{label}:</span>
                <div className="flex items-center gap-1 flex-1">
                  {before !== undefined && before !== null && before !== '' ? (
                    <>
                      <span className="text-red-500 line-through bg-red-50 px-1 rounded">
                        {String(before)}
                      </span>
                      <span className="text-gray-400">→</span>
                    </>
                  ) : null}
                  <span className="text-emerald-600 bg-emerald-50 px-1 rounded font-medium">
                    {String(after ?? '-')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <Card className={cn('border-0 shadow-sm', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            <Skeleton className="h-5 w-32" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn('border-0 shadow-sm', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
            <p className="text-sm">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setLoading(true);
                setError(null);
              }}
              className="mt-2"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Coba lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (logs.length === 0) {
    return (
      <Card className={cn('border-0 shadow-sm', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-gray-400" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Clock className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm">Belum ada riwayat perubahan</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-0 shadow-sm', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            <CardTitle className="text-base">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {logs.length}
            </Badge>
          </div>
          {showFilters && (
            <Select value={filterAksi} onValueChange={setFilterAksi}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Filter aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem value="CREATE">Dibuat</SelectItem>
                <SelectItem value="UPDATE">Diperbarui</SelectItem>
                <SelectItem value="DELETE">Dihapus</SelectItem>
                <SelectItem value="GANTI_KEPALA">Ganti Kepala</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea style={{ height: maxHeight }}>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Log entries */}
            <div className="space-y-4">
              {logs.map((log, index) => {
                const action = actionConfig[log.aksi] || actionConfig.VIEW;
                const modul = modulConfig[log.modul] || modulConfig.PENDUDUK;
                const ActionIcon = action.icon;
                const isExpanded = expandedLog === log.id;
                const hasDetails = log.dataRef?.changedFields?.length;

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-10"
                  >
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
                        action.bgColor
                      )}
                    >
                      <ActionIcon className={cn('w-4 h-4', action.color)} />
                    </div>

                    {/* Content */}
                    <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            {log.deskripsi}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] px-1.5 py-0', action.color)}
                            >
                              {action.label}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              oleh <strong>{log.userName}</strong>
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>

                      {/* Device info */}
                      {(log.deviceInfo || log.ipAddress) && (
                        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-200">
                          {log.deviceInfo && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                              <Monitor className="w-3 h-3" />
                              {log.deviceInfo}
                            </div>
                          )}
                          {log.ipAddress && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                              <MapPin className="w-3 h-3" />
                              {log.ipAddress}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expandable change details */}
                      {hasDetails ? (
                        <button
                          onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                          className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 mt-2 pt-2 border-t border-gray-200 w-full"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="w-3 h-3" />
                              Sembunyikan detail
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3 h-3" />
                              Lihat detail perubahan
                            </>
                          )}
                        </button>
                      ) : null}

                      {/* Change details */}
                      <AnimatePresence>
                        {isExpanded && hasDetails && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              {renderChangeDetails(log)}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Skeleton component for loading state
export function AuditLogTimelineSkeleton() {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-gray-400" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
