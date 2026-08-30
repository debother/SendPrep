import React from 'react';
import { Shield } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur-xs sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <a
            href="https://debother.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono font-bold tracking-tight text-stone-900 hover:text-[#FF6B4A] transition-colors"
            aria-label="Debother home"
          >
            debother.
          </a>
          <span className="text-stone-300 font-mono text-xs select-none">/</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#FF6B4A] inline-block shrink-0" />
            <span className="text-sm font-bold tracking-tight text-stone-900">
              SendPrep
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100/90 border border-stone-200/70 text-[11px] sm:text-xs text-stone-600 font-medium shrink-0">
          <Shield className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FF6B4A]" />
          <span>Local only · In-browser</span>
        </div>
      </div>
    </header>
  );
};
