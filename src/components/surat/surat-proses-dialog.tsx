'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Hash, FileText, User, AlertCircle, CheckCircle2,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getKategoriLabel } from '@/lib/surat-utils';

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
  pemohonRT: string | null;
  pemohonRW: string | null;
  pemohonDusun: string | null;
  pemohonTelepon: string | null;
  status: string;
  isiSurat: string;
  catatanOperator: string | null;
}

interface NomorPreview {
  nomorSurat: string;
  nomorRegister: string;
}

interface SuratProsesDialogProps {
  suratId: string | null;
  open: boolean;
  onClose: () => void;
}

// ============ MAIN COMPONENT ============

export function SuratProsesDialog({ suratId, open, onClose }: SuratProsesDialogProps) {
  const [surat, setSurat] = useState<SuratData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nomorPreview, setNomorPreview] = useState<NomorPreview | null>(null);
  const [catatan, setCatatan] = useState('');

  // Dynamic fields parsed from isiSurat
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({});

  const fetchSurat = useCallback(async () => {
    if (!suratId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/surat/${suratId}`);
      if (!response.ok) throw new Error('Gagal');
      const result = await response.json();
      if (result.success) {
        setSurat(result.data);
        setCatatan(result.data.catatanOperator || '');
        // Parse existing isi surat
        if (result.data.isiSurat) {
          try {
            const parsed = JSON.parse(result.data.isiSurat);
            if (typeof parsed === 'object') setDynamicFields(parsed);
          } catch {
            // ignore
          }
        }
      }
    } catch {
      toast.error('Gagal memuat data surat');
    } finally {
      setLoading(false);
    }
  }, [suratId]);

  // Fetch nomor preview - depends on surat state (reads jenisSuratId from surat, not re-fetching)
  const fetchNomorPreview = useCallback(async () => {
    if (!surat) return;
    // Skip preview if surat already has a nomor (re-processing rejected surat)
    if (surat.nomorSurat) return;
    try {
      const jenisSuratId = surat.jenisSurat.id;

      const [suratRes, regRes] = await Promise.all([
        fetch(`/api/surat/nomor/generate?jenisSuratId=${jenisSuratId}`),
        fetch(`/api/surat/nomor/register/generate`),
      ]);
      if (suratRes.ok) {
        const sData = await suratRes.json();
        if (sData.success) setNomorPreview((prev) => ({ ...prev, nomorSurat: sData.data.nomorSurat }));
      }
      if (regRes.ok) {
        const rData = await regRes.json();
        if (rData.success) setNomorPreview((prev) => ({ ...prev, nomorRegister: rData.data.nomorRegister }));
      }
    } catch {
      // Ignore preview errors
    }
  }, [surat]);

  // Fetch surat data when dialog opens
  useEffect(() => {
    if (open && suratId) {
      fetchSurat();
    }
    if (!open) {
      setSurat(null);
      setNomorPreview(null);
      setCatatan('');
      setDynamicFields({});
    }
  }, [open, suratId, fetchSurat]);

  // Fetch nomor preview ONLY after surat data is available (avoids redundant fetch)
  useEffect(() => {
    if (open && surat) {
      fetchNomorPreview();
    }
  }, [open, surat, fetchNomorPreview]);

  // Parse isi surat for dynamic fields
  let isiSuratParsed: Record<string, string> | null = null;
  if (surat?.isiSurat) {
    try {
      isiSuratParsed = JSON.parse(surat.isiSurat);
    } catch {
      isiSuratParsed = null;
    }
  }

  const handleSubmit = async () => {
    if (!suratId) return;

    try {
      setSubmitting(true);
      const body: Record<string, unknown> = {
        catatanOperator: catatan.trim() || undefined,
      };

      // Include dynamic fields in update
      if (Object.keys(dynamicFields).length > 0) {
        body.isiSurat = JSON.stringify(dynamicFields);
      }

      const response = await fetch(`/api/surat/${suratId}/proses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || 'Surat berhasil diproses!');
        onClose();
      } else {
        toast.error(result.error || 'Gagal memproses surat');
      }
    } catch {
      toast.error('Terjadi kesalahan saat memproses surat');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-emerald-500" />
            Proses Surat
          </DialogTitle>
          <DialogDescription>
            Periksa dan proses surat. Nomor surat dan register akan otomatis di-generate.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : surat ? (
          <div className="space-y-4">
            {/* Nomor Preview */}
            {nomorPreview && (
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  Preview Nomor yang Akan Diberikan
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-emerald-600">Nomor Surat</p>
                    <p className="text-sm font-bold font-mono text-emerald-800">
                      {nomorPreview.nomorSurat || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-emerald-600">Nomor Register</p>
                    <p className="text-sm font-bold font-mono text-emerald-800">
                      {nomorPreview.nomorRegister || '-'}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-600/70">
                  * Nomor belum disimpan. Akan digenerate saat proses dikonfirmasi.
                </p>
              </div>
            )}

            {/* Surat Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <FileText className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{surat.jenisSurat.nama}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[10px]">{getKategoriLabel(surat.jenisSurat.kategori)}</Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        surat.jenisSurat.tingkatApproval === 'PERLU_APPROVAL'
                          ? 'border-amber-300 text-amber-700'
                          : 'border-emerald-300 text-emerald-700',
                      )}
                    >
                      {surat.jenisSurat.tingkatApproval === 'PERLU_APPROVAL'
                        ? 'Perlu Approval Kades'
                        : 'Langsung Diproses'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Pemohon */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data Pemohon</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-gray-400">Nama</p>
                    <p className="text-sm text-gray-800">{surat.pemohonNama}</p>
                  </div>
                  {surat.pemohonNIK && (
                    <div>
                      <p className="text-[11px] text-gray-400">NIK</p>
                      <p className="text-sm text-gray-800 font-mono">{surat.pemohonNIK}</p>
                    </div>
                  )}
                  {surat.pemohonAlamat && (
                    <div className="col-span-2">
                      <p className="text-[11px] text-gray-400">Alamat</p>
                      <p className="text-sm text-gray-800">{surat.pemohonAlamat}</p>
                    </div>
                  )}
                  {surat.pemohonTelepon && (
                    <div>
                      <p className="text-[11px] text-gray-400">Telepon</p>
                      <p className="text-sm text-gray-800">{surat.pemohonTelepon}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Fields */}
            {isiSuratParsed && Object.keys(isiSuratParsed).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Isi Surat (Dapat Diedit)
                  </p>
                  {Object.entries(isiSuratParsed).map(([key, defaultValue]) => (
                    <div key={key} className="space-y-1.5">
                      <Label className="text-sm">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </Label>
                      <Input
                        value={dynamicFields[key] ?? defaultValue ?? ''}
                        onChange={(e) =>
                          setDynamicFields((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Catatan Operator */}
            <div className="space-y-1.5">
              <Label className="text-sm">Catatan Operator</Label>
              <Textarea
                placeholder="Catatan untuk surat ini (opsional)"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={2}
              />
            </div>

            {/* Info */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Setelah diproses, surat akan mendapat nomor dan status akan berubah menjadi
                  {surat.jenisSurat.tingkatApproval === 'PERLU_APPROVAL'
                    ? ' Menunggu Approval (menunggu persetujuan Kepala Desa).'
                    : ' Dalam Proses.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Tidak dapat memuat data surat</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || loading || !surat}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Proses Surat
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
