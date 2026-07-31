
import React, { useLayoutEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  separatorAbove?: boolean;
  submenu?: ContextMenuItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

// Shared right-click menu for tabs, windows, and AI groups. Rendered at the
// cursor (clamped to the viewport), one submenu level, closes on
// click-outside / Escape / outside scroll. Items are divs, not buttons —
// a submenu nests inside its parent item, and nested <button>s are invalid.
export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x: Math.max(4, Math.min(x, window.innerWidth - rect.width - 4)),
      y: Math.max(4, Math.min(y, window.innerHeight - rect.height - 4))
    });
  }, [x, y]);

  useLayoutEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleScroll = (e: Event) => {
      // Scrolling the submenu's own list must not dismiss the menu.
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  const renderItem = (item: ContextMenuItem, idx: number, inSubmenu: boolean) => (
    <React.Fragment key={idx}>
      {item.separatorAbove && <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />}
      <div
        role="menuitem"
        aria-disabled={item.disabled}
        onMouseEnter={() => { if (!inSubmenu) setOpenSubmenu(item.submenu ? idx : null); }}
        onClick={(e) => {
          e.stopPropagation();
          if (item.disabled || item.submenu || !item.onClick) return;
          item.onClick();
          onClose();
        }}
        className={`relative w-full px-3 py-1.5 text-sm flex items-center gap-2 whitespace-nowrap transition-colors select-none ${
          item.disabled
            ? 'text-slate-400 dark:text-slate-600 cursor-default'
            : item.danger
              ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer'
              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
        }`}
      >
        {item.icon && <span className="shrink-0 text-slate-400 dark:text-slate-500">{item.icon}</span>}
        <span className="flex-1 truncate max-w-[240px]">{item.label}</span>
        {item.submenu && <ChevronRight size={14} className="shrink-0 opacity-60" />}
        {item.submenu && openSubmenu === idx && (
          <div className="absolute left-full top-0 -ml-1 min-w-[160px] max-h-72 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 z-10">
            {item.submenu.map((sub, j) => renderItem(sub, j, true))}
          </div>
        )}
      </div>
    </React.Fragment>
  );

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[100] min-w-[200px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, idx) => renderItem(item, idx, false))}
    </div>
  );
};
