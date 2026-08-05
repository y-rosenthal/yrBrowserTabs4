import { useEffect } from 'react';

// Close a modal/overlay on Escape. Attach in any component that renders a
// dismissible surface; App's global Escape handler deliberately stands back
// while a modal is open so this is the only thing that fires.
export const useEscapeClose = (onClose: () => void) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
};
