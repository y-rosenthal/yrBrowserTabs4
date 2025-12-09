
import React, { useState } from 'react';
import { X, Copy, FileText, Check, AlertTriangle } from 'lucide-react';

interface ApiKeyModalProps {
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);
  const envText = "API_KEY=your_gemini_api_key_here";

  const handleCopy = () => {
    navigator.clipboard.writeText(envText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Setup API Key
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            The "Group with Gemini" feature requires an API key. For security, this key must be set in your environment configuration file.
          </p>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <span className="bg-slate-200 dark:bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5">1</span>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Create a .env file</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Create a new file named <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-indigo-600 dark:text-indigo-400">.env</code> in the root folder of this project (next to package.json).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
               <span className="bg-slate-200 dark:bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5">2</span>
               <div className="w-full">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Add your key</p>
                <div className="mt-2 bg-slate-900 rounded-lg p-3 flex items-center justify-between group border border-slate-700">
                  <code className="text-xs text-green-400 font-mono">{envText}</code>
                  <button 
                    onClick={handleCopy}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
               <span className="bg-slate-200 dark:bg-slate-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 mt-0.5">3</span>
               <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Restart Server</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Restart your development server (Ctrl+C and then <code className="font-mono">npm run dev</code>) to apply the changes.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-sm"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
