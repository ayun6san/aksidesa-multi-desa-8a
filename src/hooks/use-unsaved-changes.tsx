'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface UseUnsavedChangesOptions {
  // Whether there are unsaved changes
  hasUnsavedChanges: boolean;
  // Callback when user confirms to leave
  onConfirm?: () => void;
  // Custom message
  message?: string;
  // Whether to show the confirmation dialog
  enabled?: boolean;
}

interface UnsavedChangesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

// Dialog component for unsaved changes confirmation
export function UnsavedChangesDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title = 'Perubahan Belum Disimpan',
  description = 'Anda memiliki perubahan yang belum disimpan. Jika keluar sekarang, perubahan akan hilang. Apakah Anda yakin ingin keluar?',
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-gray-600 mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel onClick={onCancel}>
            Tetap di Halaman
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Keluar Tanpa Menyimpan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook to handle unsaved changes
export function useUnsavedChanges({
  hasUnsavedChanges,
  onConfirm,
  message = 'Anda memiliki perubahan yang belum disimpan. Yakin ingin meninggalkan halaman ini?',
  enabled = true,
}: UseUnsavedChangesOptions) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const confirmedRef = useRef(false);

  // Handle browser close/refresh
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (confirmedRef.current) return;
      
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, message, enabled]);

  // Handle confirmation
  const handleConfirm = useCallback(() => {
    confirmedRef.current = true;
    setShowDialog(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    if (onConfirm) {
      onConfirm();
    }
  }, [pendingAction, onConfirm]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setShowDialog(false);
    setPendingAction(null);
  }, []);

  // Function to check and show confirmation if needed
  const checkAndConfirm = useCallback(
    (action: () => void) => {
      if (enabled && hasUnsavedChanges && !confirmedRef.current) {
        setPendingAction(() => action);
        setShowDialog(true);
        return false;
      }
      action();
      return true;
    },
    [hasUnsavedChanges, enabled]
  );

  // Reset confirmation state
  const resetConfirmation = useCallback(() => {
    confirmedRef.current = false;
  }, []);

  return {
    showDialog,
    setShowDialog,
    handleConfirm,
    handleCancel,
    checkAndConfirm,
    resetConfirmation,
    UnsavedChangesDialog: () => (
      <UnsavedChangesDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
  };
}

// Hook specifically for form dirty state tracking
export function useFormDirtyTracker<T extends Record<string, any>>(
  initialData: T,
  currentData: T
) {
  // Compare initial and current data
  const isDirty = useCallback(() => {
    const keys = new Set([...Object.keys(initialData), ...Object.keys(currentData)]);
    
    for (const key of keys) {
      const initialValue = initialData[key as keyof T];
      const currentValue = currentData[key as keyof T];
      
      // Handle null/undefined comparison
      if (initialValue === null || initialValue === undefined) {
        if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
          return true;
        }
      } else if (initialValue !== currentValue) {
        // Handle empty string vs other falsy values
        if (initialValue === '' && (currentValue === null || currentValue === undefined)) {
          continue;
        }
        return true;
      }
    }
    
    return false;
  }, [initialData, currentData]);

  return {
    isDirty: isDirty(),
    hasUnsavedChanges: isDirty(),
  };
}

export default useUnsavedChanges;
