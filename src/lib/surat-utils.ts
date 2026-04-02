/**
 * Surat Utility Functions
 * 
 * Helper functions for:
 * - Generate nomor surat format (with Roman numeral month, padding, etc.)
 * - Generate nomor register format
 * - Roman numeral converter
 * - Nomor surat validation
 */

/**
 * Convert integer to Roman numeral
 * Supports numbers from 1 to 3999
 */
export function toRoman(num: number): string {
  if (num < 1 || num > 3999) {
    return String(num);
  }

  const romanNumerals: [number, string][] = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let result = '';
  let remaining = num;

  for (const [value, numeral] of romanNumerals) {
    while (remaining >= value) {
      result += numeral;
      remaining -= value;
    }
  }

  return result;
}

/**
 * Get month value for nomor surat
 * Returns Roman numeral, numeric, or empty string based on format
 */
export function formatBulanForNomor(
  bulan: number,
  format: 'ROMAWI' | 'ANGKA' | 'TANPA'
): string {
  if (format === 'TANPA') {
    return '';
  }
  if (format === 'ROMAWI') {
    return toRoman(bulan);
  }
  // ANGKA format - pad to 2 digits
  return String(bulan).padStart(2, '0');
}

/**
 * Pad a number with leading zeros
 */
export function padNumber(num: number, digits: number): string {
  return String(num).padStart(digits, '0');
}

/**
 * Generate formatted nomor surat
 * 
 * @param nomor - The sequential number
 * @param kodeDesaSurat - Desa code for surat (e.g., "Ds.SukaMaju")
 * @param tahun - Year (e.g., 2025)
 * @param bulan - Month (1-12)
 * @param formatNomorSurat - Format template (e.g., "{nomor}/{kodeDesa}/{bulan}/{tahun}")
 * @param digitPadding - Number of digits for padding the nomor (default: 3)
 * @param formatBulan - Month format: ROMAWI, ANGKA, or TANPA
 */
export function generateNomorSurat(
  nomor: number,
  kodeDesaSurat: string,
  tahun: number,
  bulan: number,
  formatNomorSurat: string,
  digitPadding: number,
  formatBulan: 'ROMAWI' | 'ANGKA' | 'TANPA'
): string {
  const bulanStr = formatBulanForNomor(bulan, formatBulan);
  const nomorStr = padNumber(nomor, digitPadding);

  let result = formatNomorSurat;
  result = result.replace('{nomor}', nomorStr);
  result = result.replace('{kodeDesa}', kodeDesaSurat);
  result = result.replace('{bulan}', bulanStr);
  result = result.replace('{tahun}', String(tahun));

  // Clean up double slashes or trailing/leading slashes from empty bulan
  result = result.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');

  return result;
}

/**
 * Generate formatted nomor register
 * 
 * @param nomor - The sequential register number
 * @param kodeDesaSurat - Desa code for surat
 * @param tahun - Year
 * @param formatNomorRegister - Format template (e.g., "{nomor}/{kodeDesa}")
 * @param digitPaddingReg - Number of digits for padding (default: 4)
 */
export function generateNomorRegister(
  nomor: number,
  kodeDesaSurat: string,
  tahun: number,
  formatNomorRegister: string,
  digitPaddingReg: number
): string {
  const nomorStr = padNumber(nomor, digitPaddingReg);

  let result = formatNomorRegister;
  result = result.replace('{nomor}', nomorStr);
  result = result.replace('{kodeDesa}', kodeDesaSurat);
  result = result.replace('{tahun}', String(tahun));

  return result;
}

/**
 * Validate a nomor surat format string
 * Checks that it contains at least {nomor} placeholder
 */
export function isValidNomorFormat(format: string): boolean {
  if (!format || typeof format !== 'string') return false;
  return format.includes('{nomor}');
}

/**
 * Parse nomor surat to extract components (for display/search)
 */
export function parseNomorSurat(nomorSurat: string): {
  nomor: string | null;
  kodeDesa: string | null;
  bulan: string | null;
  tahun: string | null;
} {
  const parts = nomorSurat.split('/');
  return {
    nomor: parts[0] || null,
    kodeDesa: parts[1] || null,
    bulan: parts[2] || null,
    tahun: parts[3] || null,
  };
}

/**
 * Get status label in Bahasa Indonesia
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    MENUNGGU_PROSES: 'Menunggu Diproses',
    DALAM_PROSES: 'Dalam Proses',
    MENUNGGU_APPROVAL: 'Menunggu Approval',
    DITOLAK_OPERATOR: 'Ditolak Operator',
    DITOLAK_KADES: 'Ditolak Kades',
    DISETUJUI: 'Disetujui',
    DICETAK: 'Dicetak',
    DIBATALKAN: 'Dibatalkan',
    DIARSIPKAN: 'Diarsipkan',
  };
  return labels[status] || status;
}

/**
 * Get status color class for badges
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    MENUNGGU_PROSES: 'bg-blue-100 text-blue-800',
    DALAM_PROSES: 'bg-yellow-100 text-yellow-800',
    MENUNGGU_APPROVAL: 'bg-indigo-100 text-indigo-800',
    DITOLAK_OPERATOR: 'bg-red-100 text-red-800',
    DITOLAK_KADES: 'bg-red-200 text-red-900',
    DISETUJUI: 'bg-green-100 text-green-800',
    DICETAK: 'bg-purple-100 text-purple-800',
    DIBATALKAN: 'bg-slate-100 text-slate-800',
    DIARSIPKAN: 'bg-emerald-100 text-emerald-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get kategori surat label
 */
export function getKategoriLabel(kategori: string): string {
  const labels: Record<string, string> = {
    KEPENDUDUKAN: 'Kependudukan',
    PENGANTAR: 'Surat Pengantar',
    KETERANGAN: 'Surat Keterangan',
    PERNYATAAN: 'Surat Pernyataan',
    TANAH_PROPERTI: 'Tanah & Properti',
    KEUANGAN: 'Keuangan',
    LEMBAGA: 'Lembaga',
  };
  return labels[kategori] || kategori;
}

/**
 * Get tingkat approval label
 */
export function getTingkatApprovalLabel(tingkat: string): string {
  const labels: Record<string, string> = {
    LANGSUNG_PROSES: 'Langsung Diproses',
    PERLU_APPROVAL: 'Perlu Approval Kades',
  };
  return labels[tingkat] || tingkat;
}

/**
 * Get SuratLogAksi label
 */
export function getLogAksiLabel(aksi: string): string {
  const labels: Record<string, string> = {
    AJUKAN: 'Surat Diajukan',
    PROSES: 'Surat Diproses',
    APPROVE: 'Surat Disetujui',
    REJECT: 'Surat Ditolak',
    CETAK: 'Surat Dicetak',
    BATAL: 'Surat Dibatalkan',
    ARSIP: 'Surat Diarsipkan',
    UPDATE: 'Surat Diperbarui',
  };
  return labels[aksi] || aksi;
}

/**
 * Validate surat status transition
 * Returns true if the transition is valid
 */
export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const transitions: Record<string, string[]> = {
    DRAFT: ['MENUNGGU_PROSES', 'DIBATALKAN'],
    MENUNGGU_PROSES: ['DALAM_PROSES', 'MENUNGGU_APPROVAL', 'DIBATALKAN', 'DITOLAK_OPERATOR'],
    DALAM_PROSES: ['DICETAK', 'DIBATALKAN'],
    MENUNGGU_APPROVAL: ['DISETUJUI', 'DITOLAK_KADES', 'DIBATALKAN'],
    DITOLAK_OPERATOR: ['MENUNGGU_PROSES', 'DALAM_PROSES', 'DIBATALKAN'],
    DITOLAK_KADES: ['MENUNGGU_PROSES', 'DALAM_PROSES', 'DIBATALKAN'],
    DISETUJUI: ['DICETAK', 'DIARSIPKAN'],
    DICETAK: ['DIARSIPKAN'],
    DIARSIPKAN: [],
    DIBATALKAN: [],
  };

  const allowedNext = transitions[currentStatus];
  if (!allowedNext) return false;
  return allowedNext.includes(newStatus);
}

/**
 * Get next valid statuses for a given current status
 */
export function getNextValidStatuses(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    DRAFT: ['MENUNGGU_PROSES', 'DIBATALKAN'],
    MENUNGGU_PROSES: ['DALAM_PROSES', 'MENUNGGU_APPROVAL', 'DIBATALKAN'],
    DALAM_PROSES: ['DICETAK', 'DIBATALKAN'],
    MENUNGGU_APPROVAL: ['DISETUJUI', 'DITOLAK_KADES', 'DIBATALKAN'],
    DITOLAK_OPERATOR: ['MENUNGGU_PROSES', 'DALAM_PROSES', 'DIBATALKAN'],
    DITOLAK_KADES: ['MENUNGGU_PROSES', 'DALAM_PROSES', 'DIBATALKAN'],
    DISETUJUI: ['DICETAK', 'DIARSIPKAN'],
    DICETAK: ['DIARSIPKAN'],
    DIARSIPKAN: [],
    DIBATALKAN: [],
  };

  return transitions[currentStatus] || [];
}
