'use client';

import { cn } from '@/lib/utils';

// Base Skeleton component
interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export function Skeleton({ className, animate = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-gray-200',
        animate && 'animate-pulse',
        className
      )}
    />
  );
}

// Card Skeleton
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-white p-4 shadow-sm', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
    </div>
  );
}

// Stats Cards Skeleton
export function StatsCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 9 }: { columns?: number }) {
  return (
    <tr className="border-b border-gray-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, columns = 9 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// List Item Skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-gray-100">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

// List Skeleton
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: items }).map((_, i) => (
        <ListItemSkeleton key={i} />
      ))}
    </div>
  );
}

// Form Field Skeleton
export function FormFieldSkeleton({ label = true }: { label?: boolean }) {
  return (
    <div className="space-y-2">
      {label && <Skeleton className="h-3 w-20" />}
      <Skeleton className="h-9 w-full" />
    </div>
  );
}

// Form Section Skeleton
export function FormSectionSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <FormFieldSkeleton key={i} />
      ))}
    </div>
  );
}

// Card List Skeleton (for KK list, etc.)
export function CardListSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Dashboard Stat Skeleton
export function DashboardStatSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
    </div>
  );
}

// Dashboard Stats Grid Skeleton
export function DashboardStatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <DashboardStatSkeleton key={i} />
      ))}
    </div>
  );
}

// Chart Skeleton
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={cn('rounded-lg border bg-white p-4 shadow-sm', height)}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <Skeleton className="h-full w-full" />
    </div>
  );
}

// Profile Card Skeleton
export function ProfileCardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

// Detail View Skeleton
export function DetailViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
      
      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Pagination Skeleton
export function PaginationSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <Skeleton className="h-4 w-40" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-20" />
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8" />
          ))}
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

// Full Page Loading Skeleton for Data Tables
export function DataTableSkeleton({ 
  showStats = true, 
  showFilters = true, 
  rows = 5, 
  columns = 9 
}: { 
  showStats?: boolean; 
  showFilters?: boolean; 
  rows?: number; 
  columns?: number;
}) {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      {/* Stats */}
      {showStats && <StatsCardsSkeleton />}

      {/* Filters */}
      {showFilters && (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-full sm:w-40" />
            <Skeleton className="h-9 w-full sm:w-40" />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-white shadow-sm">
        <TableSkeleton rows={rows} columns={columns} />
        <PaginationSkeleton />
      </div>
    </div>
  );
}

export default Skeleton;
