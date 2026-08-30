import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface MetricsBarProps {
  recipientCount: number;
  duplicateCount: number;
  reviewCount: number;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  recipientCount,
  duplicateCount,
  reviewCount,
}) => {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-white border border-stone-200/90 rounded-xl shadow-2xs"
      role="region"
      aria-label="Preparation status summary"
    >
      {/* Primary Outcome & Quiet Merged Work */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <div className="flex items-center gap-2 text-stone-900">
          <div className="w-5 h-5 rounded-full bg-[#FF6B4A] text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm sm:text-base font-bold tracking-tight">
            {recipientCount} {recipientCount === 1 ? 'recipient ready' : 'recipients ready'}
          </span>
        </div>

        {duplicateCount > 0 && (
          <div className="text-xs text-stone-500 font-medium pl-1 sm:border-l sm:border-stone-200 sm:pl-2.5">
            {duplicateCount} {duplicateCount === 1 ? 'duplicate merged' : 'duplicates merged'}
          </div>
        )}
      </div>

      {/* Review Call to Action (Only rendered prominently when reviewCount > 0) */}
      {reviewCount > 0 && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-900 shrink-0 self-start sm:self-auto animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>
            {reviewCount} {reviewCount === 1 ? 'item needs your decision' : 'items need your decision'}
          </span>
        </div>
      )}
    </div>
  );
};
