
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { OnboardingStep } from '../types';
import { ArrowRight, X, Check, HelpCircle, Sparkles, ExternalLink, Settings, GripVertical, ListChecks } from 'lucide-react';

interface OnboardingTourProps {
  stepIndex: number;
  steps: OnboardingStep[];
  onJump: (index: number) => void;
  onNext: (savePreference?: boolean) => void;
  onSkip: (savePreference?: boolean) => void;
  onStartTour?: () => void;
}

const CARD_WIDTH = 320;
const GAP = 14; // distance between the target element and the tour card
const PAD = 8;  // minimum distance from the viewport edge

interface Rect { left: number; top: number; width: number; height: number }

const intersects = (a: Rect, b: Rect, margin = 8): boolean =>
  a.left < b.left + b.width + margin &&
  a.left + a.width + margin > b.left &&
  a.top < b.top + b.height + margin &&
  a.top + a.height + margin > b.top;

// Every non-welcome step points at a live UI element: the element is found
// via its data-tour attribute, spotlighted (dim overlay with a cutout via a
// huge box-shadow), and the card is placed on whichever side has room, with
// an arrow aimed at the element. A separate stationary controller panel
// lists all steps for direct jumps, can be dragged by its header, and moves
// itself out of the way if it would cover the spotlighted element.
export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  stepIndex,
  steps,
  onJump,
  onNext,
  onSkip,
  onStartTour
}) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const step = steps[stepIndex];

  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardPos, setCardPos] = useState<{ x: number; y: number; side: 'right' | 'left' | 'bottom' | 'top' | 'center' }>({ x: 0, y: 0, side: 'center' });

  // Controller position (draggable). Starts bottom-right; measured after mount.
  const controllerRef = useRef<HTMLDivElement>(null);
  const [controllerPos, setControllerPos] = useState<{ x: number; y: number } | null>(null);
  const dragState = useRef<{ dx: number; dy: number } | null>(null);

  // --- Locate the anchored element (re-check on step change and resize) ---
  useLayoutEffect(() => {
    if (!step || step.isFirstRun) return;
    const measure = () => {
      const el = step.anchor ? document.querySelector(`[data-tour="${step.anchor}"]`) : null;
      if (el) {
        const r = el.getBoundingClientRect();
        setTargetRect({ left: r.left, top: r.top, width: r.width, height: r.height });
      } else {
        setTargetRect(null);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    // Elements can move as menus close/animations settle; re-measure briefly.
    const t = setTimeout(measure, 250);
    return () => { window.removeEventListener('resize', measure); clearTimeout(t); };
  }, [stepIndex, step]);

  // --- Place the card next to the target ---
  useLayoutEffect(() => {
    if (!step || step.isFirstRun) return;
    const cardH = cardRef.current?.offsetHeight || 220;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!targetRect) {
      setCardPos({ x: (vw - CARD_WIDTH) / 2, y: (vh - cardH) / 2, side: 'center' });
      return;
    }

    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const centerY = targetRect.top + targetRect.height / 2;
    const centerX = targetRect.left + targetRect.width / 2;

    let side: 'right' | 'left' | 'bottom' | 'top';
    let x: number; let y: number;
    if (targetRect.left + targetRect.width + GAP + CARD_WIDTH + PAD <= vw) {
      side = 'right';
      x = targetRect.left + targetRect.width + GAP;
      y = clamp(centerY - cardH / 2, PAD, vh - cardH - PAD);
    } else if (targetRect.left - GAP - CARD_WIDTH >= PAD) {
      side = 'left';
      x = targetRect.left - GAP - CARD_WIDTH;
      y = clamp(centerY - cardH / 2, PAD, vh - cardH - PAD);
    } else if (targetRect.top + targetRect.height + GAP + cardH + PAD <= vh) {
      side = 'bottom';
      x = clamp(centerX - CARD_WIDTH / 2, PAD, vw - CARD_WIDTH - PAD);
      y = targetRect.top + targetRect.height + GAP;
    } else {
      side = 'top';
      x = clamp(centerX - CARD_WIDTH / 2, PAD, vw - CARD_WIDTH - PAD);
      y = clamp(targetRect.top - GAP - cardH, PAD, vh - cardH - PAD);
    }
    setCardPos({ x, y, side });
  }, [targetRect, stepIndex, step]);

  // --- Controller: initial placement + auto-dodge away from the spotlight ---
  useLayoutEffect(() => {
    if (!step || step.isFirstRun) return;
    const w = controllerRef.current?.offsetWidth || 240;
    const h = controllerRef.current?.offsetHeight || 320;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const corners = [
      { x: vw - w - 16, y: vh - h - 16 }, // bottom-right (default)
      { x: 16, y: vh - h - 16 },          // bottom-left
      { x: vw - w - 16, y: 80 },          // top-right (below the header)
      { x: 16, y: 80 }                    // top-left
    ];

    const cardRect: Rect = { left: cardPos.x, top: cardPos.y, width: CARD_WIDTH, height: cardRef.current?.offsetHeight || 220 };
    const collides = (p: { x: number; y: number }) => {
      const r: Rect = { left: p.x, top: p.y, width: w, height: h };
      if (targetRect && intersects(r, targetRect)) return true;
      return intersects(r, cardRect);
    };

    // Keep the user's placement unless it now covers the target or the card.
    if (controllerPos && !collides(controllerPos)) return;
    const spot = corners.find(c => !collides(c)) || corners[0];
    setControllerPos(spot);
  }, [targetRect, cardPos, stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Controller dragging ---
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragState.current) return;
      const w = controllerRef.current?.offsetWidth || 240;
      const h = controllerRef.current?.offsetHeight || 320;
      setControllerPos({
        x: Math.max(0, Math.min(window.innerWidth - w, e.clientX - dragState.current.dx)),
        y: Math.max(0, Math.min(window.innerHeight - h, e.clientY - dragState.current.dy))
      });
    };
    const up = () => { dragState.current = null; document.body.style.userSelect = 'auto'; };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    return () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    if (!controllerPos) return;
    dragState.current = { dx: e.clientX - controllerPos.x, dy: e.clientY - controllerPos.y };
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  if (!step) return null;

  // ---------- Special layout for the first-run welcome dialog ----------
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

          {/* API Key Info */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
             <div className="flex items-start gap-2">
               <Sparkles className="text-indigo-500 mt-0.5 shrink-0" size={14} />
               <div className="text-xs text-slate-600 dark:text-slate-400">
                 <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-0.5">AI Features</span>
                 The "Group with Gemini" feature requires an API Key. You can set this up later via the
                 <strong className="inline-flex items-center gap-1 mx-1 text-slate-800 dark:text-slate-200"><Settings size={10} /> Settings</strong>.
                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-indigo-600 dark:text-indigo-400 hover:underline ml-1 font-medium">
                   Get key <ExternalLink size={10} />
                 </a>
               </div>
             </div>
          </div>

          {/* Start Interactive Tour Button */}
          <div>
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

  // ---------- Anchored tour layout ----------
  const arrowBase = 'absolute w-0 h-0 border-[9px] border-transparent';
  let arrowClass = '';
  let arrowStyle: React.CSSProperties = {};
  if (targetRect && cardPos.side !== 'center') {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    switch (cardPos.side) {
      case 'right': // card right of target — arrow on card's left edge
        arrowClass = 'border-r-white dark:border-r-slate-900';
        arrowStyle = { left: -18, top: Math.max(10, Math.min(targetCenterY - cardPos.y - 9, (cardRef.current?.offsetHeight || 220) - 28)) };
        break;
      case 'left':
        arrowClass = 'border-l-white dark:border-l-slate-900';
        arrowStyle = { right: -18, top: Math.max(10, Math.min(targetCenterY - cardPos.y - 9, (cardRef.current?.offsetHeight || 220) - 28)) };
        break;
      case 'bottom': // card below target — arrow on card's top edge
        arrowClass = 'border-b-white dark:border-b-slate-900';
        arrowStyle = { top: -18, left: Math.max(10, Math.min(targetCenterX - cardPos.x - 9, CARD_WIDTH - 28)) };
        break;
      case 'top':
        arrowClass = 'border-t-white dark:border-t-slate-900';
        arrowStyle = { bottom: -18, left: Math.max(10, Math.min(targetCenterX - cardPos.x - 9, CARD_WIDTH - 28)) };
        break;
    }
  }

  return (
    <div className="fixed inset-0 z-[70] pointer-events-none">
      {/* Spotlight: highlight ring + dim everything else via giant shadow */}
      {targetRect && (
        <div
          className="absolute rounded-lg border-2 border-indigo-400 transition-all duration-300"
          style={{
            left: targetRect.left - 4,
            top: targetRect.top - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)'
          }}
        />
      )}
      {!targetRect && <div className="absolute inset-0 bg-slate-900/30" />}

      {/* Step card */}
      <div
        ref={cardRef}
        className="pointer-events-auto absolute bg-white dark:bg-slate-900 border border-indigo-500/50 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200"
        style={{ left: cardPos.x, top: cardPos.y, width: CARD_WIDTH }}
      >
        {arrowClass && <div className={`${arrowBase} ${arrowClass}`} style={arrowStyle} />}

        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{step.title}</h3>
          <button
            onClick={() => onSkip(true)}
            className="text-slate-400 hover:text-slate-900 dark:hover:text-white -mr-1 -mt-1 p-1"
            title="End tour"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {step.content}
        </p>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">
            Step {stepIndex + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={() => onJump(stepIndex - 1)}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={() => onNext(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wide rounded-full transition-colors shadow-sm"
            >
              {stepIndex === steps.length - 1 ? 'Finish' : 'Next'}
              {stepIndex === steps.length - 1 ? <Check size={12} /> : <ArrowRight size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Stationary controller: step menu + End Tour. Draggable by its
          header; repositions itself if it would cover the spotlight. */}
      <div
        ref={controllerRef}
        className="pointer-events-auto absolute w-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in duration-200"
        style={controllerPos ? { left: controllerPos.x, top: controllerPos.y } : { right: 16, bottom: 16 }}
      >
        <div
          onMouseDown={startDrag}
          className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 cursor-move select-none border-b border-slate-200 dark:border-slate-700"
          title="Drag to move"
        >
          <GripVertical size={14} className="text-slate-400" />
          <ListChecks size={14} className="text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex-1">Tour Steps</span>
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => onJump(i)}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                i === stepIndex
                  ? 'bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center shrink-0 ${
                i === stepIndex ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>{i + 1}</span>
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>
        <div className="p-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => onSkip(true)}
            className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            End Tour
          </button>
        </div>
      </div>
    </div>
  );
};
