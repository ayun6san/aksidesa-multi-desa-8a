'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, FileText, User, MapPin, Phone, Clock,
  CheckCircle2, XCircle, Loader2, Printer, Ban,
  Eye, ChevronDown, ChevronUp,
  AlertTriangle, Hash, Calendar, Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { SuratStatusBadge } from './surat-status-badge';
import { getStatusLabel, getKategoriLabel, getLogAksiLabel } from '@/lib/surat-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// ============ TYPES ============

interface SuratDetailData {
  id: string;
  nomorSurat: string | null;
  nomorRegisterFmt: string | null;
  nomorRegister: number | null;
  nomorIndex: number | null;
  jenisSurat: {
    id: string;
    kode: string;
    nama: string;
    kategori: string;
    tingkatApproval: string;
    deskripsi: string | null;
  };
  pemohon: {
    id: string;
    namaLengkap: string;
    nik: string;
  } | null;
  pemohonNama: string;
  pemohonNIK: string | null;
  pemohonAlamat: string | null;
  pemohonRT: string | null;
  pemohonRW: string | null;
  pemohonDusun: string | null;
  pemohonTelepon: string | null;
  status: string;
  isiSurat: string;
  tanggalAjukan: string | null;
  tanggalProses: string | null;
  tanggalSelesai: string | null;
  catatanOperator: string | null;
  catatanApprover: string | null;
  alasanDitolak: string | null;
  dicetakPada: string | null;
  createdAt: string;
  updatedAt: string;
  operator: {
    id: string;
    namaLengkap: string;
    username: string;
  } | null;
  approver: {
    id: string;
    namaLengkap: string;
    username: string;
  } | null;
  log: SuratLogItem[];
}

interface SuratLogItem {
  id: string;
  aksi: string;
  userName: string;
  keterangan: string | null;
  createdAt: string;
}

interface SuratDetailProps {
  suratId: string;
  onProses?: (id: string) => void;
  onApprove?: (id: string, mode?: 'approve' | 'reject') => void;
  onRefresh?: () => void;
  onClose?: () => void;
}

// ============ HELPERS ============

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

function formatDateShort(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
}

function getLogIcon(aksi: string) {
  switch (aksi) {
    case 'AJUKAN': return <Clock className="w-3.5 h-3.5 text-blue-500" />;
    case 'PROSES': return <Loader2 className="w-3.5 h-3.5 text-amber-500" />;
    case 'APPROVE': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case 'REJECT': return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'CETAK': return <Printer className="w-3.5 h-3.5 text-purple-500" />;
    case 'BATAL': return <Ban className="w-3.5 h-3.5 text-slate-500" />;
    case 'ARSIP': return <Shield className="w-3.5 h-3.5 text-teal-500" />;
    default: return <FileText className="w-3.5 h-3.5 text-gray-400" />;
  }
}

// ============ MAIN COMPONENT ============

export function SuratDetail({ suratId, onProses, onApprove, onRefresh, onClose }: SuratDetailProps) {
  const [surat, setSurat] = useState<SuratDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullLog, setShowFullLog] = useState(false);
  const [showIsiSurat, setShowIsiSurat] = useState(false);
  const [approveInitialMode, setApproveInitialMode] = useState<'approve' | 'reject' | undefined>(undefined);

  const fetchSurat = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/surat/${suratId}`);
      if (!response.ok) throw new Error('Gagal');
      const result = await response.json();
      if (result.success) {
        setSurat(result.data);
      } else {
        toast.error(result.error || 'Gagal memuat detail surat');
        onClose?.();
      }
    } catch {
      toast.error('Gagal memuat detail surat');
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [suratId, onClose]);

  useEffect(() => {
    fetchSurat();
  }, [fetchSurat]);

  // Parse isi surat
  let isiSuratParsed: Record<string, string> | null = null;
  if (surat?.isiSurat) {
    try {
      isiSuratParsed = JSON.parse(surat.isiSurat);
    } catch {
      isiSuratParsed = null;
    }
  }

  // Action buttons based on status
  const getActionButtons = () => {
    if (!surat) return [];
    const buttons: { label: string; icon: React.ReactNode; onClick: () => void; variant: 'default' | 'outline' | 'destructive'; className?: string }[] = [];

    switch (surat.status) {
      case 'MENUNGGU_PROSES':
        buttons.push({
          label: 'Proses Surat',
          icon: <Loader2 className="w-4 h-4" />,
          onClick: () => onProses?.(surat.id),
          variant: 'default',
          className: 'bg-emerald-600 hover:bg-emerald-700',
        });
        buttons.push({
          label: 'Tolak',
          icon: <XCircle className="w-4 h-4" />,
          onClick: () => {
            setApproveInitialMode('reject');
            onApprove?.(surat.id, 'reject');
          },
          variant: 'destructive',
        });
        break;
      case 'MENUNGGU_APPROVAL':
        buttons.push({
          label: 'Setujui',
          icon: <CheckCircle2 className="w-4 h-4" />,
          onClick: () => {
            setApproveInitialMode('approve');
            onApprove?.(surat.id, 'approve');
          },
          variant: 'default',
          className: 'bg-emerald-600 hover:bg-emerald-700',
        });
        buttons.push({
          label: 'Tolak',
          icon: <XCircle className="w-4 h-4" />,
          onClick: () => {
            setApproveInitialMode('reject');
            onApprove?.(surat.id, 'reject');
          },
          variant: 'destructive',
        });
        break;
      case 'DISETUJUI':
      case 'DICETAK':
      case 'DIARSIPKAN':
        buttons.push({
          label: 'Cetak',
          icon: <Printer className="w-4 h-4" />,
          onClick: () => { window.open(`/api/surat/${surat.id}/pdf`, '_blank'); },
          variant: 'outline',
        });
        break;
      case 'DITOLAK_KADES':
      case 'DITOLAK_OPERATOR':
        buttons.push({
          label: 'Proses Ulang',
          icon: <Loader2 className="w-4 h-4" />,
          onClick: () => onProses?.(surat.id),
          variant: 'default',
          className: 'bg-amber-600 hover:bg-amber-700',
        });
        break;
    }

    if (surat.status !== 'DISETUJUI' && surat.status !== 'DICETAK' && surat.status !== 'DIARSIPKAN' && surat.status !== 'DIBATALKAN' && surat.status !== 'DITOLAK_KADES' && surat.status !== 'DITOLAK_OPERATOR') {
      buttons.push({
        label: 'Batalkan',
        icon: <Ban className="w-4 h-4" />,
        onClick: async () => {
          try {
            const res = await fetch(`/api/surat/${surat.id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'DIBATALKAN', keterangan: 'Dibatalkan oleh pengguna' }),
            });
            const result = await res.json();
            if (result.success) {
              toast.success('Surat berhasil dibatalkan');
              fetchSurat();
              onRefresh?.();
            } else {
              toast.error(result.error || 'Gagal membatalkan');
            }
          } catch {
            toast.error('Gagal membatalkan surat');
          }
        },
        variant: 'destructive',
      });
    }

    return buttons;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!surat) return null;

  const actionButtons = getActionButtons();
  const displayLogs = showFullLog ? surat.log : surat.log.slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{surat.jenisSurat.nama}</h3>
            <p className="text-sm text-gray-500">{getKategoriLabel(surat.jenisSurat.kategori)}</p>
          </div>
        </div>
        <SuratStatusBadge status={surat.status} size="lg" />
      </div>

      {/* Nomor Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {surat.nomorSurat && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <Hash className="w-5 h-5 text-emerald-500" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Nomor Surat</p>
              <p className="text-sm font-bold font-mono text-gray-800">{surat.nomorSurat}</p>
            </div>
          </div>
        )}
        {(surat.nomorRegisterFmt || surat.nomorRegister) && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
            <Hash className="w-5 h-5 text-teal-500" />
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Nomor Register</p>
              <p className="text-sm font-bold font-mono text-gray-800">{surat.nomorRegisterFmt || surat.nomorRegister}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {actionButtons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actionButtons.map((btn) => (
            <Button
              key={btn.label}
              variant={btn.variant}
              size="sm"
              onClick={btn.onClick}
              className={btn.className}
            >
              {btn.icon}
              <span className="ml-1.5">{btn.label}</span>
            </Button>
          ))}
        </div>
      )}

      <Separator />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Pemohon Info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-500" />
              Data Pemohon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Nama" value={surat.pemohonNama} />
            {surat.pemohonNIK && (
              <InfoRow label="NIK" value={surat.pemohonNIK} mono />
            )}
            {surat.pemohonTelepon && (
              <InfoRow label="Telepon" value={surat.pemohonTelepon} icon={<Phone className="w-3 h-3 text-gray-400" />} />
            )}
            {surat.pemohonAlamat && (
              <InfoRow label="Alamat" value={surat.pemohonAlamat} icon={<MapPin className="w-3 h-3 text-gray-400" />} />
            )}
            {(surat.pemohonRT || surat.pemohonRW || surat.pemohonDusun) && (
              <InfoRow
                label="Wilayah"
                value={[surat.pemohonRT && `RT ${surat.pemohonRT}`, surat.pemohonRW && `RW ${surat.pemohonRW}`, surat.pemohonDusun].filter(Boolean).join(', ')}
              />
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              Riwayat Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {displayLogs.map((log, idx) => (
                <div key={log.id} className="flex gap-3 pb-4 last:pb-0">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                      {getLogIcon(log.aksi)}
                    </div>
                    {idx < displayLogs.length - 1 && (
                      <div className="w-px flex-1 bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <p className="text-sm font-medium text-gray-800">
                      {getLogAksiLabel(log.aksi)}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {log.userName} &middot; {formatDate(log.createdAt)}
                    </p>
                    {log.keterangan && (
                      <p className="text-xs text-gray-500 mt-0.5">{log.keterangan}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {surat.log.length > 4 && (
              <button
                onClick={() => setShowFullLog(!showFullLog)}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                {showFullLog ? (
                  <>
                    <ChevronUp className="w-3 h-3" /> Tampilkan sedikit
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" /> Lihat semua ({surat.log.length})
                  </>
                )}
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Isi Surat */}
      {isiSuratParsed && Object.keys(isiSuratParsed).length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader
            className="pb-0 cursor-pointer"
            onClick={() => setShowIsiSurat(!showIsiSurat)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-500" />
                Isi Surat
              </CardTitle>
              {showIsiSurat ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </CardHeader>
          <AnimatePresence>
            {showIsiSurat && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {Object.entries(isiSuratParsed).map(([key, value]) => (
                      <div key={key} className="space-y-0.5">
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <p className="text-sm text-gray-800">
                          {value || <span className="text-gray-300 italic">-</span>}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      {/* Additional Info */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Tanggal Pengajuan</p>
              <p className="text-gray-700 font-medium">
                {surat.tanggalAjukan ? formatDateShort(surat.tanggalAjukan) : '-'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Tanggal Proses</p>
              <p className="text-gray-700 font-medium">
                {surat.tanggalProses ? formatDateShort(surat.tanggalProses) : '-'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Tanggal Selesai</p>
              <p className="text-gray-700 font-medium">
                {surat.tanggalSelesai ? formatDateShort(surat.tanggalSelesai) : '-'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Operator</p>
              <p className="text-gray-700 font-medium">{surat.operator?.namaLengkap || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Catatan & Alasan */}
      {(surat.catatanOperator || surat.catatanApprover || surat.alasanDitolak) && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 space-y-3">
            {surat.catatanOperator && (
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">Catatan Operator</p>
                <p className="text-sm text-blue-800">{surat.catatanOperator}</p>
              </div>
            )}
            {surat.catatanApprover && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                <p className="text-xs font-semibold text-emerald-700 mb-1">Catatan Approver</p>
                <p className="text-sm text-emerald-800">{surat.catatanApprover}</p>
              </div>
            )}
            {surat.alasanDitolak && (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  <p className="text-xs font-semibold text-red-700">Alasan Penolakan</p>
                </div>
                <p className="text-sm text-red-800">{surat.alasanDitolak}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approver Info */}
      {surat.approver && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Shield className="w-4 h-4" />
          <span>Disetujui oleh: <strong className="text-gray-700">{surat.approver.namaLengkap}</strong></span>
        </div>
      )}
    </div>
  );
}

// ============ INFO ROW ============

function InfoRow({ label, value, icon, mono }: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      {icon && <div className="mt-0.5 shrink-0">{icon}</div>}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400">{label}</p>
        <p className={cn('text-sm text-gray-800', mono && 'font-mono')}>{value || '-'}</p>
      </div>
    </div>
  );
}
