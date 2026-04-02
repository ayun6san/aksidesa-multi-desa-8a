'use client';

import {
  FileEdit,
  Send,
  CheckCircle2,
  Loader2,
  Printer,
  PenTool,
  XCircle,
  CircleCheck,
  Ban,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusLabel } from '@/lib/surat-utils';

const STATUS_CONFIG: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  DRAFT: {
    icon: FileEdit,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  },
  DIAJUKAN: {
    icon: Send,
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  DIVERIFIKASI: {
    icon: CheckCircle2,
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  DIPROSES: {
    icon: Loader2,
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  DICETAK: {
    icon: Printer,
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  DITANDATANGANI: {
    icon: PenTool,
    className: 'bg-teal-100 text-teal-700 border-teal-200',
  },
  DITOLAK: {
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  SELESAI: {
    icon: CircleCheck,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  DIBATALKAN: {
    icon: Ban,
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
};

interface SuratStatusBadgeProps {
  status: string;
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SuratStatusBadge({
  status,
  showLabel = true,
  className,
  size = 'md',
}: SuratStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    icon: FileSpreadsheet,
    className: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap',
        config.className,
        sizeClasses[size],
        className,
      )}
    >
      <Icon className={cn(iconSizes[size], status === 'DIPROSES' && 'animate-spin')} />
      {showLabel && getStatusLabel(status)}
    </span>
  );
}
