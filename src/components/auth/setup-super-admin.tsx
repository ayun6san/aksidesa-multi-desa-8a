'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff, Shield, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const PERTANYAAN_OPTIONS = [
  'Apa nama hewan peliharaan pertama Anda?',
  'Di kota mana Anda dilahirkan?',
  'Apa nama sekolah dasar Anda?',
  'Apa nama film favorit Anda?',
  'Apa makanan favorit Anda?',
];

interface SetupForm {
  namaLengkap: string;
  username: string;
  email: string;
  noHp: string;
  password: string;
  konfirmasiPassword: string;
  pertanyaanKeamanan: string;
  jawabanKeamanan: string;
}

interface SetupSuperAdminProps {
  onComplete: () => void;
}

export function SetupSuperAdmin({ onComplete }: SetupSuperAdminProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState<SetupForm>({
    namaLengkap: '',
    username: '',
    email: '',
    noHp: '',
    password: '',
    konfirmasiPassword: '',
    pertanyaanKeamanan: '',
    jawabanKeamanan: '',
  });

  const updateForm = (field: keyof SetupForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!form.namaLengkap.trim()) return 'Nama lengkap wajib diisi';
    if (!form.username.trim()) return 'Username wajib diisi';
    if (form.username.length < 3) return 'Username minimal 3 karakter';
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return 'Username hanya boleh huruf, angka, dan underscore';
    if (!form.email.trim()) return 'Email wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Format email tidak valid';
    if (!form.noHp.trim()) return 'Nomor HP wajib diisi';
    if (!form.password) return 'Password wajib diisi';
    if (form.password.length < 6) return 'Password minimal 6 karakter';
    if (form.password !== form.konfirmasiPassword) return 'Konfirmasi password tidak cocok';
    if (!form.pertanyaanKeamanan.trim()) return 'Pertanyaan keamanan wajib diisi';
    if (!form.jawabanKeamanan.trim()) return 'Jawaban keamanan wajib diisi';
    return null;
  };

  const handleSubmit = async () => {
    const err = validateForm();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Terjadi kesalahan');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch {
      setError('Terjadi kesalahan pada server');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </motion.div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Setup Berhasil!</h2>
          <p className="text-gray-600 mb-4">Silakan login untuk melanjutkan</p>
          <div className="flex items-center justify-center gap-2 text-emerald-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Mengalihkan ke halaman login...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 relative overflow-hidden p-4">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.08 }}
          transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
          className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.05 }}
          transition={{ duration: 1.5, delay: 0.4, ease: 'easeOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl"
          >
            <svg viewBox="0 0 100 100" className="w-12 h-12">
              <path
                d="M50 15 L85 45 L85 85 L15 85 L15 45 Z"
                fill="none"
                stroke="#059669"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M50 15 L50 45 M30 45 L30 65 M50 45 L50 75 M70 45 L70 65"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="50" cy="30" r="8" fill="#059669" />
            </svg>
          </motion.div>
          <h1 className="text-3xl font-bold text-white tracking-wide">AKSIDESA</h1>
          <div className="h-0.5 bg-white/50 mx-auto my-3" style={{ width: '120px' }} />
          <p className="text-white/90 text-sm">Buat Akun Super Admin</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-border/50">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Pengaturan Awal</h2>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start justify-between gap-2"
            >
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0 mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="namaLengkap">Nama Lengkap *</Label>
              <Input
                id="namaLengkap"
                value={form.namaLengkap}
                onChange={(e) => updateForm('namaLengkap', e.target.value)}
                placeholder="Masukkan nama lengkap"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => updateForm('username', e.target.value)}
                  placeholder="Username"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm('email', e.target.value)}
                  placeholder="Email"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="noHp">No. HP *</Label>
              <Input
                id="noHp"
                value={form.noHp}
                onChange={(e) => updateForm('noHp', e.target.value)}
                placeholder="Contoh: 08123456789"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Password *</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => updateForm('password', e.target.value)}
                    placeholder="Min. 6 karakter"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="konfirmasiPassword">Konfirmasi Password *</Label>
                <Input
                  id="konfirmasiPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={form.konfirmasiPassword}
                  onChange={(e) => updateForm('konfirmasiPassword', e.target.value)}
                  placeholder="Ulangi password"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pertanyaanKeamanan">Pertanyaan Keamanan *</Label>
              <p className="text-[11px] text-gray-400 mt-0.5 mb-1.5">Digunakan jika Anda lupa password</p>
              <select
                id="pertanyaanKeamanan"
                value={form.pertanyaanKeamanan}
                onChange={(e) => updateForm('pertanyaanKeamanan', e.target.value)}
                className="w-full mt-0.5 h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
              >
                <option value="">-- Pilih pertanyaan --</option>
                {PERTANYAAN_OPTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="jawabanKeamanan">Jawaban Keamanan *</Label>
              <Input
                id="jawabanKeamanan"
                value={form.jawabanKeamanan}
                onChange={(e) => updateForm('jawabanKeamanan', e.target.value)}
                placeholder="Jawaban Anda"
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Buat Akun Super Admin'
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/60 text-xs mt-6">
          © {new Date().getFullYear()} AKSIDESA - Sistem Informasi Digital Desa
        </p>
      </motion.div>
    </div>
  );
}
