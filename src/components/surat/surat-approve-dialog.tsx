'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Hash, FileText, User,
  AlertCircle, AlertTriangle, Loader2, Shield,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { SuratStatusBadge } from './surat-status-badge';
import { getKategoriLabel, getStatusLabel } from '@/lib/surat-utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============ TYPES ============

interface SuratData {
  id: string;
  nomorSurat: string | null;
  nomorRegisterFmt: string | null;
  jenisSurat: { id: string; kode: string; nama: string; kategori: string; tingkatApproval: string };
  pemohon: { id: string; namaLengkap: string; nik: string } | null;
  pemohonNama: string;
  pemohonNIK: string | null;
  pemohonAlamat: string | null;
  status: string;
  catatanOperator: string | null;
  operator: { id: string; namaLengkap: string; username: string } | null;
}

type ApprovalMode = 'approve' | 'reject' | null;

interface SuratApproveDialogProps {
  suratId: string | null;
  open: boolean;
  onClose: () => void;
}

// ============ MAIN COMPONENT ============

export function SuratApproveDialog({ suratId, open, onClose }: SuratApproveDialogProps) {
  const [surat, setSurat] = useState<SuratData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<ApprovalMode>(null);
  const [alasanTolak, setAlasanTolak] = useState('');
  const [catatanApprover, setCatatanApprover] = useState('');

  const fetchSurat = useCallback(async () => {
    if (!suratId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/surat/${suratId}`);
      if (!response.ok) throw new Error('Gagal');
      const result = await response.json();
      if (result.success) {
        setSurat(result.data);
      }
    } catch {
      toast.error('Gagal memuat data surat');
    } finally {
      setLoading(false);
    }
  }, [suratId]);

  useEffect(() => {
    if (open && suratId) {
      fetchSurat();
      // Determine mode based on status
      setMode(null);
      setAlasanTolak('');
      setCatatanApprover('');
    }
    if (!open) {
      setSurat(null);
      setMode(null);
      setAlasanTolak('');
      setCatatanApprover('');
    }
  }, [open, suratId, fetchSurat]);

  // Check if surat can be approved/rejected
  const canApprove = surat && ['DIPROSES', 'DICETAK', 'DIVERIFIKASI'].includes(surat.status);
  const canReject = surat && ['DIAJUKAN', 'DIVERIFIKASI', 'DIPROSES', 'DICETAK'].includes(surat.status);

  const handleApprove = async () => {
    if (!suratId) return;
    try {
      setSubmitting(true);
      const response = await fetch(`/api/surat/${suratId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catatanApprover: catatanApprover.trim() || undefined,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message || 'Surat berhasil disetujui!');
        onClose();
      } else {
        toast.error(result.error || 'Gagal menyetujui surat');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyetujui surat');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!suratId) return;
    if (!alasanTolak.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch(`/api/surat/${suratId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alasanDitolak: alasanTolak.trim(),
          catatanApprover: catatanApprover.trim() || undefined,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message || 'Surat berhasil ditolak');
        onClose();
      } else {
        toast.error(result.error || 'Gagal menolak surat');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menolak surat');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            {mode === 'reject' ? 'Tolak Surat' : mode === 'approve' ? 'Setujui Surat' : 'Review Surat'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'reject'
              ? 'Berikan alasan penolakan surat.'
              : mode === 'approve'
                ? 'Konfirmasi persetujuan surat.'
                : 'Periksa surat dan tentukan tindakan.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : surat ? (
          <div className="space-y-4">
            {/* Surat Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{surat.jenisSurat.nama}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">
                      {getKategoriLabel(surat.jenisSurat.kategori)}
                    </Badge>
                    <SuratStatusBadge status={surat.status} size="sm" />
                  </div>
                </div>
              </div>

              {/* Nomor Info */}
              {(surat.nomorSurat || surat.nomorRegisterFmt) && (
                <div className="grid grid-cols-2 gap-2">
                  {surat.nomorSurat && (
                    <div className="flex items-center gap-2 p-2 rounded bg-gray-50 text-sm">
                      <Hash className="w-3.5 h-3.5 text-emerald-500" />
                      <div>
                        <p className="text-[10px] text-gray-400">No. Surat</p>
                        <p className="font-mono font-bold text-gray-800 text-xs">{surat.nomorSurat}</p>
                      </div>
                    </div>
                  )}
                  {surat.nomorRegisterFmt && (
                    <div className="flex items-center gap-2 p-2 rounded bg-gray-50 text-sm">
                      <Hash className="w-3.5 h-3.5 text-teal-500" />
                      <div>
                        <p className="text-[10px] text-gray-400">No. Register</p>
                        <p className="font-mono font-bold text-gray-800 text-xs">{surat.nomorRegisterFmt}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pemohon */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{surat.pemohonNama}</p>
                  {surat.pemohonNIK && (
                    <p className="text-[11px] text-gray-400 font-mono">NIK: {surat.pemohonNIK}</p>
                  )}
                </div>
              </div>

              {/* Operator Info */}
              {surat.operator && surat.catatanOperator && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm">
                  <p className="text-xs font-semibold text-blue-700 mb-1">
                    Catatan Operator: {surat.operator.namaLengkap}
                  </p>
                  <p className="text-blue-800">{surat.catatanOperator}</p>
                </div>
              )}
            </div>

            {/* Action Selection (when mode is null) */}
            {!mode && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Pilih Tindakan:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => setMode('approve')}
                      disabled={!canApprove}
                      className={cn(
                        'h-auto py-3 flex-col gap-2 bg-emerald-600 hover:bg-emerald-700',
                        !canApprove && 'opacity-50 cursor-not-allowed',
                      )}
                    >
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="text-xs font-semibold">Setujui Surat</span>
                    </Button>
                    <Button
                      onClick={() => setMode('reject')}
                      disabled={!canReject}
                      variant="destructive"
                      className="h-auto py-3 flex-col gap-2"
                    >
                      <XCircle className="w-6 h-6" />
                      <span className="text-xs font-semibold">Tolak Surat</span>
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Approve Mode */}
            {mode === 'approve' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm font-semibold text-emerald-800">
                        Konfirmasi Persetujuan
                      </p>
                    </div>
                    <p className="text-xs text-emerald-700">
                      Surat {surat.jenisSurat.nama} untuk {surat.pemohonNama} akan disetujui
                      {surat.nomorSurat && ` dengan nomor ${surat.nomorSurat}`}.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Catatan Approver (Opsional)</Label>
                    <Textarea
                      placeholder="Tambahkan catatan jika diperlukan..."
                      value={catatanApprover}
                      onChange={(e) => setCatatanApprover(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMode(null)}
                    className="text-xs"
                  >
                    Kembali ke Pilihan
                  </Button>
                </div>
              </>
            )}

            {/* Reject Mode */}
            {mode === 'reject' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <p className="text-sm font-semibold text-red-800">
                        Penolakan Surat
                      </p>
                    </div>
                    <p className="text-xs text-red-700">
                      Surat {surat.jenisSurat.nama} untuk {surat.pemohonNama} akan ditolak.
                      Pemohon akan diberitahu melalui alasan yang Anda berikan.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      Alasan Penolakan <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder="Jelaskan alasan penolakan surat ini..."
                      value={alasanTolak}
                      onChange={(e) => setAlasanTolak(e.target.value)}
                      rows={3}
                      className={cn(
                        alasanTolak.length > 0 && 'border-emerald-300',
                      )}
                    />
                    <p className="text-[10px] text-gray-400">
                      {alasanTolak.length}/500 karakter
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm">Catatan Tambahan (Opsional)</Label>
                    <Textarea
                      placeholder="Catatan tambahan..."
                      value={catatanApprover}
                      onChange={(e) => setCatatanApprover(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMode(null)}
                    className="text-xs"
                  >
                    Kembali ke Pilihan
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Tidak dapat memuat data surat</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {mode ? 'Batal' : 'Tutup'}
          </Button>
          {mode === 'approve' && (
            <Button
              onClick={handleApprove}
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyetujui...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Setujui Surat
                </>
              )}
            </Button>
          )}
          {mode === 'reject' && (
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || !alasanTolak.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menolak...
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Tolak Surat
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
