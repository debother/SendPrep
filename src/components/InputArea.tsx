import React from 'react';
import { Trash2 } from 'lucide-react';

interface InputAreaProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
}

const SAMPLE_OUTLOOK = `To: Max Mustermann <max@example.de>;
Erika <erika@example.de>

Cc: Peter Example <peter@example.com>
Bcc: intern-archiv@unternehmensberatung.de`;

const SAMPLE_SPREADSHEET = `Max Mustermann\tmax@example.de\tBerlin
Erika Musterfrau\terika@example.de\tMunich
"Smith, Jane"\tjane@example.org\tLondon`;

const SAMPLE_MIXED = `Jane Doe <jane@example.com>;
john@example.com;
Jane Doe <JANE@example.com>
Dr. Jane Doe – Legal <jane@example.com>
mailto:sales@example.net?cc=team@example.net
Unclosed Fragment <broken@example.com
Meeting note: please follow up after Friday`;

export const InputArea: React.FC<InputAreaProps> = ({
  value,
  onChange,
  onClear,
}) => {
  return (
    <div className="bg-white border border-stone-200/90 rounded-xl p-4 sm:p-5 space-y-3 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <label htmlFor="pasted-input" className="text-sm font-bold text-stone-900 block">
            Recipient Input
          </label>
          <p className="text-xs text-stone-500 mt-0.5">
            Paste recipients from Outlook, Gmail, Excel, headers, or plain text.
          </p>
        </div>

        {/* Samples & Clear */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-medium text-stone-400 mr-0.5">
            Sample:
          </span>
          <button
            type="button"
            onClick={() => onChange(SAMPLE_MIXED)}
            className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-xs font-medium text-stone-700 transition-colors"
          >
            Duplicates & Mix
          </button>
          <button
            type="button"
            onClick={() => onChange(SAMPLE_OUTLOOK)}
            className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-xs font-medium text-stone-700 transition-colors"
          >
            Outlook Headers
          </button>
          <button
            type="button"
            onClick={() => onChange(SAMPLE_SPREADSHEET)}
            className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-xs font-medium text-stone-700 transition-colors"
          >
            Spreadsheet Tabs
          </button>
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="px-2.5 py-1 rounded bg-stone-100 hover:bg-red-50 text-xs font-medium text-stone-600 hover:text-red-600 transition-colors flex items-center gap-1 ml-1"
              title="Clear input"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Textarea */}
      <textarea
        id="pasted-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Jane Doe <jane@example.com>;
john@example.com;
Jane Doe <JANE@example.com>`}
        rows={6}
        className="w-full p-3.5 bg-stone-50/60 border border-stone-200 rounded-lg font-mono text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-stone-900 transition-colors resize-y leading-relaxed"
        autoFocus
      />

      <div className="flex items-center justify-between text-xs text-stone-400 pt-0.5">
        <span>Nothing uncertain is silently discarded. Email addresses are never corrected or rewritten. If something looks wrong, SendPrep sends it to Review instead.</span>
        <span>{value.length} characters</span>
      </div>
    </div>
  );
};
