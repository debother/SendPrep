import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-stone-200/70 py-6 text-center text-xs text-stone-500 mt-auto bg-white/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-500">
        <div>
          <span>Your recipient data is processed locally in your browser and is not uploaded by SendPrep.</span>
        </div>
        <nav className="flex items-center justify-center flex-wrap gap-x-2.5 gap-y-1 font-mono text-stone-500" aria-label="Footer navigation">
          <a
            href="https://debother.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-stone-900 transition-colors underline underline-offset-2"
          >
            debother.
          </a>
          <span aria-hidden="true" className="text-stone-300 select-none">·</span>
          <a
            href="https://debother.com/imprint/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-stone-900 transition-colors underline underline-offset-2"
          >
            Impressum
          </a>
          <span aria-hidden="true" className="text-stone-300 select-none">·</span>
          <a
            href="https://debother.com/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-stone-900 transition-colors underline underline-offset-2"
          >
            Privacy
          </a>
          <span aria-hidden="true" className="text-stone-300 select-none">·</span>
          <a
            href="https://github.com/debother/SendPrep"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-stone-900 transition-colors underline underline-offset-2"
          >
            GitHub
          </a>
          <span aria-hidden="true" className="text-stone-300 select-none">·</span>
          <a
            href="https://github.com/debother/SendPrep/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-stone-900 transition-colors underline underline-offset-2"
          >
            MIT
          </a>
        </nav>
      </div>
    </footer>
  );
};
