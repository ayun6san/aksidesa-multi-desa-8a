'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Users,
  Briefcase,
  FileText,
  MapPin,
  Phone,
  Heart,
  Upload,
  X,
  ArrowLeft,
  Home,
  ChevronRight,
  BadgeCheck,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  pekerjaanGroups,
  pendidikanOptions,
  hubunganKeluargaToEnum,
  enumToHubunganKeluarga,
  golonganDarahOptions,
  golonganDarahLabels,
  agamaOptions,
  statusPerkawinanOptions,
  statusPerkawinanLabels,
  penghasilanOptions,
  statusKTPOptions,
  disabilitasOptions,
} from '@/lib/kependudukan-constants';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useUnsavedChanges, UnsavedChangesDialog } from '@/hooks/use-unsaved-changes';

// Types, constants, utils
import {
  PendudukFormData,
  KKSearchResult,
  FormPendudukUnifiedProps,
  sanitizeFormData,
  initialFormData,
  fieldToTab,
} from '@/lib/penduduk-form-types';
import {
  validatePendudukForm,
  NikCheckState,
  NomorKKCheckState,
  calculateAge,
  getFormTitle,
  getFormBreadcrumbs,
  getHubunganKeluargaOptions,
} from '@/lib/penduduk-form-utils';

// Sub-components
import { PendudukKKSelector } from './penduduk-kk-selector';
import { PendudukFormSidebar } from './penduduk-form-sidebar';
import { PendudukFormFields } from './penduduk-form-fields';

// Re-export FormPendudukUnifiedProps for backward compatibility
export type { FormPendudukUnifiedProps } from '@/lib/penduduk-form-types';

// ==================== COMPONENT ====================

export function FormPendudukUnified({
  mode,
  layout = 'full-page',
  kkInfo,
  kkOptions = [],
  editingPenduduk,
  wilayahOptions,
  onBack,
  onSubmit,
  loading = false,
}: FormPendudukUnifiedProps) {
  // Step state (untuk mode penduduk-baru)
  const [step, setStep] = useState<'pilih-kk' | 'form-data'>(
    mode === 'penduduk-baru' ? 'pilih-kk' : 'form-data'
  );

  // KK selection state (untuk mode penduduk-baru)
  const [kkStatus, setKkStatus] = useState<'belum-punya' | 'sudah-punya' | null>(null);
  const [selectedKK, setSelectedKK] = useState<KKSearchResult | null>(null);
  const [kkSearchQuery, setKkSearchQuery] = useState('');
  const [kkSearchResults, setKkSearchResults] = useState<KKSearchResult[]>([]);
  const [kkSearching, setKkSearching] = useState(false);

  // New KK data
  const [newKKData, setNewKKData] = useState({
    nomorKK: '',
    alamat: '',
    rtId: '',
    dusunId: '',
  });

  // Form state
  const [activeMenu, setActiveMenu] = useState('pribadi');
  const [formData, setFormData] = useState<PendudukFormData>(() => {
    if (editingPenduduk) {
      // Sanitize null values to empty strings for form inputs
      const sanitized = sanitizeFormData(editingPenduduk);
      // Convert hubunganKeluarga from enum to label
      const hubunganLabel = enumToHubunganKeluarga[sanitized.hubunganKeluarga || ''] || sanitized.hubunganKeluarga || '';
      return {
        ...initialFormData,
        ...sanitized,
        hubunganKeluarga: hubunganLabel,
        tanggalLahir: sanitized.tanggalLahir?.split('T')[0] || '',
        tanggalPerkawinan: sanitized.tanggalPerkawinan?.split('T')[0] || '',
        tanggalPerceraian: sanitized.tanggalPerceraian?.split('T')[0] || '',
        tanggalMasuk: sanitized.tanggalMasuk?.split('T')[0] || '',
      };
    }
    if (mode === 'anggota-kk' && kkInfo) {
      return { ...initialFormData, kkId: kkInfo.id };
    }
    return initialFormData;
  });

  // Store initial form data for dirty tracking (defined after formData)
  const initialFormDataRef = useRef<PendudukFormData>(formData);

  const [errors, setErrors] = useState<Partial<Record<keyof PendudukFormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);



  // Check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    // Compare current form data with initial data
    const keys = Object.keys(formData) as (keyof PendudukFormData)[];
    for (const key of keys) {
      const initialValue = initialFormDataRef.current[key];
      const currentValue = formData[key];
      
      // Skip certain fields
      if (key === 'urutanDalamKK') continue;
      
      // Handle null/undefined/empty string comparison
      const normalizeValue = (val: any) => {
        if (val === null || val === undefined || val === '') return '';
        return val;
      };
      
      if (normalizeValue(initialValue) !== normalizeValue(currentValue)) {
        return true;
      }
    }
    return false;
  }, [formData, mode]);

  // Unsaved changes hook
  const {
    showDialog: showUnsavedDialog,
    setShowDialog: setShowUnsavedDialog,
    handleConfirm: handleConfirmLeave,
    handleCancel: handleCancelLeave,
    checkAndConfirm,
    resetConfirmation,
  } = useUnsavedChanges({
    hasUnsavedChanges: hasUnsavedChanges(),
    enabled: true, // Enable for all modes (add & edit)
  });

  // Handle back with confirmation
  const handleBackWithConfirm = useCallback(() => {
    checkAndConfirm(onBack);
  }, [checkAndConfirm, onBack]);

  const fotoInputRef = useRef<HTMLInputElement>(null);
  const fotoKTPInputRef = useRef<HTMLInputElement>(null);

  // ==================== REAL-TIME VALIDATION: NIK & NOMOR KK ====================

  // NIK duplicate check state
  const [nikCheck, setNikCheck] = useState<NikCheckState>({ checking: false, exists: false });

  // Nomor KK duplicate check state
  const [nomorKKCheck, setNomorKKCheck] = useState<NomorKKCheckState>({ checking: false, exists: false });

  // Warning when changing statusPerkawinan in edit mode
  const initialStatusPerkawinan = editingPenduduk?.statusPerkawinan || '';
  const [showPerkawinanWarning, setShowPerkawinanWarning] = useState(false);
  const [pendingPerkawinanValue, setPendingPerkawinanValue] = useState('');

  const applyStatusPerkawinanChange = (newValue: string) => {
    setFormData(prev => {
      const showNikah = newValue === 'KAWIN_TERCATAT' || newValue === 'CERAI_MATI';
      const showCerai = newValue === 'CERAI_HIDUP_TERCATAT' || newValue === 'CERAI_HIDUP_TIDAK_TERCATAT';
      return {
        ...prev,
        statusPerkawinan: newValue,
        // Clear perkawinan fields when they're not shown
        ...(showNikah ? {} : { aktaPerkawinan: '', tanggalPerkawinan: '' }),
        // Clear perceraian fields when they're not shown
        ...(showCerai ? {} : { aktaPerceraian: '', tanggalPerceraian: '' }),
      };
    });
    setErrors(prev => ({ ...prev, statusPerkawinan: undefined }));
  };

  const handleStatusPerkawinanChange = (newValue: string) => {
    if (mode === 'edit' && newValue !== initialStatusPerkawinan && initialStatusPerkawinan) {
      setPendingPerkawinanValue(newValue);
      setShowPerkawinanWarning(true);
    } else {
      applyStatusPerkawinanChange(newValue);
    }
  };

  const confirmPerkawinanEdit = () => {
    setShowPerkawinanWarning(false);
    applyStatusPerkawinanChange(pendingPerkawinanValue);
  };

  const cancelPerkawinanEdit = () => {
    setShowPerkawinanWarning(false);
    setPendingPerkawinanValue('');
  };

  // Debounced NIK check
  useEffect(() => {
    const nik = formData.nik;
    if (!nik || nik.length !== 16) {
      setNikCheck({ checking: false, exists: false });
      return;
    }

    setNikCheck(prev => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const excludeId = editingPenduduk?.id || '';
        const res = await fetch(`/api/kependudukan/penduduk/check-nik?nik=${nik}&excludeId=${excludeId}`);
        const data = await res.json();
        if (data.success && data.exists) {
          setNikCheck({ checking: false, exists: true, nama: data.penduduk.namaLengkap });
        } else {
          setNikCheck({ checking: false, exists: false });
        }
      } catch {
        setNikCheck({ checking: false, exists: false });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.nik, editingPenduduk?.id]);

  // Debounced Nomor KK check (for new KK in penduduk-baru mode)
  useEffect(() => {
    const nomorKK = newKKData.nomorKK;
    if (!nomorKK || nomorKK.length !== 16) {
      setNomorKKCheck({ checking: false, exists: false });
      return;
    }

    setNomorKKCheck(prev => ({ ...prev, checking: true }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/kependudukan/kk/check-nomorkk?nomorKK=${nomorKK}`);
        const data = await res.json();
        if (data.success && data.exists) {
          setNomorKKCheck({ checking: false, exists: true, kepalaKeluarga: data.kk.kepalaKeluarga });
        } else {
          setNomorKKCheck({ checking: false, exists: false });
        }
      } catch {
        setNomorKKCheck({ checking: false, exists: false });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [newKKData.nomorKK]);

  // Search KK
  const searchKK = async (query: string) => {
    if (!query.trim()) {
      setKkSearchResults([]);
      return;
    }

    setKkSearching(true);
    try {
      const response = await fetch(`/api/kependudukan/kk?search=${encodeURIComponent(query)}&limit=10`);
      const result = await response.json();
      if (result.success) {
        setKkSearchResults(result.data.map((kk: any) => ({
          id: kk.id,
          nomorKK: kk.nomorKK,
          kepalaKeluarga: kk.kepalaKeluarga || 'Belum ada KK',
          alamat: kk.alamat,
          rt: kk.rt || '-',
          rw: kk.rw || '-',
          dusun: kk.dusun || '-',
          jumlahAnggota: kk.jumlahAnggota || 0,
        })));
      }
    } catch (error) {
      console.error('Error searching KK:', error);
    } finally {
      setKkSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (kkStatus === 'sudah-punya' && kkSearchQuery) {
        searchKK(kkSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [kkSearchQuery, kkStatus]);





  // Handle KK status selection
  const handleKkStatusSelect = (status: 'belum-punya' | 'sudah-punya') => {
    setKkStatus(status);
    setSelectedKK(null);
    setKkSearchQuery('');
    setKkSearchResults([]);

    if (status === 'belum-punya') {
      setNewKKData({
        nomorKK: '',
        alamat: '',
        rtId: '',
        dusunId: '',
      });
    }
  };

  // Handle KK selection
  const handleSelectKK = (kk: KKSearchResult) => {
    setSelectedKK(kk);
    setFormData(prev => ({
      ...prev,
      kkId: kk.id,
    }));
  };

  // Proceed to form data
  const handleProceedToForm = () => {
    if (kkStatus === 'belum-punya') {
      if (!newKKData.alamat.trim()) {
        toast.error('Alamat wajib diisi');
        return;
      }
      if (nomorKKCheck.exists) {
        toast.error(`Nomor KK sudah digunakan oleh KK ${nomorKKCheck.kepalaKeluarga}`);
        return;
      }
      if (!newKKData.rtId) {
        toast.error('RT/RW/Dusun wajib dipilih');
        return;
      }
      setFormData(prev => ({
        ...prev,
        hubunganKeluarga: 'Kepala Keluarga',
      }));
    } else if (kkStatus === 'sudah-punya') {
      if (!selectedKK) {
        toast.error('Pilih Kartu Keluarga terlebih dahulu');
        return;
      }
    }
    setStep('form-data');
  };

  const handleInputChange = (field: keyof PendudukFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Compress and resize image
  const compressImage = (
    file: File,
    field: 'foto' | 'fotoKTP'
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        // Target dimensions based on field type
        let targetWidth: number;
        let targetHeight: number;

        if (field === 'foto') {
          // Portrait photo: 300 × 450 px (2x display for retina, 2:3 aspect ratio)
          targetWidth = 300;
          targetHeight = 450;
        } else {
          // KTP photo: 600 × 400 px (3:2 aspect ratio)
          targetWidth = 600;
          targetHeight = 400;
        }

        // Set canvas dimensions
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Calculate scaling to cover the target area (crop to fill)
        const sourceRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;

        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.width;
        let sourceHeight = img.height;

        if (sourceRatio > targetRatio) {
          // Source is wider - crop sides
          sourceWidth = img.height * targetRatio;
          sourceX = (img.width - sourceWidth) / 2;
        } else {
          // Source is taller - crop top/bottom
          sourceHeight = img.width / targetRatio;
          sourceY = (img.height - sourceHeight) / 2;
        }

        // Enable high-quality image smoothing
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw resized image
          ctx.drawImage(
            img,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, targetWidth, targetHeight
          );

          // Convert to JPEG with 85% quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          URL.revokeObjectURL(img.src);
          resolve(compressedDataUrl);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'foto' | 'fotoKTP') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    // Validate file size (max 3MB)
    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Ukuran file maksimal 3MB');
      return;
    }

    try {
      // Show loading toast
      const loadingToast = toast.loading('Memproses gambar...');

      // Compress and resize image
      const compressedImage = await compressImage(file, field);

      // Calculate compressed size
      const compressedSize = Math.round((compressedImage.length * 3) / 4);
      const compressedKB = (compressedSize / 1024).toFixed(1);
      const originalKB = (file.size / 1024).toFixed(1);

      // Update form data
      setFormData(prev => ({ ...prev, [field]: compressedImage }));

      // Dismiss loading and show success
      toast.dismiss(loadingToast);
      toast.success('Gambar berhasil dikompresi', {
        description: `Ukuran: ${originalKB}KB → ${compressedKB}KB`,
      });
    } catch (error) {
      console.error('Error compressing image:', error);
      toast.error('Gagal memproses gambar');
    }

    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors = validatePendudukForm(formData, mode, nikCheck);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // Cari error pertama dan auto-navigate ke tab yang sesuai
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const targetTab = fieldToTab[firstErrorKey];
        const tabLabels: Record<string, string> = {
          pribadi: 'Data Pribadi',
          keluarga: 'Keluarga',
          kesehatan: 'Kesehatan',
          dokumen: 'Dokumen',
        };
        const tabLabel = tabLabels[targetTab] || targetTab;
        const errorMsg = errors[firstErrorKey as keyof PendudukFormData];
        toast.error(`${errorMsg} (Tab: ${tabLabel})`);

        if (targetTab && targetTab !== activeMenu) {
          setActiveMenu(targetTab);
        }

        // Scroll ke field error setelah tab berpindah
        setTimeout(() => {
          const errorField = document.getElementById(firstErrorKey);
          if (errorField) {
            errorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorField.focus();
          }
        }, 100);
      } else {
        toast.error('Mohon lengkapi data yang wajib diisi');
      }
      return;
    }

    setSubmitting(true);
    try {
      const kkBaru = (mode === 'penduduk-baru' && kkStatus === 'belum-punya') ? newKKData : null;
      
      // Convert hubunganKeluarga from label to enum before submitting
      const submitData = {
        ...formData,
        hubunganKeluarga: hubunganKeluargaToEnum[formData.hubunganKeluarga] || formData.hubunganKeluarga,
      };
      
      await onSubmit(submitData, kkBaru);
      // Reset confirmation state after successful submit
      resetConfirmation();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWilayahChange = (rtId: string) => {
    const selected = wilayahOptions.find(opt => opt.id === rtId);
    if (selected) {
      // Only used for new KK data in penduduk-baru mode
      if (mode === 'penduduk-baru' && step === 'pilih-kk' && kkStatus === 'belum-punya') {
        setNewKKData(prev => ({
          ...prev,
          rtId: selected.id,
          dusunId: selected.dusunId,
        }));
      }
    }
  };

  // ==================== RENDER FORM CONTENT ====================
  const renderFormContent = () => (
    <PendudukFormFields
      activeMenu={activeMenu}
      formData={formData}
      errors={errors}
      mode={mode}
      kkInfo={kkInfo}
      kkOptions={kkOptions}
      selectedKK={selectedKK}
      kkStatus={kkStatus}
      nikCheck={nikCheck}
      fotoInputRef={fotoInputRef}
      fotoKTPInputRef={fotoKTPInputRef}
      onInputChange={handleInputChange}
      handleStatusPerkawinanChange={handleStatusPerkawinanChange}
      handleFileUpload={handleFileUpload}
      onSetFormData={setFormData}
    />
  );

  // ==================== RENDER HEADER INFO ====================
  const renderHeaderInfo = () => {
    if (mode === 'edit' && editingPenduduk) {
      // Priority: kkInfo (from KK detail page) > kkOptions > editingPenduduk
      const currentKK = kkOptions.find(kk => kk.id === formData.kkId);
      const nomorKK = kkInfo?.nomorKK || currentKK?.nomorKK || editingPenduduk.nomorKK;
      const kepalaKeluarga = kkInfo?.kepalaKeluarga || currentKK?.kepalaKeluarga || (editingPenduduk as any).kepalaKeluarga;
      const alamatKK = kkInfo?.alamat || currentKK?.alamat || (editingPenduduk as any).alamat;
      const rtKK = kkInfo?.rt || currentKK?.rt || (editingPenduduk as any).rt;
      const rwKK = kkInfo?.rw || currentKK?.rw || (editingPenduduk as any).rw;
      const dusunKK = kkInfo?.dusun || currentKK?.dusun || (editingPenduduk as any).dusun;
      const jumlahAnggota = kkInfo?.jumlahAnggota || currentKK?.jumlahAnggota;
      const hasKK = !!(formData.kkId && nomorKK && nomorKK !== '-');
      
      return (
        <div className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-700">
          <div className="flex items-center gap-4">
            {/* Kolom 1: Foto */}
            <div className="flex-shrink-0">
              <div className="w-[52px] h-[68px] rounded-lg border-2 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center shadow-lg">
                {formData.foto ? (
                  <img src={formData.foto} alt={editingPenduduk.namaLengkap} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-7 h-7 text-white/80" />
                )}
              </div>
            </div>

            {/* Kolom 2: Nama + Status + Info */}
            <div className="flex-1 min-w-0">
              <p className="text-emerald-100 text-xs">Mengedit Data Penduduk</p>
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-lg font-bold text-white truncate">{editingPenduduk.namaLengkap}</h2>
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded",
                  formData.status === 'TETAP' ? "bg-emerald-500/40 text-white" :
                  formData.status === 'PENDATANG' ? "bg-amber-500/40 text-white" :
                  formData.status === 'PINDAH' ? "bg-orange-500/40 text-white" :
                  formData.status === 'MENINGGAL' ? "bg-red-500/40 text-white" :
                  "bg-gray-500/40 text-white"
                )}>
                  {formData.status || 'TETAP'}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                {editingPenduduk.nik && (
                  <span className="text-emerald-100 text-xs font-mono">NIK: {editingPenduduk.nik}</span>
                )}
                {editingPenduduk.tanggalLahir && (
                  <span className="text-emerald-200 text-xs">• {calculateAge(editingPenduduk.tanggalLahir)}</span>
                )}
              </div>
            </div>

            {/* Kolom 3: Kartu Keluarga */}
            <div className="flex-shrink-0">
              <div className="bg-white/15 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                {hasKK ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white/80 text-xs font-medium">Kartu Keluarga</span>
                      <Badge className="bg-white/25 text-white text-[10px] h-5 px-2">{jumlahAnggota || '-'} anggota</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-white/90">
                      {nomorKK && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Home className="w-3 h-3 flex-shrink-0" />
                          {nomorKK}
                        </span>
                      )}
                      {kepalaKeluarga && (
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <User className="w-3 h-3 flex-shrink-0" />
                          {kepalaKeluarga}
                        </span>
                      )}
                    </div>
                    {(alamatKK || dusunKK) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-white/80 mt-1">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="whitespace-nowrap">{alamatKK}</span>
                        {rtKK && rwKK && (
                          <>
                            <span className="text-white/50">•</span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">RT {rtKK}/RW {rwKK}</span>
                          </>
                        )}
                        {dusunKK && (
                          <>
                            <span className="text-white/50">•</span>
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">{dusunKK}</span>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-white/70 text-center py-1">
                    Belum terdaftar dalam KK
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (mode === 'anggota-kk' && kkInfo) {
      const subLabel = editingPenduduk ? 'Mengedit Anggota Keluarga' : 'Tambah Anggota Keluarga';
      return (
        <div className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-700">
          <div className="flex items-center gap-4">
            {/* Info KK */}
            <div className="flex-1 min-w-0">
              <p className="text-emerald-100 text-xs">{subLabel}</p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="flex items-center gap-1.5 text-[11px] text-white/90">
                  <Home className="w-3 h-3 flex-shrink-0" />
                  <span className="font-mono">{kkInfo.nomorKK || 'Belum ada Nomor KK'}</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-white/90">
                  <User className="w-3 h-3 flex-shrink-0" />
                  {kkInfo.kepalaKeluarga}
                </span>
                {(kkInfo.alamat || kkInfo.dusun) && (
                  <span className="flex items-center gap-1.5 text-[11px] text-white/80">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="whitespace-nowrap">{kkInfo.alamat || '-'} - {kkInfo.dusun} RT {kkInfo.rt}/RW {kkInfo.rw}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <Badge className="bg-white/25 text-white text-[10px] h-5 px-2">{kkInfo.jumlahAnggota} anggota</Badge>
            </div>
          </div>
        </div>
      );
    }

    if (mode === 'penduduk-baru' && step === 'form-data') {
      return (
        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
          {kkStatus === 'belum-punya' ? (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-gray-700">KK Baru:</span>
                <span className="font-mono text-emerald-700">{newKKData.nomorKK || 'Belum ada Nomor KK'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="text-gray-600">{newKKData.alamat}</span>
              </div>
              <Badge className="bg-amber-100 text-amber-700">Kepala Keluarga (otomatis)</Badge>
            </div>
          ) : selectedKK && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-gray-700">No. KK:</span>
                <span className="font-mono text-emerald-700">{selectedKK.nomorKK || 'Belum ada Nomor KK'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-gray-700">Kepala Keluarga:</span>
                <span className="text-gray-900">{selectedKK.kepalaKeluarga}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="text-gray-600">{selectedKK.alamat}{selectedKK.alamat && selectedKK.dusun ? ' — ' : ''}{selectedKK.dusun} - RT {selectedKK.rt}/RW {selectedKK.rw}</span>
              </div>
              <div className="ml-auto">
                <Badge className="bg-blue-100 text-blue-700">{selectedKK.jumlahAnggota} anggota terdaftar</Badge>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  // ==================== RENDER MAIN FORM ====================
  const renderMainForm = () => (
    <div className="flex-1 flex overflow-hidden">
      <PendudukFormSidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        formData={formData}
        mode={mode}
        errors={errors}
      />
      <div className="flex-1 overflow-y-auto bg-white">
        <form onSubmit={handleSubmit} className="p-6">
          <motion.div
            key={activeMenu}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderFormContent()}
          </motion.div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBackWithConfirm}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  {mode === 'edit' ? 'Simpan Perubahan' : 'Simpan Data'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  // ==================== RENDER FULL PAGE ====================
  const renderFullPage = () => {
    const breadcrumbs = getFormBreadcrumbs(mode, kkInfo, editingPenduduk, step);
    return (
    <div className="flex flex-col min-h-screen">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-100">
          <Button
            variant="ghost"
            onClick={mode === 'penduduk-baru' && step === 'form-data' ? () => setStep('pilih-kk') : handleBackWithConfirm}
            className="text-gray-600 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
          <div className="h-6 w-px bg-gray-200" />
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
                <span className={cn(
                  'truncate',
                  i === breadcrumbs.length - 1
                    ? 'text-gray-900 font-medium'
                    : 'text-gray-500'
                )}>
                  {crumb.label}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>
        {renderHeaderInfo()}
      </div>

      {/* Content */}
      {mode === 'penduduk-baru' && step === 'pilih-kk' ? (
        <PendudukKKSelector
          kkStatus={kkStatus}
          setKkStatus={setKkStatus}
          selectedKK={selectedKK}
          newKKData={newKKData}
          setNewKKData={setNewKKData}
          kkSearchQuery={kkSearchQuery}
          setKkSearchQuery={setKkSearchQuery}
          kkSearchResults={kkSearchResults}
          kkSearching={kkSearching}
          nomorKKCheck={nomorKKCheck}
          wilayahOptions={wilayahOptions}
          onSelectKK={handleSelectKK}
          onProceedToForm={handleProceedToForm}
          onWilayahChange={handleWilayahChange}
          onKkStatusSelect={handleKkStatusSelect}
        />
      ) : (
        renderMainForm()
      )}
    </div>
  );
  };

  // ==================== RENDER MODAL ====================
  const renderModal = () => (
    <Dialog open={true} onOpenChange={(open) => !open && handleBackWithConfirm()}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{getFormTitle(mode, editingPenduduk)}</DialogTitle>
        </DialogHeader>
        <div className="flex h-[calc(95vh-120px)]">
          <PendudukFormSidebar
            activeMenu={activeMenu}
            setActiveMenu={setActiveMenu}
            formData={formData}
            mode={mode}
            errors={errors}
          />
          <div className="flex-1 overflow-y-auto p-6">
            <form onSubmit={handleSubmit}>
              <motion.div
                key={activeMenu}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderFormContent()}
              </motion.div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackWithConfirm}
                  disabled={submitting}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      {mode === 'edit' ? 'Simpan Perubahan' : 'Simpan Data'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // ==================== MAIN RENDER ====================
  return (
    <>
      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
      />

      {/* Status Perkawinan Change Warning (Edit Mode) */}
      <Dialog open={showPerkawinanWarning} onOpenChange={(open) => { if (!open) cancelPerkawinanEdit(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <DialogTitle className="text-base">Perubahan Status Perkawinan</DialogTitle>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 pb-2">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-4">
              <p className="text-sm text-amber-800 leading-relaxed">
                Status perkawinan akan diubah dari <span className="font-semibold">{statusPerkawinanLabels[initialStatusPerkawinan] || initialStatusPerkawinan}</span> menjadi <span className="font-semibold">{statusPerkawinanLabels[pendingPerkawinanValue] || pendingPerkawinanValue}</span>.
              </p>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Jika perubahan ini merupakan <strong>peristiwa yang baru terjadi</strong>, disarankan menggunakan menu <strong>Peristiwa Kependudukan → Perkawinan</strong> agar tercatat secara resmi dengan tanggal peristiwa dan dokumen pendukung.
            </p>
            <p className="text-sm text-gray-500">
              Lanjutkan edit hanya untuk <em>koreksi data yang salah input</em>.
            </p>
          </div>
          <DialogFooter className="px-6 pb-6 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                cancelPerkawinanEdit();
              }}
            >
              Batal
            </Button>
            <Button
              onClick={confirmPerkawinanEdit}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Ya, Lanjutkan Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {layout === 'modal' ? renderModal() : renderFullPage()}
    </>
  );
}
