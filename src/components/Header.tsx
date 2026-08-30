import React from 'react';
import { Send, Shield } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur-xs sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shadow-2xs">
            <Send className="w-3.5 h-3.5 transform -rotate-12 translate-x-px" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold tracking-tight text-stone-900 leading-none">
                SendPrep
              </span>
              <a
                href="https://debother.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-stone-400 hover:text-stone-700 transition-colors font-mono"
              >
                by debother
              </a>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-100/80 border border-stone-200/60 text-xs text-stone-600 font-medium">
          <Shield className="w-3.5 h-3.5 text-stone-500" />
          <span>Local only · In-memory</span>
        </div>
      </div>
    </header>
  );
};
