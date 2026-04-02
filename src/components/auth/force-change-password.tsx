'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Eye, EyeOff, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ForceChangePasswordProps {
  username: string;
  onSuccess: () => void;
}

export function ForceChangePassword({ username, onSuccess }: ForceChangePasswordProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!oldPassword) {
      setError('Password lama wajib diisi');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password baru minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    if (newPassword === oldPassword) {
      setError('Password baru harus berbeda dari password lama');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Gagal mengubah password');
        return;
      }

      onSuccess();
    } catch {
      setError('Terjadi kesalahan pada server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring' }}
            className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </motion.div>
          <h1 className="text-xl font-bold text-gray-900">Ganti Password</h1>
          <p className="text-sm text-gray-500 mt-1">
            Password Anda telah direset oleh administrator.
            <br />
            Anda wajib mengganti password sebelum melanjutkan.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
            <KeyRound className="w-3.5 h-3.5" />
            @{username}
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Old Password */}
          <div className="space-y-1.5">
            <Label htmlFor="oldPassword">Password Lama *</Label>
            <div className="relative">
              <Input
                id="oldPassword"
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan password lama"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">Password Baru *</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Konfirmasi Password Baru *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-6"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Ganti Password
              </>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Jika Anda tidak ingat password lama, hubungi Super Admin.
        </p>
      </motion.div>
    </div>
  );
}
