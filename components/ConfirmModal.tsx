
import React from 'react';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmText: string;
  isProcessing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  title, 
  message, 
  confirmText, 
  isProcessing, 
  onConfirm, 
  onClose 
}) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
             <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full">
                <AlertTriangle className="text-amber-600 dark:text-amber-400" size={24} />
             </div>
             <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          </div>
          
          <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
            {message}
          </p>

          <div className="flex justify-end gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              disabled={isProcessing}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors shadow-sm"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{confirmText}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
