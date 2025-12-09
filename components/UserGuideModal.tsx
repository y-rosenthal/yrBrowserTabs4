
import React from 'react';
import { X, Download, BookOpen, Key } from 'lucide-react';

interface UserGuideModalProps {
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ onClose }) => {
  const guideContent = `
# TabMaster AI - User Guide

## Overview
TabMaster AI helps you organize, search, and manage browser tabs across multiple windows.

## Features

### 1. Navigation
- **Sidebar**: Switch between "All Tabs", "AI Organized" groups, or individual Windows.
- **Keyboard Shortcuts**: 
  - Use **Arrow Keys** (Up/Down) to navigate lists.
  - Use **Left/Right Arrows** to switch focus between the Sidebar and Tab List.
  - Press **Enter** to switch to the selected tab or view.

### 2. Window Management
- **Naming Windows**: Double-click a window name in the sidebar (or click the pencil icon) to give it a custom name. This helps you remember contexts like "Work", "Shopping", or "Research".
- **Merging**: Select multiple checkboxes in the sidebar to merge windows together. You can reorder them before merging.
- **Moving Tabs**: Select tabs using checkboxes in the tab list, then click "Move Tabs" to push them into a brand new window.

### 3. Organization
- **AI Grouping**: Click "Group with Gemini" to have AI automatically categorize your tabs based on their content.
  > **Requirement**: This feature requires a valid Gemini API Key.
  > 1. Click the **Key Icon** in the top-right menu (or wait for the prompt).
  > 2. Paste your API Key from Google AI Studio.
  > 3. The key is saved securely in your browser's local storage.
- **Search**: Use the top search bar to filter tabs by title or URL across all windows.

### 4. Persistence
- Custom window names are saved locally. Note: If you fully restart your computer and Chrome does not restore your previous session, window IDs may change, resetting the names.

## Tips
- **Double-click** any tab row to switch to it immediately.
- Use the **Maximize** button in the top right to open TabMaster in a full browser tab for a better experience.
`;

  const handleDownload = () => {
    const blob = new Blob([guideContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'TabMaster-UserGuide.md';
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
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
          <pre className="whitespace-pre-wrap font-sans text-slate-700 dark:text-slate-300">
            {guideContent}
          </pre>
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
