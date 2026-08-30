import React, { useState } from 'react';
import type { ReviewItem } from '../types/parser';
import { isLikelyEmail } from '../lib/parser';
import { HelpCircle, Check, User, Edit3, AlertCircle } from 'lucide-react';

interface ReviewListProps {
  items: ReviewItem[];
  onResolveDisplayName: (reviewItemId: string, recipientId: string, chosenName: string) => void;
  onResolveAsRecipient: (reviewItemId: string, email: string, displayName?: string) => boolean | void;
  onDismiss: (reviewItemId: string) => void;
}

export const ReviewList: React.FC<ReviewListProps> = ({
  items,
  onResolveDisplayName,
  onResolveAsRecipient,
  onDismiss,
}) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [customName, setCustomName] = useState<string>('');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  if (items.length === 0) {
    return null;
  }

  const startEditing = (item: ReviewItem) => {
    setEditingItemId(item.id);
    setCustomName(item.suggestedName || '');
    setCustomEmail(item.suggestedEmail || (item.originalText.includes('@') ? item.originalText : ''));
    setValidationError(null);
  };

  const handleCustomSubmit = (item: ReviewItem) => {
    if (item.reason === 'conflicting_display_names' && item.associatedRecipientId) {
      onResolveDisplayName(item.id, item.associatedRecipientId, customName);
      setEditingItemId(null);
      setValidationError(null);
    } else {
      const emailToValidate = customEmail.trim();
      if (!isLikelyEmail(emailToValidate)) {
        setValidationError('That address still looks incomplete or malformed.');
        return;
      }

      const result = onResolveAsRecipient(item.id, emailToValidate, customName.trim() || undefined);
      if (result === false) {
        setValidationError('That address still looks incomplete or malformed.');
        return;
      }

      setEditingItemId(null);
      setValidationError(null);
    }
  };

  const handleQuickAdd = (item: ReviewItem) => {
    if (item.suggestedEmail) {
      const result = onResolveAsRecipient(item.id, item.suggestedEmail, item.suggestedName);
      if (result === false) {
        startEditing(item);
        setValidationError('That address still looks incomplete or malformed.');
      }
    }
  };

  const getBadgeLabel = (reason: ReviewItem['reason']) => {
    switch (reason) {
      case 'conflicting_display_names':
        return 'Conflicting Names';
      case 'broken_angle_brackets':
        return 'Unclosed Bracket';
      case 'missing_domain':
        return 'Missing Domain';
      case 'missing_at_symbol':
        return 'Missing @';
      case 'malformed_email':
        return 'Unusual Syntax';
      case 'multiple_addresses_in_segment':
        return 'Multiple Addresses';
      case 'unparsed_text':
      default:
        return 'Uncertain Segment';
    }
  };

  return (
    <section
      className="bg-amber-50/30 border border-amber-200/80 rounded-xl p-4 sm:p-5 space-y-3"
      aria-labelledby="review-bench-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-amber-200/60 pb-2.5">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-800 shrink-0" />
          <h2 id="review-bench-heading" className="text-sm font-bold text-amber-950">
            Review Bench ({items.length})
          </h2>
        </div>
        <p className="text-xs text-amber-900/80">
          Nothing uncertain is guessed. Pick a name, edit, or dismiss.
        </p>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-3 bg-white rounded-lg border border-stone-200/80 shadow-2xs space-y-2 text-sm"
          >
            {/* Header: Reason badge & description */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded bg-amber-100/90 text-amber-900 font-semibold text-xs">
                {getBadgeLabel(item.reason)}
              </span>
              <span className="text-xs text-stone-600">
                {item.reasonDescription}
              </span>
            </div>

            {/* Original Text fragment */}
            <div className="px-3 py-1.5 bg-stone-50 border border-stone-200/70 rounded font-mono text-xs text-stone-900 break-all select-text">
              {item.originalText}
            </div>

            {/* Conflict Resolution Choices */}
            {item.reason === 'conflicting_display_names' && item.associatedRecipientId && (
              <div className="space-y-2 pt-0.5">
                <div className="text-xs text-stone-700">
                  Select name for <span className="font-mono font-semibold text-stone-900">{item.suggestedEmail}</span>:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.displayNameOptions?.map((nameOption) => (
                    <button
                      key={nameOption}
                      type="button"
                      onClick={() => onResolveDisplayName(item.id, item.associatedRecipientId!, nameOption)}
                      className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 text-xs font-medium border border-stone-200 transition-colors flex items-center gap-1.5"
                    >
                      <User className="w-3 h-3 text-stone-500" />
                      <span>{nameOption}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => onResolveDisplayName(item.id, item.associatedRecipientId!, '')}
                    className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs border border-stone-200 transition-colors"
                  >
                    Address only
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditing(item)}
                    className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs border border-stone-200 transition-colors flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3 text-stone-500" />
                    <span>Custom name...</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDismiss(item.id)}
                    className="px-2.5 py-1 rounded text-stone-500 hover:text-stone-800 hover:bg-stone-100 text-xs transition-colors ml-auto"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* General Actions for Broken / Malformed / Uncertain */}
            {item.reason !== 'conflicting_display_names' && editingItemId !== item.id && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {item.suggestedEmail && (
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(item)}
                    className="px-2.5 py-1 rounded bg-[#FF6B4A] hover:bg-[#ea5533] text-white text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <Check className="w-3 h-3" />
                    <span>
                      Add as {item.suggestedName ? `${item.suggestedName} <${item.suggestedEmail}>` : item.suggestedEmail}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => startEditing(item)}
                  className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs border border-stone-200 transition-colors flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3 text-stone-500" />
                  <span>Edit & Add...</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDismiss(item.id)}
                  className="px-2.5 py-1 rounded text-stone-500 hover:text-stone-800 hover:bg-stone-100 text-xs transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Inline Custom Edit Form */}
            {editingItemId === item.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCustomSubmit(item);
                }}
                className="p-3 bg-stone-50 border border-stone-200 rounded-lg space-y-2.5 mt-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded text-xs text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-stone-900"
                    />
                  </div>
                  {item.reason !== 'conflicting_display_names' && (
                    <div>
                      <label className="block text-xs font-medium text-stone-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="text"
                        value={customEmail}
                        onChange={(e) => {
                          setCustomEmail(e.target.value);
                          if (validationError) setValidationError(null);
                        }}
                        placeholder="e.g. jane@example.com"
                        required
                        className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded text-xs text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-stone-900 font-mono"
                      />
                    </div>
                  )}
                </div>

                {validationError && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-700" />
                    <span>{validationError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItemId(null);
                      setValidationError(null);
                    }}
                    className="px-2.5 py-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-[#FF6B4A] hover:bg-[#ea5533] text-white text-xs font-medium flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    <span>Apply</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
