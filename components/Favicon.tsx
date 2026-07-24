
import React, { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

interface FaviconProps {
  src?: string;
  size?: number;
  className?: string;
}

// Tab favicon with a local fallback. A missing or unloadable icon renders a
// Globe glyph instead of fetching from an external placeholder service; the
// failed flag resets only when the URL changes, so a broken icon can never
// enter an error/retry loop.
export const Favicon: React.FC<FaviconProps> = ({ src, size = 16, className = '' }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [src]);

  if (!src || failed) {
    return <Globe size={size} className={`text-slate-400 dark:text-slate-600 shrink-0 ${className}`} />;
  }

  return (
    <img
      src={src}
      alt=""
      style={{ width: size, height: size }}
      className={`rounded-sm shrink-0 ${className}`}
      onError={() => setFailed(true)}
    />
  );
};
