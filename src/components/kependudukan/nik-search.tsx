'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, User, MapPin, Users, Loader2, Check, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PendudukSearchResult {
  id: string;
  nik: string;
  namaLengkap: string;
  displayText: string;
  subtitle: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  golonganDarah: string;
  agama: string;
  suku: string;
  statusPerkawinan: string;
  aktaPerkawinan: string;
  tanggalPerkawinan: string;
  aktaPerceraian: string;
  tanggalPerceraian: string;
  pekerjaan: string;
  pendidikan: string;
  penghasilan: string;
  kewarganegaraan: string;
  negaraAsal: string;
  noPaspor: string;
  noKitasKitap: string;
  tanggalMasuk: string;
  noAktaKelahiran: string;
  statusKTP: string;
  noBPJSKesehatan: string;
  noBPJSTenagakerja: string;
  npwp: string;
  namaAyah: string;
  nikAyah: string;
  namaIbu: string;
  nikIbu: string;
  anakKe: string;
  jumlahSaudara: string;
  kkId: string;
  nomorKK: string;
  hubunganKeluarga: string;
  urutanDalamKK: number;
  alamat: string;
  rt: string;
  rw: string;
  dusun: string;
  dusunId: string;
  rtId: string;
  email: string;
  noHP: string;
  jenisDisabilitas: string;
  keteranganDisabilitas: string;
  penyakitKronis: string;
  status: string;
  pasanganId: string | null;
  foto: string;
  fotoKTP: string;
}

interface NIKSearchProps {
  onSelect: (penduduk: PendudukSearchResult) => void;
  onInputChange?: (value: string) => void;
  value?: string;
  placeholder?: string;
  excludeIds?: string[];
  filterJenisKelamin?: string;
  disabled?: boolean;
  showSelectedInfo?: boolean;
  selectedPenduduk?: PendudukSearchResult | null;
  onClear?: () => void;
  className?: string;
  label?: string;
  showLabel?: boolean;
  required?: boolean;
}

export function NIKSearch({
  onSelect,
  onInputChange,
  value = '',
  placeholder = 'Cari NIK atau Nama...',
  excludeIds = [],
  filterJenisKelamin = '',
  disabled = false,
  showSelectedInfo = true,
  selectedPenduduk,
  onClear,
  className,
  label = 'Cari Data Penduduk',
  showLabel = true,
  required = false,
}: NIKSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PendudukSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Refs for props to avoid dependency issues
  const excludeIdsRef = useRef(excludeIds);
  const filterJKRef = useRef(filterJenisKelamin);
  const searchVersionRef = useRef(0);

  useEffect(() => {
    excludeIdsRef.current = excludeIds;
  }, [excludeIds]);

  useEffect(() => {
    filterJKRef.current = filterJenisKelamin;
  }, [filterJenisKelamin]);

  // --- Search: purely imperative, NO useEffect for query ---
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchQuery.length < 3) {
      setResults([]);
      setShowDropdown(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setShowDropdown(true);
    debounceRef.current = setTimeout(async () => {
      const ver = ++searchVersionRef.current;
      try {
        const params = new URLSearchParams({ q: searchQuery, limit: '10' });
        const ex = excludeIdsRef.current;
        if (ex.length > 0) params.append('exclude', ex.join(','));
        const fjk = filterJKRef.current;
        if (fjk) params.append('jenisKelamin', fjk);
        const res = await fetch(`/api/kependudukan/penduduk/search?${params}`);
        const data = await res.json();
        if (ver === searchVersionRef.current) {
          setResults(data.success ? data.data : []);
          setLoading(false);
        }
      } catch {
        if (ver === searchVersionRef.current) { setResults([]); setLoading(false); }
      }
    }, 300);
  }, []);

  // --- Close dropdown on outside click ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLButtonElement>('[data-result-item]');
    const item = items[highlightedIndex];
    if (item) {
      item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // --- Event handlers ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setHighlightedIndex(-1);
    onInputChange?.(val);
    scheduleSearch(val);
  };

  const handleSelect = (penduduk: PendudukSearchResult) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQuery(penduduk.displayText);
    setShowDropdown(false);
    setLoading(false);
    onSelect(penduduk);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(p => p < results.length - 1 ? p + 1 : p);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(p => p > 0 ? p - 1 : p);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) handleSelect(results[highlightedIndex]);
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
    }
  };

  const handleClear = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchVersionRef.current++;
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setLoading(false);
    onClear?.();
  };

  // --- Dropdown rendered inline (stays inside Dialog DOM tree) ---
  const dropdownContent = showDropdown ? (
    <div
      ref={listRef}
      className="absolute left-0 right-0 top-full mt-1 z-[100] bg-popover border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto"
    >
      {loading ? (
        <div className="p-4 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          <p className="text-sm">Mencari...</p>
        </div>
      ) : results.length > 0 ? (
        <div className="py-1">
          {results.map((penduduk, index) => (
            <button
              key={penduduk.id}
              data-result-item
              type="button"
              onClick={() => handleSelect(penduduk)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                'w-full px-4 py-3 text-left transition-colors cursor-pointer',
                highlightedIndex === index
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                  {penduduk.foto ? (
                    <img src={penduduk.foto} alt={penduduk.namaLengkap} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">{penduduk.namaLengkap}</p>
                    {penduduk.hubunganKeluarga && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">{penduduk.hubunganKeluarga}</Badge>
                    )}
                  </div>
                  <p className="font-mono text-sm text-muted-foreground">{penduduk.nik}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">
                      {penduduk.alamat || 'Alamat tidak tersedia'}
                      {penduduk.dusun && ` - ${penduduk.dusun}`}
                    </span>
                  </div>
                </div>
                {selectedPenduduk?.id === penduduk.id && (
                  <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      ) : query.length >= 3 ? (
        <div className="p-4 text-center text-muted-foreground">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
          <p className="text-sm font-medium">Tidak ditemukan</p>
          <p className="text-xs mt-1">Tidak ada data dengan kata kunci &quot;{query}&quot;</p>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {showLabel && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (query.length >= 3) scheduleSearch(query); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'pl-10 pr-10 h-10',
            showDropdown && 'ring-2 ring-emerald-500 border-emerald-500'
          )}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
        {!loading && query && !disabled && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded-full">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">Ketik minimal 3 karakter (NIK atau Nama)</p>

      {/* Dropdown — rendered inline, stays inside Dialog DOM tree */}
      {dropdownContent}

      {/* Selected Penduduk Info */}
      {showSelectedInfo && selectedPenduduk && !showDropdown && (
        <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center overflow-hidden">
              {selectedPenduduk.foto ? (
                <img src={selectedPenduduk.foto} alt={selectedPenduduk.namaLengkap} className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-emerald-900 dark:text-emerald-100">{selectedPenduduk.namaLengkap}</p>
                {selectedPenduduk.hubunganKeluarga && (
                  <Badge className="bg-emerald-600 text-white text-xs">{selectedPenduduk.hubunganKeluarga}</Badge>
                )}
              </div>
              <p className="font-mono text-sm text-emerald-700 dark:text-emerald-300">NIK: {selectedPenduduk.nik}</p>
              <div className="flex items-center gap-4 mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> KK: {selectedPenduduk.nomorKK || '-'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {selectedPenduduk.dusun || '-'}
                </span>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={handleClear} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Check className="w-3 h-3" /> Data otomatis terisi dari database
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default NIKSearch;
