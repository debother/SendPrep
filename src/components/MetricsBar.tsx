import React from 'react';
import { CheckCircle2, CopyCheck, AlertCircle } from 'lucide-react';

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
      className="grid grid-cols-3 gap-2.5 p-2.5 bg-stone-100/70 border border-stone-200/80 rounded-xl"
      role="region"
      aria-label="Recipient statistics summary"
    >
      {/* Ready Recipients */}
      <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-stone-200/60 shadow-2xs">
        <div className="p-1.5 bg-stone-100 rounded-md text-stone-800">
          <CheckCircle2 className="w-3.5 h-3.5 text-stone-800" />
        </div>
        <div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 leading-none">
            {recipientCount}
          </div>
          <div className="text-[11px] font-medium text-stone-500 mt-0.5">
            ready
          </div>
        </div>
      </div>

      {/* Duplicates Merged */}
      <div className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-stone-200/60 shadow-2xs">
        <div className="p-1.5 bg-stone-100 rounded-md text-stone-800">
          <CopyCheck className="w-3.5 h-3.5 text-stone-800" />
        </div>
        <div>
          <div className="text-lg sm:text-xl font-bold tracking-tight text-stone-900 leading-none">
            {duplicateCount}
          </div>
          <div className="text-[11px] font-medium text-stone-500 mt-0.5">
            {duplicateCount === 1 ? 'duplicate merged' : 'duplicates merged'}
          </div>
        </div>
      </div>

      {/* Needs Review */}
      <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border shadow-2xs transition-colors ${
        reviewCount > 0
          ? 'bg-amber-50/80 border-amber-300/80 text-amber-950'
          : 'bg-white border-stone-200/60 text-stone-900'
      }`}>
        <div className={`p-1.5 rounded-md ${
          reviewCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-stone-100 text-stone-800'
        }`}>
          <AlertCircle className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className={`text-lg sm:text-xl font-bold tracking-tight leading-none ${
            reviewCount > 0 ? 'text-amber-900' : 'text-stone-900'
          }`}>
            {reviewCount}
          </div>
          <div className={`text-[11px] font-medium mt-0.5 ${
            reviewCount > 0 ? 'text-amber-800 font-semibold' : 'text-stone-500'
          }`}>
            {reviewCount === 1 ? 'needs review' : 'need review'}
          </div>
        </div>
      </div>
    </div>
  );
};
