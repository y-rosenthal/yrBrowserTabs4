
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
  // Positioning logic based on the 'position' prop
  // In a real app we might use popper.js, here we use fixed predefined zones suitable for the layout
  const getPositionClasses = () => {
    switch (step.position) {
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'left':
        return 'top-1/3 left-64 ml-4'; // Next to sidebar
      case 'top-left':
        return 'top-20 left-4';
      case 'top-right':
        return 'top-16 right-4';
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      {/* Dark overlay with specific cutout logic would be complex, 
          so we use a simple localized highlighting effect or just the card on top of a dimmer */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />

      {/* The Tooltip Card */}
      <div className={`pointer-events-auto absolute w-80 bg-white dark:bg-slate-900 border border-indigo-500/50 rounded-xl shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] p-5 flex flex-col gap-3 transition-all duration-500 ${getPositionClasses()}`}>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{step.title}</h3>
          <button onClick={onSkip} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <X size={16} />
          </button>
        </div>
        
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {step.content}
        </p>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <button 
            onClick={onNext}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wide rounded-full transition-colors"
          >
            {stepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
            {stepIndex === totalSteps - 1 ? <Check size={12} /> : <ArrowRight size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
};
