'use client';

// AKSIDESA - Main Application Entry Point
// v2.0 - Multi-Desa Platform

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SplashScreen } from '@/components/splash-screen';
import { SetupSuperAdmin } from '@/components/auth/setup-super-admin';
import { ForgotPasswordPage } from '@/components/auth/forgot-password-page';
import { LoginPage } from '@/components/auth/login-page';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { SuperAdminDashboard } from '@/components/super-admin/super-admin-dashboard';
import { ForceChangePassword } from '@/components/auth/force-change-password';
import { Loader2 } from 'lucide-react';

type AppScreen = 'splash' | 'checking' | 'setup' | 'login' | 'forgot-password' | 'dashboard' | 'change-password';

interface CurrentUser {
  id: string;
  namaLengkap: string;
  username: string;
  email: string;
  role: string;
  wajibGantiPassword?: boolean;
  desaId?: string;
  desa?: {
    id: string;
    namaDesa: string;
    slug: string;
    kodeDesa: string;
  } | null;
}

export default function Home() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const initCheckRef = useRef(false);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        if (data.authenticated && data.user) {
          const userData = {
            ...data.user,
            desa: data.user.desa,
          };
          setCurrentUser(userData);
          // If wajib ganti password, redirect to change password screen
          if (data.user.wajibGantiPassword) {
            setScreen('change-password');
          } else {
            setScreen('dashboard');
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };
    checkSession();
  }, []);

  // Handle splash complete - trigger init check
  const handleSplashComplete = async () => {
    // Guard: if session already restored, skip to dashboard
    if (currentUser || screen === 'dashboard') return;

    setScreen('checking');

    // Check initialization status
    if (initCheckRef.current) return;
    initCheckRef.current = true;
    
    try {
      const response = await fetch('/api/auth/check-init');
      const data = await response.json();

      if (data.initialized) {
        setScreen('login');
      } else {
        setScreen('setup');
      }
    } catch (error) {
      console.error('Check init error:', error);
      setScreen('setup');
    }
  };

  const handleSetupComplete = () => {
    setScreen('login');
  };

  const handleLoginSuccess = (user: CurrentUser) => {
    setCurrentUser(user);
    // If wajib ganti password, redirect to change password screen
    if (user.wajibGantiPassword) {
      setScreen('change-password');
    } else {
      setScreen('dashboard');
    }
  };

  const handleChangePasswordSuccess = () => {
    // Update currentUser to clear wajibGantiPassword
    if (currentUser) {
      setCurrentUser({ ...currentUser, wajibGantiPassword: false });
    }
    setScreen('dashboard');
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      setScreen('login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Splash Screen
  if (screen === 'splash') {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Loading Screen
  if (screen === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 text-white animate-spin mx-auto mb-4" />
          <p className="text-white">Memeriksa sistem...</p>
        </motion.div>
      </div>
    );
  }

  // Setup Screen
  if (screen === 'setup') {
    return <SetupSuperAdmin onComplete={handleSetupComplete} />;
  }

  // Login Screen
  if (screen === 'login') {
    return <LoginPage onLoginSuccess={handleLoginSuccess} onForgotPassword={() => setScreen('forgot-password')} />;
  }

  // Forgot Password Screen
  if (screen === 'forgot-password') {
    return <ForgotPasswordPage onBack={() => setScreen('login')} onResetSuccess={() => setScreen('login')} />;
  }

  // Force Change Password Screen
  if (screen === 'change-password' && currentUser) {
    return <ForceChangePassword username={currentUser.username} onSuccess={handleChangePasswordSuccess} />;
  }

  // Dashboard Screen - Route based on role
  if (screen === 'dashboard' && currentUser) {
    // Super Admin gets special dashboard
    if (currentUser.role === 'SUPER_ADMIN') {
      return <SuperAdminDashboard user={currentUser} onLogout={handleLogout} />;
    }
    
    // Other roles use the regular desa dashboard
    return <DashboardLayout user={currentUser} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <p className="text-white text-lg">Memuat...</p>
      </motion.div>
    </div>
  );
}
