
import React from 'react';
import { OnboardingStep } from '../types';
import { ArrowRight, X, Check } from 'lucide-react';

interface OnboardingTourProps {
  stepIndex: number;
  totalSteps: number;
  step: OnboardingStep;
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ 
  stepIndex, 
  totalSteps, 
  step, 
  onNext, 
  onSkip 
}) => {
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

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      {/* 
        Transparent container that passes clicks through (pointer-events-none on parent).
      */}
      
      {/* The Tooltip Card */}
      <div className={`pointer-events-auto absolute w-80 bg-white dark:bg-slate-900 border border-indigo-500/50 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] p-5 flex flex-col gap-3 transition-all duration-300 animate-in fade-in zoom-in-95 ${config.container}`}>
        
        {/* CSS Arrow */}
        {config.arrow && (
          <div className={`absolute w-0 h-0 ${config.arrow}`} />
        )}
        
        {/* Arrow Border (for better contrast/outline matching) */}
        {config.arrow && (
           <div className={`absolute w-0 h-0 -z-10 ${config.arrow.replace('border-r-white', 'border-r-indigo-500/50').replace('border-b-white', 'border-b-indigo-500/50').replace('dark:border-r-slate-900', 'dark:border-r-indigo-500/50').replace('dark:border-b-slate-900', 'dark:border-b-indigo-500/50')} ${step.position.includes('left') ? 'left-[-9px]' : 'top-[-9px]'}`} />
        )}

        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{step.title}</h3>
          <button 
            onClick={onSkip} 
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
            onClick={onNext}
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
