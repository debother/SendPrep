import { useState, useMemo, useCallback } from 'react';
import { parseRecipients, isLikelyEmail } from '../lib/parser';
import { formatRecipients } from '../lib/formatter';
import type { CleanRecipient, OutputFormat } from '../types/parser';

export interface CopyNotification {
  success: boolean;
  copiedCount: number;
  unresolvedCount: number;
  timestamp: number;
  errorMessage?: string;
}

export function useSendPrep() {
  const [rawInput, setRawInput] = useState<string>('');
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('outlook');

  // User overrides & resolutions
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});
  const [dismissedItemIds, setDismissedItemIds] = useState<Set<string>>(new Set());
  const [deletedRecipientIds, setDeletedRecipientIds] = useState<Set<string>>(new Set());
  const [manuallyResolvedRecipients, setManuallyResolvedRecipients] = useState<CleanRecipient[]>([]);
  const [copyNotification, setCopyNotification] = useState<CopyNotification | null>(null);

  // Parse raw input
  const baseParseResult = useMemo(() => {
    return parseRecipients(rawInput);
  }, [rawInput]);

  // Merge base recipients with manual resolutions, filter deleted, apply resolved names
  const cleanRecipients = useMemo(() => {
    const map = new Map<string, CleanRecipient>();

    // 1. Add base recipients
    for (const rec of baseParseResult.recipients) {
      if (deletedRecipientIds.has(rec.id)) continue;

      const overrideName = resolvedNames[rec.id];
      map.set(rec.normalizedEmail, {
        ...rec,
        displayName: overrideName !== undefined ? (overrideName ? overrideName : undefined) : rec.displayName,
      });
    }

    // 2. Add manually resolved recipients from review items
    for (const manual of manuallyResolvedRecipients) {
      if (deletedRecipientIds.has(manual.id)) continue;
      const existing = map.get(manual.normalizedEmail);
      if (!existing) {
        map.set(manual.normalizedEmail, manual);
      } else {
        // Update display name if manually specified
        if (manual.displayName) {
          existing.displayName = manual.displayName;
        }
      }
    }

    return Array.from(map.values());
  }, [baseParseResult.recipients, deletedRecipientIds, resolvedNames, manuallyResolvedRecipients]);

  // Compute active review items (excluding dismissed and resolved)
  const activeReviewItems = useMemo(() => {
    return baseParseResult.reviewItems.filter(item => {
      if (dismissedItemIds.has(item.id)) return false;
      // If associated recipient display name conflict was resolved
      if (item.associatedRecipientId && resolvedNames[item.associatedRecipientId] !== undefined) {
        return false;
      }
      return true;
    });
  }, [baseParseResult.reviewItems, dismissedItemIds, resolvedNames]);

  // Formatted output text
  const formattedOutput = useMemo(() => {
    return formatRecipients(cleanRecipients, outputFormat);
  }, [cleanRecipients, outputFormat]);

  // Actions
  const handleInputChange = useCallback((newText: string) => {
    setRawInput(newText);
    setResolvedNames({});
    setDismissedItemIds(new Set());
    setDeletedRecipientIds(new Set());
    setManuallyResolvedRecipients([]);
    setCopyNotification(null);
  }, []);

  const resolveDisplayNameConflict = useCallback((reviewItemId: string, recipientId: string, chosenName: string) => {
    setResolvedNames(prev => ({ ...prev, [recipientId]: chosenName }));
    setDismissedItemIds(prev => new Set(prev).add(reviewItemId));
  }, []);

  const resolveReviewItemAsRecipient = useCallback((
    reviewItemId: string,
    email: string,
    displayName?: string
  ): boolean => {
    const trimmedEmail = email.trim();
    // Conservative syntax check must be satisfied to cross trust boundary into Ready list
    if (!isLikelyEmail(trimmedEmail)) {
      return false;
    }

    const norm = trimmedEmail.toLowerCase();
    const newRec: CleanRecipient = {
      id: `manual-${norm}-${Date.now()}`,
      email: trimmedEmail,
      normalizedEmail: norm,
      displayName: displayName?.trim() ? displayName.trim() : undefined,
      occurrences: [{
        sourceText: displayName ? `${displayName} <${trimmedEmail}>` : trimmedEmail,
        sourceRange: [0, 0],
        rawDisplayName: displayName,
      }],
      occurrenceCount: 1,
    };

    setManuallyResolvedRecipients(prev => [...prev, newRec]);
    setDismissedItemIds(prev => new Set(prev).add(reviewItemId));
    return true;
  }, []);

  const dismissReviewItem = useCallback((reviewItemId: string) => {
    setDismissedItemIds(prev => new Set(prev).add(reviewItemId));
  }, []);

  const deleteRecipient = useCallback((recipientId: string) => {
    setDeletedRecipientIds(prev => new Set(prev).add(recipientId));
  }, []);

  const updateRecipient = useCallback((recipientId: string, newName?: string, newEmail?: string) => {
    if (newName !== undefined) {
      setResolvedNames(prev => ({ ...prev, [recipientId]: newName }));
    }
    if (newEmail !== undefined) {
      const trimmedNewEmail = newEmail.trim();
      if (isLikelyEmail(trimmedNewEmail)) {
        setManuallyResolvedRecipients(prev =>
          prev.map(r => r.id === recipientId ? { ...r, email: trimmedNewEmail, normalizedEmail: trimmedNewEmail.toLowerCase() } : r)
        );
      }
    }
  }, []);

  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    if (!formattedOutput) return false;

    let succeeded = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(formattedOutput);
        succeeded = true;
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = formattedOutput;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        succeeded = document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } catch {
      succeeded = false;
    }

    if (succeeded) {
      setCopyNotification({
        success: true,
        copiedCount: cleanRecipients.length,
        unresolvedCount: activeReviewItems.length,
        timestamp: Date.now(),
      });
      return true;
    } else {
      setCopyNotification({
        success: false,
        copiedCount: 0,
        unresolvedCount: activeReviewItems.length,
        timestamp: Date.now(),
        errorMessage: 'Copy failed. Select the output and copy it manually.',
      });
      return false;
    }
  }, [formattedOutput, cleanRecipients.length, activeReviewItems.length]);

  const clearAll = useCallback(() => {
    setRawInput('');
    setResolvedNames({});
    setDismissedItemIds(new Set());
    setDeletedRecipientIds(new Set());
    setManuallyResolvedRecipients([]);
    setCopyNotification(null);
  }, []);

  return {
    rawInput,
    setRawInput: handleInputChange,
    outputFormat,
    setOutputFormat,
    cleanRecipients,
    activeReviewItems,
    duplicatesCount: baseParseResult.duplicatesCount,
    formattedOutput,
    copyNotification,
    resolveDisplayNameConflict,
    resolveReviewItemAsRecipient,
    dismissReviewItem,
    deleteRecipient,
    updateRecipient,
    copyToClipboard,
    clearAll,
  };
}
