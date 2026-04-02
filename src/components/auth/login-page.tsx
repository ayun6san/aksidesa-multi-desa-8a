'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  FileText,
  Users,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LoginProps {
  onLoginSuccess: (user: {
    id: string;
    namaLengkap: string;
    username: string;
    email: string;
    role: string;
    desaId?: string;
    desa?: {
      id: string;
      namaDesa: string;
      slug: string;
      kodeDesa: string;
    } | null;
  }) => void;
  onForgotPassword: () => void;
}

export function LoginPage({ onLoginSuccess, onForgotPassword }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<Date | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.locked) {
          setLocked(true);
          setLockedUntil(data.lockedUntil ? new Date(data.lockedUntil) : null);
        }
        if (data.remainingAttempts !== undefined) {
          setRemainingAttempts(data.remainingAttempts);
        }
        setError(data.error || 'Terjadi kesalahan');
        return;
      }

      // Login success
      onLoginSuccess(data.user);
    } catch {
      setError('Terjadi kesalahan pada server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 relative overflow-hidden">
          {/* Subtle Grid Pattern Overlay */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
            aria-hidden="true"
          />

          {/* Animated Background Circles */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
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
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              {/* Logo */}
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
                <svg viewBox="0 0 100 100" className="w-14 h-14" aria-hidden="true">
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
              </div>

              <h1 className="text-4xl font-bold mb-4 tracking-wide">AKSIDESA</h1>
              <div
                className="h-0.5 bg-white/50 mx-auto mb-4"
                style={{ width: '150px' }}
                aria-hidden="true"
              />
              <p className="text-xl text-white/90 mb-4">Aplikasi Kependudukan</p>
              <p className="text-white/80 max-w-md">
                Sistem Informasi Digital Desa untuk pelayanan masyarakat yang lebih baik
              </p>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 grid grid-cols-2 gap-4 text-sm"
            >
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <FileText className="w-5 h-5 mb-2 text-emerald-200" />
                <p className="font-semibold">Surat Online</p>
                <p className="text-white/70 text-xs mt-1">Pembuatan surat keterangan</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <Users className="w-5 h-5 mb-2 text-emerald-200" />
                <p className="font-semibold">Data Penduduk</p>
                <p className="text-white/70 text-xs mt-1">Kelola data kependudukan</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <BarChart3 className="w-5 h-5 mb-2 text-emerald-200" />
                <p className="font-semibold">Statistik</p>
                <p className="text-white/70 text-xs mt-1">Data statistik desa</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10">
                <ShieldCheck className="w-5 h-5 mb-2 text-emerald-200" />
                <p className="font-semibold">Keamanan</p>
                <p className="text-white/70 text-xs mt-1">Data terlindungi</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 bg-slate-50/95 backdrop-blur-sm relative">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md flex-1 flex flex-col justify-center"
          >
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
                <svg viewBox="0 0 100 100" className="w-10 h-10" aria-hidden="true">
                  <path
                    d="M50 15 L85 45 L85 85 L15 85 L15 45 Z"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M50 15 L50 45 M30 45 L30 65 M50 45 L50 75 M70 45 L70 65"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  <circle cx="50" cy="30" r="8" fill="white" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AKSIDESA</h1>
              <p className="text-gray-500 text-sm mt-1">Sistem Informasi Digital Desa</p>
            </div>

            <Card className="shadow-xl shadow-slate-200/50 border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="text-2xl font-bold text-center">Masuk</CardTitle>
                <p className="text-center text-gray-500 text-sm">
                  Masuk ke akun Anda untuk melanjutkan
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      role="alert"
                      aria-live="assertive"
                      className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-destructive text-sm">{error}</p>
                        {locked && lockedUntil && (
                          <p className="text-destructive/80 text-xs mt-1">
                            Coba lagi setelah {lockedUntil.toLocaleTimeString('id-ID')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setError('')}
                        className="text-destructive/50 hover:text-destructive transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-destructive/30 rounded-sm"
                        aria-label="Tutup pesan error"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  <div>
                    <Label htmlFor="identifier" className="text-gray-700">
                      Username / Email
                    </Label>
                    <Input
                      id="identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        setError('');
                      }}
                      placeholder="Masukkan username atau email"
                      className="mt-1.5 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors duration-150"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-gray-700">
                      Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        placeholder="Masukkan password"
                        className="pr-10 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 transition-colors duration-150"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded-sm"
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                      />
                      <Label
                        htmlFor="remember"
                        className="text-sm font-normal cursor-pointer text-gray-600"
                      >
                        Ingat saya
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      Lupa Password?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || locked}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-6 transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Masuk...
                      </>
                    ) : (
                      'Masuk'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer */}
          <p className="mt-6 text-xs text-gray-400" aria-label="Hak cipta">
            © {new Date().getFullYear()} AKSIDESA - Sistem Informasi Digital Desa
          </p>
        </div>
      </div>
    </>
  );
}
