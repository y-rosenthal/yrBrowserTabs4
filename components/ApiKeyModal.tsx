
import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff, Save, ExternalLink, ShieldCheck } from 'lucide-react';
import { getStorageData } from '../services/storageService';

declare const chrome: any;

interface ApiKeyModalProps {
  onClose: () => void;
  onSave: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose, onSave }) => {
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isExtension, setIsExtension] = useState(false);

  useEffect(() => {
    // Check if running as extension
    setIsExtension(typeof chrome !== 'undefined' && !!chrome.storage);

    // Load existing key
    getStorageData().then(data => {
      if (data.apiKey) setInputValue(data.apiKey);
    });
  }, []);

  const handleSave = () => {
    if (inputValue.trim()) {
      onSave(inputValue.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Key size={18} className="text-indigo-500" />
            Setup Gemini API Key
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              To use AI features like "Group with Gemini", you need to provide your own API key.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 flex gap-2">
              <ShieldCheck className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Your key is stored locally in your browser {isExtension ? '(Chrome Storage)' : '(Local Storage)'}. It is never sent to any server other than Google's Gemini API.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enter API Key</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg pl-3 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-sm"
                autoFocus
              />
              <button 
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                tabIndex={-1}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Don't have a key?</span>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Get a free API key <ExternalLink size={12} />
            </a>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={!inputValue.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg shadow-sm flex items-center gap-2 transition-colors"
          >
            <Save size={16} />
            Save Key
          </button>
        </div>
      </div>
    </div>
  );
};
