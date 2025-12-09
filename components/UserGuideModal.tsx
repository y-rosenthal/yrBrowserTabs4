
import React from 'react';
import { X, Download, BookOpen } from 'lucide-react';
// Import the README content as a raw string
// Use relative path to ensure it resolves correctly without aliases
import readmeContent from '../README.md?raw';

interface UserGuideModalProps {
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ onClose }) => {
  // We filter the README content slightly to make it look better in the modal
  // (e.g. removing the title if we already have one in the header)
  const displayContent = readmeContent;

  const handleDownload = () => {
    const blob = new Blob([displayContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TabMaster-UserGuide.md';
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]">
        
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-semibold">
            <BookOpen className="text-indigo-600 dark:text-indigo-400" size={20} />
            User Guide
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Download Guide"
            >
              <Download size={18} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto prose prose-sm max-w-none prose-slate dark:prose-invert">
          {/* 
            Note: In a real app we might use 'react-markdown' here. 
            Since we are keeping deps minimal, we render inside a pre-wrap div 
            but rely on the neat markdown formatting of the source.
          */}
          <div className="whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300">
            {displayContent}
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
