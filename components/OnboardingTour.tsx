
import React, { useState } from 'react';
import { OnboardingStep } from '../types';
import { ArrowRight, X, Check, Maximize2, HelpCircle, Sparkles, ExternalLink } from 'lucide-react';

interface OnboardingTourProps {
  stepIndex: number;
  totalSteps: number;
  step: OnboardingStep;
  onNext: (savePreference?: boolean) => void;
  onSkip: (savePreference?: boolean) => void;
  onMaximize?: () => void;
  onStartTour?: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ 
  stepIndex, 
  totalSteps, 
  step, 
  onNext, 
  onSkip,
  onMaximize,
  onStartTour
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(true);

  // Determine card position and arrow styles based on the 'position' prop
  const getLayoutConfig = () => {
    switch (step.position) {
      case 'center':
        return {
          container: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          arrow: null // No arrow for center modal
        };
      case 'left':
        // Targets sidebar list: Position to the right of the sidebar
        return {
          container: 'top-1/3 left-[270px]', 
          arrow: 'left-[-8px] top-8 border-r-white dark:border-r-slate-900 border-t-transparent border-b-transparent border-l-transparent border-[8px]'
        };
      case 'bottom-left':
        // Targets Sidebar Footer (Gemini Button): Position to the right of the sidebar, at the bottom
        return {
          container: 'bottom-8 left-[270px]',
          arrow: 'left-[-8px] bottom-8 border-r-white dark:border-r-slate-900 border-t-transparent border-b-transparent border-l-transparent border-[8px]'
        };
      case 'top-left':
        return {
          container: 'top-20 left-4',
          arrow: 'top-[-8px] left-4 border-b-white dark:border-b-slate-900 border-l-transparent border-r-transparent border-t-transparent border-[8px]'
        };
      case 'top-right':
        // Targets Help Button: Position below header, aligned right
        return {
          container: 'top-[70px] right-6',
          arrow: 'top-[-8px] right-6 border-b-white dark:border-b-slate-900 border-l-transparent border-r-transparent border-t-transparent border-[8px]'
        };
      case 'top-search':
        // Targets Search Bar: Position below header, offset to point to the search input area (left of buttons)
        return {
          container: 'top-[70px] right-[280px]',
          arrow: 'top-[-8px] right-8 border-b-white dark:border-b-slate-900 border-l-transparent border-r-transparent border-t-transparent border-[8px]'
        };
      default:
        return {
          container: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          arrow: null
        };
    }
  };

  const config = getLayoutConfig();

  // Special Layout for First Run / Welcome
  if (step.isFirstRun) {
    return (
      <div className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-300">
          
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight mb-1">{step.title}</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Organize your browser chaos instantly.</p>
            </div>
            <button 
              onClick={() => onSkip(dontShowAgain)} 
              className="text-slate-400 hover:text-slate-900 dark:hover:text-white -mr-2 -mt-2 p-2"
              title="Dismiss"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
             {/* Help Button */}
            <button 
              onClick={() => { onStartTour?.(); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-indigo-200 dark:border-slate-700 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors group text-left"
            >
              <div className="bg-indigo-100 dark:bg-indigo-800 p-2 rounded-lg text-indigo-600 dark:text-indigo-300 group-hover:scale-110 transition-transform">
                <HelpCircle size={20} />
              </div>
              <div>
                <span className="block font-semibold text-slate-900 dark:text-slate-100">Start Interactive Tour</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Learn how to use features in 30 seconds</span>
              </div>
            </button>

            {/* Maximize Button */}
            <button 
              onClick={onMaximize}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group text-left"
            >
               <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-slate-300 group-hover:scale-110 transition-transform">
                <Maximize2 size={20} />
              </div>
              <div>
                <span className="block font-semibold text-slate-900 dark:text-slate-100">Maximize Window</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">Expand to a full browser tab for better view</span>
              </div>
            </button>
          </div>

          {/* API Key Info */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
             <div className="flex items-start gap-2">
               <Sparkles className="text-indigo-500 mt-0.5 shrink-0" size={14} />
               <div className="text-xs text-slate-600 dark:text-slate-400">
                 <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">AI Features Required Setup</span>
                 The "Group with Gemini" feature requires a Google Gemini API Key. 
                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 hover:underline ml-1 font-medium">
                   Get a free key here <ExternalLink size={10} />
                 </a>
               </div>
             </div>
          </div>

          {/* Footer with Checkbox */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={dontShowAgain} 
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-900"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400">Don't show this again</span>
            </label>

            <button 
              onClick={() => onSkip(dontShowAgain)}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              Got it
            </button>
          </div>

        </div>
      </div>
    );
  }

  // Standard Tour Layout
  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      <div className={`pointer-events-auto absolute w-80 bg-white dark:bg-slate-900 border border-indigo-500/50 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] p-5 flex flex-col gap-3 transition-all duration-300 animate-in fade-in zoom-in-95 ${config.container}`}>
        
        {/* CSS Arrow */}
        {config.arrow && (
          <div className={`absolute w-0 h-0 ${config.arrow}`} />
        )}
        
        {/* Arrow Border correction */}
        {config.arrow && (
           <div className={`absolute w-0 h-0 -z-10 ${config.arrow.replace('border-r-white', 'border-r-indigo-500/50').replace('border-b-white', 'border-b-indigo-500/50').replace('dark:border-r-slate-900', 'dark:border-r-indigo-500/50').replace('dark:border-b-slate-900', 'dark:border-b-indigo-500/50')} ${step.position.includes('left') ? 'left-[-9px]' : 'top-[-9px]'}`} />
        )}

        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{step.title}</h3>
          <button 
            onClick={() => onSkip(true)} 
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white -mr-1 -mt-1 p-1"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {step.content}
        </p>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <button 
            onClick={() => onNext(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wide rounded-full transition-colors shadow-sm"
          >
            {stepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
            {stepIndex === totalSteps - 1 ? <Check size={12} /> : <ArrowRight size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
};
