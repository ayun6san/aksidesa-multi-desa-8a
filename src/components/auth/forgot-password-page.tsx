'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Eye, EyeOff, ArrowLeft, Shield, CheckCircle, X, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ForgotPasswordProps {
  onBack: () => void;
  onResetSuccess: () => void;
}

type Step = 'identify' | 'question' | 'new-password' | 'success';

export function ForgotPasswordPage({ onBack, onResetSuccess }: ForgotPasswordProps) {
  const [step, setStep] = useState<Step>('identify');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [identifier, setIdentifier] = useState('');

  // Step 2
  const [userId, setUserId] = useState('');
  const [userInfo, setUserInfo] = useState({ namaLengkap: '', username: '', pertanyaan: '' });
  const [jawaban, setJawaban] = useState('');

  // Step 3
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const resetState = () => {
    setError('');
    setIdentifier('');
    setUserId('');
    setUserInfo({ namaLengkap: '', username: '', pertanyaan: '' });
    setJawaban('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setStep('identify');
  };

  // Step 1: Find user & get security question
  const handleCheckUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check', identifier }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setUserId(data.data.userId);
      setUserInfo({ namaLengkap: data.data.namaLengkap, username: data.data.username, pertanyaan: data.data.pertanyaan });
      setStep('question');
    } catch {
      setError('Terjadi kesalahan pada server');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify answer
  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jawaban.trim()) { setError('Jawaban wajib diisi'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', userId, jawaban }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setResetToken(data.data.token);
      setStep('new-password');
    } catch {
      setError('Terjadi kesalahan pada server');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) { setError('Password wajib diisi'); return; }
    if (newPassword.length < 6) { setError('Password minimal 6 karakter'); return; }
    if (newPassword !== confirmPassword) { setError('Konfirmasi password tidak cocok'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', token: resetToken, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setStep('success');
    } catch {
      setError('Terjadi kesalahan pada server');
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (step === 'success') {
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Berhasil Diubah!</h2>
          <p className="text-gray-600 mb-6">Silakan login dengan password baru Anda.</p>
          <Button onClick={onResetSuccess} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
            Masuk ke Akun
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 relative overflow-hidden p-4">
      {/* Background */}
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
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl">
            <KeyRound className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lupa Password</h1>
          <p className="text-white/80 text-sm mt-1">Reset password untuk akun Super Admin</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-border/50">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { key: 'identify', num: '1' },
              { key: 'question', num: '2' },
              { key: 'new-password', num: '3' },
            ].map((s, i) => {
              const stepOrder = ['identify', 'question', 'new-password'];
              const currentIdx = stepOrder.indexOf(step);
              const thisIdx = stepOrder.indexOf(s.key);
              const isActive = thisIdx <= currentIdx;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isActive ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                    {s.num}
                  </div>
                  {i < 2 && <div className={`w-8 h-0.5 ${isActive ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
                </div>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start justify-between gap-2"
            >
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Identify */}
            {step === 'identify' && (
              <motion.form
                key="identify"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleCheckUser}
                className="space-y-4"
              >
                <p className="text-sm text-gray-600 text-center mb-2">Masukkan username atau email akun Super Admin Anda.</p>
                <div>
                  <Label htmlFor="identifier">Username / Email</Label>
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                    placeholder="Masukkan username atau email"
                    className="mt-1"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memeriksa...</> : 'Lanjutkan'}
                </Button>
              </motion.form>
            )}

            {/* Step 2: Security Question */}
            {step === 'question' && (
              <motion.form
                key="question"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleVerifyAnswer}
                className="space-y-4"
              >
                <div className="text-center mb-2">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-gray-700">{userInfo.pertanyaan}</span>
                  </div>
                  <p className="text-xs text-gray-400">Untuk akun: <strong>{userInfo.namaLengkap}</strong> ({userInfo.username})</p>
                </div>
                <div>
                  <Label htmlFor="jawaban">Jawaban</Label>
                  <Input
                    id="jawaban"
                    value={jawaban}
                    onChange={(e) => { setJawaban(e.target.value); setError(''); }}
                    placeholder="Masukkan jawaban Anda"
                    className="mt-1"
                    autoFocus
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Memverifikasi...</> : 'Verifikasi'}
                </Button>
              </motion.form>
            )}

            {/* Step 3: New Password */}
            {step === 'new-password' && (
              <motion.form
                key="new-password"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleResetPassword}
                className="space-y-4"
              >
                <p className="text-sm text-gray-600 text-center mb-2">Buat password baru untuk akun Anda.</p>
                <div>
                  <Label htmlFor="newPassword">Password Baru</Label>
                  <div className="relative mt-1">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                      placeholder="Min. 6 karakter"
                      className="pr-10"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Ulangi password baru"
                    className="mt-1"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menyimpan...</> : 'Ubah Password'}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Back button */}
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={step === 'identify' ? onBack : resetState}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {step === 'identify' ? 'Kembali ke Login' : 'Mulai Ulang'}
            </button>
          </div>
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          © {new Date().getFullYear()} AKSIDESA - Sistem Informasi Digital Desa
        </p>
      </motion.div>
    </div>
  );
}
