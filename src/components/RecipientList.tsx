import React, { useState } from 'react';
import type { CleanRecipient } from '../types/parser';
import { Trash2, Edit2, Check, X, Info, Layers } from 'lucide-react';

interface RecipientListProps {
  recipients: CleanRecipient[];
  onDeleteRecipient: (id: string) => void;
  onUpdateRecipient: (id: string, name?: string, email?: string) => void;
}

export const RecipientList: React.FC<RecipientListProps> = ({
  recipients,
  onDeleteRecipient,
  onUpdateRecipient,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [expandedOccurrenceId, setExpandedOccurrenceId] = useState<string | null>(null);

  if (recipients.length === 0) {
    return null;
  }

  const startEdit = (r: CleanRecipient) => {
    setEditingId(r.id);
    setEditName(r.displayName || '');
    setEditEmail(r.email);
  };

  const saveEdit = (id: string) => {
    if (editEmail.trim()) {
      onUpdateRecipient(id, editName.trim() || '', editEmail.trim());
    }
    setEditingId(null);
  };

  const toggleExpandOccurrences = (id: string) => {
    setExpandedOccurrenceId(prev => prev === id ? null : id);
  };

  return (
    <section
      className="bg-white border border-stone-200/90 rounded-xl p-4 sm:p-5 space-y-3.5 shadow-2xs"
      aria-labelledby="clean-recipients-heading"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <h2 id="clean-recipients-heading" className="text-sm font-semibold text-stone-900">
            Ready Recipients ({recipients.length})
          </h2>
          <span className="text-xs text-stone-500">
            Deduplicated & ready for output
          </span>
        </div>

        {/* Passive BCC notice if count > 10 */}
        {recipients.length > 10 && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-stone-50 border border-stone-200 text-xs text-stone-600">
            <Info className="w-3.5 h-3.5 text-stone-400" />
            <span>{recipients.length} recipients · Consider BCC for external privacy</span>
          </div>
        )}
      </div>

      {/* Recipient list rows */}
      <div className="divide-y divide-stone-100 max-h-[380px] overflow-y-auto pr-1">
        {recipients.map((recipient) => (
          <div key={recipient.id} className="py-2.5 group">
            {editingId === recipient.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEdit(recipient.id);
                }}
                className="flex items-center gap-2 py-1"
              >
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Display name"
                  className="px-2 py-1 bg-white border border-stone-300 rounded text-xs text-stone-900 flex-1"
                />
                <input
                  type="text"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                  className="px-2 py-1 bg-white border border-stone-300 rounded text-xs text-stone-900 font-mono flex-1"
                />
                <button
                  type="submit"
                  className="p-1 rounded bg-stone-900 text-white hover:bg-stone-800"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="p-1 rounded bg-stone-200 text-stone-700 hover:bg-stone-300"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {recipient.displayName ? (
                      <div className="truncate flex items-baseline gap-2">
                        <span className="font-medium text-xs sm:text-sm text-stone-900 truncate">
                          {recipient.displayName}
                        </span>
                        <span className="font-mono text-xs text-stone-500 truncate">
                          &lt;{recipient.email}&gt;
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs sm:text-sm text-stone-900 truncate">
                        {recipient.email}
                      </span>
                    )}

                    {/* Duplicate Occurrences Badge */}
                    {recipient.occurrenceCount > 1 && (
                      <button
                        type="button"
                        onClick={() => toggleExpandOccurrences(recipient.id)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-[10px] font-medium text-stone-600 border border-stone-200 transition-colors shrink-0"
                        title="Click to view merged duplicate details"
                      >
                        <Layers className="w-2.5 h-2.5" />
                        <span>{recipient.occurrenceCount} merged</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(recipient)}
                      className="p-1 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-100 transition-colors"
                      title="Edit recipient"
                      aria-label="Edit recipient"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteRecipient(recipient.id)}
                      className="p-1 text-stone-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                      title="Delete recipient"
                      aria-label="Delete recipient"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded Occurrences View */}
                {expandedOccurrenceId === recipient.id && recipient.occurrences.length > 1 && (
                  <div className="mt-2 pl-3 border-l-2 border-stone-200 space-y-1 text-xs text-stone-600 bg-stone-50/60 p-2 rounded-r">
                    <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                      Original duplicate fragments ({recipient.occurrences.length}):
                    </div>
                    {recipient.occurrences.map((occ, idx) => (
                      <div key={idx} className="font-mono text-[11px] text-stone-700 break-all">
                        • {occ.sourceText}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};
