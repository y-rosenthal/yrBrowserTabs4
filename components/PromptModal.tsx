
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface PromptModalProps {
  title: string;
  message?: string;
  initialValue?: string;
  submitText?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

// Small single-input modal used by the context-menu rename actions (single
// rename pre-fills the current name; batch rename asks for a base name).
export const PromptModal: React.FC<PromptModalProps> = ({
  title,
  message,
  initialValue = '',
  submitText = 'Save',
  onSubmit,
  onClose
}) => {
  const [value, setValue] = useState(initialValue);

  const submit = () => {
    if (value.trim()) {
      onSubmit(value.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150" onMouseDown={onClose}>
      <div
        className="w-96 max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 duration-150"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500">
            <X size={16} />
          </button>
        </div>
        {message && <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{message}</p>}
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
            if (e.key === 'Escape') onClose();
          }}
          className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="px-3 py-1.5 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
};
