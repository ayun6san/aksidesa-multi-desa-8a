'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, User, LogOut, ChevronDown, Settings, X, Check, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  judul: string;
  pesan: string;
  tipe: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  isRead: boolean;
  createdAt: string;
}

interface HeaderProps {
  userName: string;
  userRole: string;
  notifications: Notification[];
  onLogout: () => void;
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
}

export function Header({
  userName,
  userRole,
  notifications,
  onLogout,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationColor = (tipe: string) => {
    switch (tipe) {
      case 'SUCCESS': return 'bg-green-500';
      case 'WARNING': return 'bg-amber-500';
      case 'ERROR': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  };

  return (
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-md shadow-sm border-b border-border">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left - Date & Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-lg">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary font-mono">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Center - Search */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari..."
              className="pl-9 bg-muted border-border focus:bg-background"
            />
          </div>
        </div>

        {/* Right - Notifications & User */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-80 bg-card rounded-xl shadow-lg border border-border overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="font-semibold text-foreground">Notifikasi</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-xs text-primary hover:text-primary/80"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Tidak ada notifikasi
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          className={cn(
                            'p-4 border-b border-border hover:bg-accent/50 transition-colors cursor-pointer',
                            !notif.isRead && 'bg-primary/5'
                          )}
                          onClick={() => onMarkNotificationRead(notif.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn('w-2 h-2 rounded-full mt-2 flex-shrink-0', getNotificationColor(notif.tipe))} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm">{notif.judul}</p>
                              <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{notif.pesan}</p>
                              <p className="text-muted-foreground text-xs mt-1">{formatTime(notif.createdAt)}</p>
                            </div>
                            {!notif.isRead && (
                              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 5 && (
                    <div className="p-3 border-t border-border text-center">
                      <button className="text-sm text-primary hover:text-primary/80 font-medium">
                        Lihat semua notifikasi
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground">{userRole.replace('_', ' ')}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-56 bg-card rounded-xl shadow-lg border border-border overflow-hidden"
                >
                  <div className="p-3 border-b border-border">
                    <p className="font-medium text-foreground">{userName}</p>
                    <p className="text-xs text-muted-foreground">{userRole.replace('_', ' ')}</p>
                  </div>
                  
                  <div className="p-2">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors">
                      <User className="w-4 h-4" />
                      Profil Saya
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                      Pengaturan
                    </button>
                  </div>
                  
                  <div className="p-2 border-t border-border">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
