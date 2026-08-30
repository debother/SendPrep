import React, { useState } from 'react';
import type { OutputFormat } from '../types/parser';
import type { CopyNotification } from '../hooks/useSendPrep';
import { Copy, Check, Info, Eye, EyeOff } from 'lucide-react';

interface OutputControlsProps {
  recipientCount: number;
  outputFormat: OutputFormat;
  formattedOutput: string;
  unresolvedCount: number;
  copyNotification: CopyNotification | null;
  onFormatChange: (fmt: OutputFormat) => void;
  onCopy: () => void;
}

export const OutputControls: React.FC<OutputControlsProps> = ({
  recipientCount,
  outputFormat,
  formattedOutput,
  unresolvedCount,
  copyNotification,
  onFormatChange,
  onCopy,
}) => {
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [justCopied, setJustCopied] = useState<boolean>(false);

  const handleCopyClick = () => {
    onCopy();
    setJustCopied(true);
    setTimeout(() => {
      setJustCopied(false);
    }, 2500);
  };

  const mailClientFormats: Array<{ id: OutputFormat; label: string; desc: string }> = [
    { id: 'outlook', label: 'Outlook', desc: 'Semicolon (;)' },
    { id: 'standard', label: 'Gmail / Apple Mail', desc: 'Comma (,)' },
  ];

  const otherFormats: Array<{ id: OutputFormat; label: string; desc: string }> = [
    { id: 'addresses_only', label: 'Addresses only', desc: '1 per line' },
    { id: 'csv', label: 'CSV text', desc: 'Name,Email' },
  ];

  return (
    <section
      className="bg-white border border-stone-200/90 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs"
      aria-labelledby="output-heading"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 id="output-heading" className="text-sm font-semibold text-stone-900">
            Output Format
          </h2>
          {unresolvedCount > 0 && (
            <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80 font-medium">
              {unresolvedCount} {unresolvedCount === 1 ? 'item needs review' : 'items need review'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(prev => !prev)}
          className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 transition-colors"
        >
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showPreview ? 'Hide preview' : 'Show preview'}</span>
        </button>
      </div>

      {/* Grouped Format Selector */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Mail client format selection">
          {mailClientFormats.map((fmt) => {
            const isSelected = outputFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onFormatChange(fmt.id)}
                className={`px-3 py-2 rounded-lg text-left border transition-all ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-stone-50/80 hover:bg-stone-100 text-stone-700 border-stone-200/80'
                }`}
              >
                <div className="text-xs font-semibold">{fmt.label}</div>
                <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                  {fmt.desc}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Other format selection">
          {otherFormats.map((fmt) => {
            const isSelected = outputFormat === fmt.id;
            return (
              <button
                key={fmt.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onFormatChange(fmt.id)}
                className={`px-3 py-2 rounded-lg text-left border transition-all ${
                  isSelected
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : 'bg-stone-50/80 hover:bg-stone-100 text-stone-700 border-stone-200/80'
                }`}
              >
                <div className="text-xs font-semibold">{fmt.label}</div>
                <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-stone-300' : 'text-stone-500'}`}>
                  {fmt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formatted Output Preview Textarea */}
      {showPreview && (
        <div className="space-y-1">
          <label htmlFor="formatted-preview" className="block text-[11px] font-medium text-stone-500 uppercase tracking-wider">
            Ready to copy ({recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'})
          </label>
          <textarea
            id="formatted-preview"
            readOnly
            value={formattedOutput}
            rows={Math.min(6, Math.max(2, (formattedOutput.match(/\n/g) || []).length + 1))}
            className="w-full p-2.5 bg-stone-50 border border-stone-200/80 rounded-lg font-mono text-xs text-stone-800 focus:outline-hidden focus:ring-1 focus:ring-stone-400 select-all resize-y"
            placeholder="No ready recipients to display."
          />
        </div>
      )}

      {/* Primary Copy Action Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleCopyClick}
          disabled={recipientCount === 0}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            recipientCount > 0
              ? 'bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white shadow-xs cursor-pointer'
              : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
          }`}
        >
          {justCopied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Copied {recipientCount} Recipients</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy {recipientCount} Ready {recipientCount === 1 ? 'Recipient' : 'Recipients'}</span>
            </>
          )}
        </button>
      </div>

      {/* Screen Reader Announcement */}
      <div aria-live="polite" className="sr-only">
        {copyNotification && `Copied ${copyNotification.copiedCount} recipients.`}
      </div>

      {/* Non-intrusive feedback banner */}
      {copyNotification && (
        <div className={`p-3 rounded-lg text-xs flex items-start gap-2.5 transition-all ${
          copyNotification.unresolvedCount > 0
            ? 'bg-amber-50 border border-amber-200 text-amber-900'
            : 'bg-stone-100 border border-stone-200 text-stone-800'
        }`}>
          {copyNotification.unresolvedCount > 0 ? (
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          ) : (
            <Check className="w-4 h-4 text-stone-700 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold">
              Copied {copyNotification.copiedCount} {copyNotification.copiedCount === 1 ? 'recipient' : 'recipients'}.
            </span>
            {copyNotification.unresolvedCount > 0 && (
              <span className="block text-amber-800 mt-0.5">
                Note: {copyNotification.unresolvedCount} {copyNotification.unresolvedCount === 1 ? 'item still needs' : 'items still need'} review and was not copied.
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
