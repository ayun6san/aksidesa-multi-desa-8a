'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Save,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Upload,
  MapPin,
  Target,
  BookOpen,
  Eye,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DesaData {
  id: string;
  namaDesa: string;
  kodeDesa: string;
  kodePos: string | null;
  kecamatan: string;
  kabupaten: string;
  provinsi: string;
  negara: string;
  alamatKantor: string | null;
  telepon: string | null;
  email: string | null;
  website: string | null;
  logo: string | null;
  logoKabupaten: string | null;
  logoProvinsi: string | null;
  visi: string | null;
  misi: string | null;
  luasWilayah: string | null;
  ketinggian: string | null;
  curahHujan: string | null;
  batasUtara: string | null;
  batasSelatan: string | null;
  batasTimur: string | null;
  batasBarat: string | null;
  tanggalBerdiri: string | null;
  hariJadi: string | null;
  sejarahSingkat: string | null;
}

const initialData: DesaData = {
  id: '',
  namaDesa: '',
  kodeDesa: '',
  kodePos: '',
  kecamatan: '',
  kabupaten: '',
  provinsi: '',
  negara: 'Indonesia',
  alamatKantor: '',
  telepon: '',
  email: '',
  website: '',
  logo: null,
  logoKabupaten: null,
  logoProvinsi: null,
  visi: '',
  misi: '',
  luasWilayah: '',
  ketinggian: '',
  curahHujan: '',
  batasUtara: '',
  batasSelatan: '',
  batasTimur: '',
  batasBarat: '',
  tanggalBerdiri: null,
  hariJadi: '',
  sejarahSingkat: '',
};

export function PengaturanDesa() {
  const [data, setData] = useState<DesaData>(initialData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('identitas');
  const [misiList, setMisiList] = useState<string[]>([]);
  const [newMisi, setNewMisi] = useState('');
  const fileInputRefs = useRef<{
    logo: HTMLInputElement | null;
    logoKabupaten: HTMLInputElement | null;
    logoProvinsi: HTMLInputElement | null;
  }>({
    logo: null,
    logoKabupaten: null,
    logoProvinsi: null,
  });
  const [previewModal, setPreviewModal] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchDesa();
  }, []);

  const fetchDesa = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/desa');
      const result = await response.json();
      
      if (result.success && result.data) {
        setData(result.data);
        // Parse misi if it's a JSON string
        if (result.data.misi) {
          try {
            const parsed = JSON.parse(result.data.misi);
            setMisiList(Array.isArray(parsed) ? parsed : []);
          } catch {
            setMisiList([]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching desa:', error);
      toast.error('Gagal memuat data desa');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const response = await fetch('/api/desa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          misi: misiList.length > 0 ? JSON.stringify(misiList) : null,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Data desa berhasil disimpan');
        fetchDesa();
      } else {
        toast.error(result.error || 'Gagal menyimpan data');
      }
    } catch (error) {
      console.error('Error saving desa:', error);
      toast.error('Gagal menyimpan data desa');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof DesaData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (type: 'logo' | 'logoKabupaten' | 'logoProvinsi', file: File) => {
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      toast.error('Format file harus JPG, PNG, GIF, atau WebP');
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // Upload via API
        const response = await fetch('/api/desa/logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, image: base64 }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          toast.success('Logo berhasil diunggah');
          setData(prev => ({ ...prev, [type]: base64 }));
        } else {
          toast.error(result.error || 'Gagal mengunggah logo');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Gagal mengunggah logo');
    }
  };

  const handleDeleteImage = async (type: 'logo' | 'logoKabupaten' | 'logoProvinsi') => {
    try {
      const response = await fetch(`/api/desa/logo?type=${type}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Logo berhasil dihapus');
        setData(prev => ({ ...prev, [type]: null }));
      } else {
        toast.error(result.error || 'Gagal menghapus logo');
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      toast.error('Gagal menghapus logo');
    }
  };

  const addMisi = () => {
    if (newMisi.trim()) {
      setMisiList(prev => [...prev, newMisi.trim()]);
      setNewMisi('');
    }
  };

  const removeMisi = (index: number) => {
    setMisiList(prev => prev.filter((_, i) => i !== index));
  };

  const tabs = [
    { id: 'identitas', label: 'Identitas Desa', icon: Building2 },
    { id: 'logo', label: 'Logo & Lambang', icon: ImageIcon },
    { id: 'geografis', label: 'Data Geografis', icon: MapPin },
    { id: 'visi-misi', label: 'Visi & Misi', icon: Target },
    { id: 'sejarah', label: 'Sejarah', icon: BookOpen },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan Desa</h1>
          <p className="text-gray-500 mt-1">Kelola informasi dan profil desa Anda</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Simpan Perubahan
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-gray-200 p-1 h-auto flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700"
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab 1: Identitas Desa */}
        <TabsContent value="identitas">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  Identitas Desa
                </CardTitle>
                <CardDescription>
                  Informasi dasar dan identitas desa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="namaDesa">Nama Desa *</Label>
                    <Input
                      id="namaDesa"
                      value={data.namaDesa}
                      onChange={(e) => handleInputChange('namaDesa', e.target.value)}
                      placeholder="Masukkan nama desa"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kodeDesa">Kode Desa *</Label>
                    <Input
                      id="kodeDesa"
                      value={data.kodeDesa}
                      onChange={(e) => handleInputChange('kodeDesa', e.target.value)}
                      placeholder="Contoh: 3201010001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kodePos">Kode Pos</Label>
                    <Input
                      id="kodePos"
                      value={data.kodePos || ''}
                      onChange={(e) => handleInputChange('kodePos', e.target.value)}
                      placeholder="Contoh: 12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="negara">Negara</Label>
                    <Input
                      id="negara"
                      value={data.negara}
                      onChange={(e) => handleInputChange('negara', e.target.value)}
                      placeholder="Indonesia"
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Wilayah Administratif</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="kecamatan">Kecamatan *</Label>
                      <Input
                        id="kecamatan"
                        value={data.kecamatan}
                        onChange={(e) => handleInputChange('kecamatan', e.target.value)}
                        placeholder="Nama kecamatan"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="kabupaten">Kabupaten/Kota *</Label>
                      <Input
                        id="kabupaten"
                        value={data.kabupaten}
                        onChange={(e) => handleInputChange('kabupaten', e.target.value)}
                        placeholder="Nama kabupaten/kota"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provinsi">Provinsi *</Label>
                      <Input
                        id="provinsi"
                        value={data.provinsi}
                        onChange={(e) => handleInputChange('provinsi', e.target.value)}
                        placeholder="Nama provinsi"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Kontak</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="alamatKantor">Alamat Kantor</Label>
                      <Textarea
                        id="alamatKantor"
                        value={data.alamatKantor || ''}
                        onChange={(e) => handleInputChange('alamatKantor', e.target.value)}
                        placeholder="Alamat lengkap kantor desa"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telepon">Telepon</Label>
                      <Input
                        id="telepon"
                        value={data.telepon || ''}
                        onChange={(e) => handleInputChange('telepon', e.target.value)}
                        placeholder="Nomor telepon kantor"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={data.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="email@desa.go.id"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={data.website || ''}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://desa.go.id"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Tab 2: Logo & Lambang */}
        <TabsContent value="logo">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-emerald-600" />
                  Logo & Lambang
                </CardTitle>
                <CardDescription>
                  Unggah logo desa, kabupaten, dan provinsi untuk dokumen resmi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Logo Provinsi */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Logo Provinsi</Label>
                    <div className="relative aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden group">
                      {data.logoProvinsi ? (
                        <>
                          <img
                            src={data.logoProvinsi}
                            alt="Logo Provinsi"
                            className="w-full h-full object-contain p-4"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteImage('logoProvinsi')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">Klik untuk upload</span>
                          <span className="text-xs text-gray-400 mt-1">Maks 2MB</span>
                          <input
                            ref={(el) => { fileInputRefs.current.logoProvinsi = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload('logoProvinsi', file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Logo Kabupaten */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Logo Kabupaten</Label>
                    <div className="relative aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden group">
                      {data.logoKabupaten ? (
                        <>
                          <img
                            src={data.logoKabupaten}
                            alt="Logo Kabupaten"
                            className="w-full h-full object-contain p-4"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteImage('logoKabupaten')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">Klik untuk upload</span>
                          <span className="text-xs text-gray-400 mt-1">Maks 2MB</span>
                          <input
                            ref={(el) => { fileInputRefs.current.logoKabupaten = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload('logoKabupaten', file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Logo Desa */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Logo Desa</Label>
                    <div className="relative aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 overflow-hidden group">
                      {data.logo ? (
                        <>
                          <img
                            src={data.logo}
                            alt="Logo Desa"
                            className="w-full h-full object-contain p-4"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteImage('logo')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500">Klik untuk upload</span>
                          <span className="text-xs text-gray-400 mt-1">Maks 2MB</span>
                          <input
                            ref={(el) => { fileInputRefs.current.logo = el; }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload('logo', file);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preview Header Surat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-emerald-600" />
                  Preview Header Surat
                </CardTitle>
                <CardDescription>
                  Tampilan header surat/laporan dengan logo yang sudah diunggah
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center border-b-4 border-double border-gray-900 pb-4">
                    <div className="w-[72px] h-[72px] flex-shrink-0">
                      {data.logoKabupaten ? (
                        <img src={data.logoKabupaten} alt="Logo Kabupaten" className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-xs text-gray-400">Logo</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-center">
                      <p className="text-sm font-medium text-gray-700 uppercase tracking-wide">PEMERINTAH KABUPATEN {data.kabupaten?.toUpperCase() || 'CIANJUR'}</p>
                      <p className="text-sm font-medium text-gray-700 uppercase tracking-wide">KECAMATAN {data.kecamatan?.toUpperCase() || 'BOJONGPICUNG'}</p>
                      <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide mt-1">DESA {data.namaDesa?.toUpperCase() || 'BOJONGPICUNG'}</h3>
                      <p className="text-xs text-gray-600 mt-1">{data.alamatKantor || 'Alamat Kantor Desa'}</p>
                      {(data.telepon || data.email || data.website) && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          {[data.telepon, data.email, data.website].filter(Boolean).join(' | ')}
                        </p>
                      )}
                    </div>
                    <div className="w-[72px] h-[72px] flex-shrink-0 opacity-0">
                      {/* Spacer untuk menjaga text tetap center */}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Tab 3: Data Geografis */}
        <TabsContent value="geografis">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-600" />
                  Data Geografis
                </CardTitle>
                <CardDescription>
                  Informasi geografis dan batas wilayah desa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="luasWilayah">Luas Wilayah</Label>
                    <Input
                      id="luasWilayah"
                      value={data.luasWilayah || ''}
                      onChange={(e) => handleInputChange('luasWilayah', e.target.value)}
                      placeholder="Contoh: 450 Ha"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ketinggian">Ketinggian (mdpl)</Label>
                    <Input
                      id="ketinggian"
                      value={data.ketinggian || ''}
                      onChange={(e) => handleInputChange('ketinggian', e.target.value)}
                      placeholder="Contoh: 250 m dpl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="curahHujan">Curah Hujan (mm/tahun)</Label>
                    <Input
                      id="curahHujan"
                      value={data.curahHujan || ''}
                      onChange={(e) => handleInputChange('curahHujan', e.target.value)}
                      placeholder="Contoh: 2.500 mm/tahun"
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Batas Wilayah</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="batasUtara">Batas Utara</Label>
                      <Input
                        id="batasUtara"
                        value={data.batasUtara || ''}
                        onChange={(e) => handleInputChange('batasUtara', e.target.value)}
                        placeholder="Desa/Kecamatan di sebelah utara"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batasSelatan">Batas Selatan</Label>
                      <Input
                        id="batasSelatan"
                        value={data.batasSelatan || ''}
                        onChange={(e) => handleInputChange('batasSelatan', e.target.value)}
                        placeholder="Desa/Kecamatan di sebelah selatan"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batasTimur">Batas Timur</Label>
                      <Input
                        id="batasTimur"
                        value={data.batasTimur || ''}
                        onChange={(e) => handleInputChange('batasTimur', e.target.value)}
                        placeholder="Desa/Kecamatan di sebelah timur"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="batasBarat">Batas Barat</Label>
                      <Input
                        id="batasBarat"
                        value={data.batasBarat || ''}
                        onChange={(e) => handleInputChange('batasBarat', e.target.value)}
                        placeholder="Desa/Kecamatan di sebelah barat"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Tab 4: Visi & Misi */}
        <TabsContent value="visi-misi">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  Visi & Misi
                </CardTitle>
                <CardDescription>
                  Visi dan misi desa untuk pembangunan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="visi">Visi</Label>
                  <Textarea
                    id="visi"
                    value={data.visi || ''}
                    onChange={(e) => handleInputChange('visi', e.target.value)}
                    placeholder="Visi desa untuk masa depan"
                    rows={3}
                  />
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-4">Misi</h4>
                  
                  {/* Add new misi */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      value={newMisi}
                      onChange={(e) => setNewMisi(e.target.value)}
                      placeholder="Tulis misi baru..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addMisi();
                        }
                      }}
                    />
                    <Button onClick={addMisi} className="bg-emerald-600 hover:bg-emerald-700">
                      Tambah
                    </Button>
                  </div>

                  {/* Misi list */}
                  <div className="space-y-2">
                    {misiList.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">Belum ada misi. Tambahkan misi di atas.</p>
                    ) : (
                      <AnimatePresence>
                        {misiList.map((misi, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg group"
                          >
                            <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </span>
                            <p className="flex-1 text-gray-700">{misi}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeMisi(index)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Tab 5: Sejarah */}
        <TabsContent value="sejarah">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-600" />
                  Sejarah Desa
                </CardTitle>
                <CardDescription>
                  Sejarah dan informasi pendirian desa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tanggalBerdiri">Tanggal Berdiri</Label>
                    <Input
                      id="tanggalBerdiri"
                      type="date"
                      value={data.tanggalBerdiri ? new Date(data.tanggalBerdiri).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleInputChange('tanggalBerdiri', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hariJadi">Hari Jadi</Label>
                    <Input
                      id="hariJadi"
                      value={data.hariJadi || ''}
                      onChange={(e) => handleInputChange('hariJadi', e.target.value)}
                      placeholder="Contoh: 17 Agustus"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sejarahSingkat">Sejarah Singkat</Label>
                  <Textarea
                    id="sejarahSingkat"
                    value={data.sejarahSingkat || ''}
                    onChange={(e) => handleInputChange('sejarahSingkat', e.target.value)}
                    placeholder="Tuliskan sejarah singkat desa..."
                    rows={10}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
