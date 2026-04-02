'use client';

import React from 'react';
import {
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Circle,
  MinusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { menuItems, fieldToTab, PendudukFormData } from '@/lib/penduduk-form-types';
import { getMenuStatus } from '@/lib/penduduk-form-utils';

interface PendudukFormSidebarProps {
  activeMenu: string;
  setActiveMenu: React.Dispatch<React.SetStateAction<string>>;
  formData: PendudukFormData;
  mode: 'tambah' | 'edit' | 'anggota-kk' | 'penduduk-baru';
  errors: Partial<Record<keyof PendudukFormData, string>>;
}

export function PendudukFormSidebar({
  activeMenu,
  setActiveMenu,
  formData,
  mode,
  errors,
}: PendudukFormSidebarProps) {
  // Hitung progress total
  let totalFilled = 0;
  let totalFields = 0;
  menuItems.forEach(item => {
    const s = getMenuStatus(item.id, formData, mode);
    totalFilled += s.filled;
    totalFields += s.total;
  });
  const progressPct = totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0;

  return (
    <div className="w-56 bg-gray-50 border-r flex-shrink-0 overflow-y-auto flex flex-col">
      {/* Progress bar global */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Kelengkapan</span>
          <span className="text-[10px] font-bold text-emerald-600">{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: progressPct === 100 ? '#10b981' : progressPct >= 50 ? '#f59e0b' : '#ef4444',
            }}
          />
        </div>
      </div>

      <nav className="p-3 space-y-1 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          const { status, filled, total } = getMenuStatus(item.id, formData, mode);
          const hasError = Object.keys(errors).some(k => fieldToTab[k] === item.id);

          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all relative',
                isActive
                  ? 'bg-emerald-600 text-white shadow-md'
                  : hasError
                    ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                    : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className={cn('text-sm font-medium block truncate', isActive && 'text-white')}>{item.label}</span>
                <span className={cn(
                  'text-[10px] block',
                  isActive ? 'text-emerald-100' : 'text-gray-400'
                )}>
                  {filled}/{total} diisi
                </span>
              </div>
              {isActive ? (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              ) : hasError ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              ) : status === 'complete' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-500" />
              ) : status === 'partial' ? (
                <MinusCircle className="w-4 h-4 flex-shrink-0 text-amber-500" />
              ) : (
                <Circle className="w-4 h-4 flex-shrink-0 text-gray-300" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <div className="text-xs text-gray-500 space-y-1.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
            <span>Lengkap</span>
          </div>
          <div className="flex items-center gap-2">
            <MinusCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Sebagian</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-3.5 h-3.5 text-gray-300" />
            <span>Belum diisi</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <span>Ada error</span>
          </div>
        </div>
      </div>
    </div>
  );
}
