import React from 'react';
import { create } from 'zustand';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmOptions | null;
  confirmAction: (options: ConfirmOptions) => void;
  closeConfirm: () => void;
}

export const useConfirmModal = create<ConfirmState>((set) => ({
  isOpen: false,
  options: null,
  confirmAction: (options) => set({ isOpen: true, options }),
  closeConfirm: () => set({ isOpen: false, options: null }),
}));

export const ConfirmModal: React.FC = () => {
  const { isOpen, options, closeConfirm } = useConfirmModal();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  if (!isOpen || !options) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await options.onConfirm();
      closeConfirm();
    } catch (err) {
      console.error('[ConfirmModal] Error in onConfirm:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (options.onCancel) options.onCancel();
    closeConfirm();
  };

  const isDanger = options.variant === 'danger' || !options.variant;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 overflow-hidden relative animate-in zoom-in-95 duration-150 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleCancel}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              isDanger
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            }`}
          >
            {isDanger ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {options.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {options.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
          >
            {options.cancelText || 'Cancel'}
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`px-4 py-2 text-xs font-semibold rounded-xl text-white shadow-sm transition-all active:scale-95 flex items-center gap-1.5 ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                : 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{options.confirmText || (isDanger ? 'Delete' : 'Confirm')}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

