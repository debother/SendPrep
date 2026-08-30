import React, { useState } from 'react';
import type { OutputFormat } from '../types/parser';
import type { CopyNotification } from '../hooks/useSendPrep';
import { Copy, Check, Info, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface OutputControlsProps {
  recipientCount: number;
  outputFormat: OutputFormat;
  formattedOutput: string;
  unresolvedCount: number;
  copyNotification: CopyNotification | null;
  onFormatChange: (fmt: OutputFormat) => void;
  onCopy: () => Promise<boolean> | void;
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

  const handleCopyClick = async () => {
    const result = await onCopy();
    if (result !== false) {
      setJustCopied(true);
      setTimeout(() => {
        setJustCopied(false);
      }, 2500);
    } else {
      setJustCopied(false);
    }
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
          <h2 id="output-heading" className="text-sm font-bold text-stone-900">
            Output Format
          </h2>
          {unresolvedCount > 0 && (
            <span className="text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-medium">
              {unresolvedCount} in review (excluded from copy)
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(prev => !prev)}
          className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1.5 transition-colors"
        >
          {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{showPreview ? 'Hide preview' : 'Show preview'}</span>
        </button>
      </div>

      {/* Format Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Output format selection">
        {[...mailClientFormats, ...otherFormats].map((fmt) => {
          const isSelected = outputFormat === fmt.id;
          return (
            <button
              key={fmt.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onFormatChange(fmt.id)}
              className={`p-2.5 rounded-lg text-left border transition-all ${
                isSelected
                  ? 'bg-[#ffd9cf] text-[#171717] border-[#FF6B4A] shadow-2xs font-semibold ring-1 ring-[#FF6B4A]/50'
                  : 'bg-stone-50/80 hover:bg-stone-100/90 text-stone-700 border-stone-200/80'
              }`}
            >
              <div className="text-xs font-semibold text-stone-900">{fmt.label}</div>
              <div className="text-xs mt-0.5 text-stone-600">
                {fmt.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Formatted Monospace Preview */}
      {showPreview && (
        <div className="space-y-1 pt-1">
          <textarea
            id="formatted-preview"
            readOnly
            value={formattedOutput}
            rows={Math.min(5, Math.max(2, (formattedOutput.match(/\n/g) || []).length + 1))}
            className="w-full p-3 bg-stone-50 border border-stone-200/80 rounded-lg font-mono text-[13px] text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-stone-400 select-all resize-y leading-relaxed"
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
          className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171717] ${
            recipientCount > 0
              ? 'bg-[#FF6B4A] hover:bg-[#ea5533] active:translate-y-px text-white shadow-xs cursor-pointer'
              : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
          }`}
        >
          {justCopied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Copied {recipientCount} Recipients to Clipboard</span>
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
        {copyNotification && copyNotification.success && `Copied ${copyNotification.copiedCount} recipients.`}
        {copyNotification && !copyNotification.success && 'Copy failed.'}
      </div>

      {/* Non-intrusive feedback banner */}
      {copyNotification && (
        <div className={`p-3 rounded-lg text-xs flex items-start gap-2.5 transition-all ${
          !copyNotification.success
            ? 'bg-red-50 border border-red-200 text-red-900'
            : copyNotification.unresolvedCount > 0
              ? 'bg-amber-50 border border-amber-200 text-amber-900'
              : 'bg-stone-100 border border-stone-200 text-stone-800'
        }`}>
          {!copyNotification.success ? (
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          ) : copyNotification.unresolvedCount > 0 ? (
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          ) : (
            <Check className="w-4 h-4 text-stone-700 shrink-0 mt-0.5" />
          )}
          <div>
            {!copyNotification.success ? (
              <span className="font-semibold">
                Copy failed. Select the output and copy it manually.
              </span>
            ) : (
              <>
                <span className="font-semibold">
                  Copied {copyNotification.copiedCount} {copyNotification.copiedCount === 1 ? 'recipient' : 'recipients'}.
                </span>
                {copyNotification.unresolvedCount > 0 && (
                  <span className="block text-amber-800 mt-0.5">
                    Note: {copyNotification.unresolvedCount} {copyNotification.unresolvedCount === 1 ? 'item still needs' : 'items still need'} review and was not copied.
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
