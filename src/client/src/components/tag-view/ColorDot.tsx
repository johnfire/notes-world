import { useState, useEffect, useRef } from 'react';
import { PALETTE } from '../../utils/colors';

interface ColorDotProps {
  color?: string | null;
  onChange: (c: string | null) => void;
}

export function ColorDot({ color, onChange }: ColorDotProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="w-3 h-3 rounded-full border border-gray-600 hover:border-gray-400 transition-colors opacity-0 group-hover:opacity-100"
        style={{ backgroundColor: color ?? '#4b5563' }}
        title="Set color"
      />
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-surface-800 border border-surface-500 rounded-lg p-2 shadow-xl grid grid-cols-4 gap-1.5 w-[120px]">
          {PALETTE.map(c => (
            <button
              key={c.value}
              onClick={(e) => { e.stopPropagation(); onChange(c.value); setOpen(false); }}
              className="w-5 h-5 rounded-full border border-surface-400 hover:scale-125 transition-transform"
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
          {color && (
            <button
              onClick={(e) => { e.stopPropagation(); onChange(null); setOpen(false); }}
              className="col-span-4 text-xs text-gray-400 hover:text-white mt-1 transition-colors"
            >
              Remove color
            </button>
          )}
        </div>
      )}
    </div>
  );
}
