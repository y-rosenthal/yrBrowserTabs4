
import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

interface ErrorModalProps {
  title: string;
  message: string;
  technicalDetails?: string;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ title, message, technicalDetails, onClose }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 overflow-y-auto">
          <div className="flex items-start gap-4">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full shrink-0">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
                {message}
              </p>
              
              {technicalDetails && (
                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors uppercase tracking-wider"
                  >
                    <Terminal size={14} />
                    {showDetails ? 'Hide' : 'Show'} Technical Details
                    {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  
                  {showDetails && (
                    <div className="mt-3 p-3 bg-slate-100 dark:bg-slate-950 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto border border-slate-200 dark:border-slate-800 whitespace-pre-wrap break-words max-h-60 overflow-y-auto shadow-inner select-text">
                      {technicalDetails}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 text-sm font-bold rounded-lg transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
