import { tokenizeInput } from './tokenizer';
import type { CleanRecipient, ParseResult, ReviewItem, ReviewReason } from '../types/parser';

// Common email headers to strip or identify
const HEADER_PREFIX_REGEX = /^(To|Cc|Bcc|From|Sent|Subject|Reply-To|Organizer|Required|Optional|Invited|Attendees)\s*:\s*/i;

interface ExtractedCandidate {
  email?: string;
  displayName?: string;
  extraRecipients?: Array<{ email: string; displayName?: string; sourceText: string }>;
  unhandledQuery?: string;
  errorReason?: ReviewReason;
  errorDescription?: string;
}

/**
 * Cleans quotation marks and excess whitespace from display names
 */
export function cleanDisplayName(name: string): string {
  let cleaned = name.trim();

  // Strip leading Gmail/Outlook quote timestamp prefixes like "2026 at 3:45 PM"
  cleaned = cleaned.replace(/^\d{4}\s+at\s+\d+:\d+(?::\d+)?\s*(?:AM|PM)?\s*/i, '').trim();

  // Strip outer matching quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

/**
 * Conservative email syntax check:
 * - Must contain exactly one '@' (unless quoted local part)
 * - Non-empty local part and domain part
 * - No whitespace in either part
 * - Domain must not start or end with a dot or hyphen
 * - Domain must not contain consecutive dots (..)
 * Does NOT enforce restrictive TLD lists or public suffix rules.
 */
export function isLikelyEmail(str: string): boolean {
  if (!str || str.length > 254) return false;
  const trimmed = str.trim();
  if (/\s/.test(trimmed)) return false;

  const atIdx = trimmed.indexOf('@');
  if (atIdx <= 0 || atIdx === trimmed.length - 1) return false;

  const lastAtIdx = trimmed.lastIndexOf('@');
  // Allow single @ in unquoted email
  if (atIdx !== lastAtIdx && !trimmed.startsWith('"')) return false;

  const localPart = trimmed.slice(0, atIdx);
  const domainPart = trimmed.slice(atIdx + 1);

  if (!localPart || !domainPart) return false;
  // Domain must not start or end with dot or hyphen
  if (domainPart.startsWith('.') || domainPart.endsWith('.') || domainPart.startsWith('-') || domainPart.endsWith('-')) {
    return false;
  }
  // Domain must not contain consecutive dots (e.g. gmx..de is structurally malformed)
  if (domainPart.includes('..')) {
    return false;
  }

  return true;
}

/**
 * Safe URI component decoding that fails closed without throwing URIError
 */
export function safeDecodeURIComponent(str: string): { decoded: string; isMalformed: boolean } {
  try {
    return { decoded: decodeURIComponent(str.replace(/\+/g, ' ')), isMalformed: false };
  } catch {
    // Fail-closed fallback: preserve original text without throwing
    return { decoded: str, isMalformed: true };
  }
}

/**
 * Parses mailto: URIs, extracting the primary recipient, any recipient-bearing
 * query parameters (to, cc, bcc), and preserving non-recipient or malformed query parameters
 * for Needs Review to respect the Completeness Invariant.
 */
function parseMailtoUri(mailtoStr: string): ExtractedCandidate {
  let text = mailtoStr.slice(7).trim(); // remove mailto:
  let queryString = '';

  const qIdx = text.indexOf('?');
  if (qIdx !== -1) {
    queryString = text.slice(qIdx + 1);
    text = text.slice(0, qIdx).trim();
  }

  const safePrimary = safeDecodeURIComponent(text);
  const primaryEmail = safePrimary.decoded.trim() ? safePrimary.decoded.trim() : undefined;
  const extraRecipients: Array<{ email: string; displayName?: string; sourceText: string }> = [];
  const unhandledParams: string[] = [];

  if (queryString) {
    const params = queryString.split('&');
    for (const param of params) {
      if (!param.trim()) continue;
      const eqIdx = param.indexOf('=');
      const rawKey = eqIdx !== -1 ? param.slice(0, eqIdx) : param;
      const rawVal = eqIdx !== -1 ? param.slice(eqIdx + 1) : '';

      const safeKey = safeDecodeURIComponent(rawKey);
      const safeVal = safeDecodeURIComponent(rawVal);

      const key = safeKey.decoded.toLowerCase().trim();
      const val = safeVal.decoded.trim();

      if (['to', 'cc', 'bcc'].includes(key) && val) {
        if (safeVal.isMalformed) {
          unhandledParams.push(`${key}=${rawVal}`);
        } else {
          // May contain comma-separated recipients
          const subTokens = tokenizeInput(val);
          for (const subToken of subTokens) {
            const parsedSub = parseTokenSegment(subToken.text);
            if (parsedSub.email && isLikelyEmail(parsedSub.email)) {
              extraRecipients.push({
                email: parsedSub.email,
                displayName: parsedSub.displayName,
                sourceText: `${key}=${subToken.text}`,
              });
            } else if (subToken.text.trim()) {
              unhandledParams.push(`${key}=${subToken.text}`);
            }
          }
        }
      } else {
        const decodedParam = eqIdx !== -1 ? `${key}=${safeVal.isMalformed ? rawVal : val}` : key;
        unhandledParams.push(decodedParam);
      }
    }
  }

  const unhandledQuery = unhandledParams.length > 0 ? `?${unhandledParams.join('&')}` : undefined;

  if (primaryEmail && isLikelyEmail(primaryEmail)) {
    return {
      email: primaryEmail,
      extraRecipients,
      unhandledQuery,
    };
  } else if (primaryEmail) {
    return {
      errorReason: 'malformed_email',
      errorDescription: 'Malformed email in mailto URI',
      email: primaryEmail,
      extraRecipients,
      unhandledQuery,
    };
  } else if (extraRecipients.length > 0) {
    const first = extraRecipients.shift()!;
    return {
      email: first.email,
      displayName: first.displayName,
      extraRecipients,
      unhandledQuery,
    };
  }

  return {
    errorReason: 'unparsed_text',
    errorDescription: 'Empty mailto URI',
    unhandledQuery,
  };
}

/**
 * Parses a single segment token into recipient candidate or review reason
 */
export function parseTokenSegment(tokenText: string): ExtractedCandidate {
  let text = tokenText.trim();

  // Strip leading headers like "To:", "Cc:", "Bcc:"
  const headerMatch = text.match(HEADER_PREFIX_REGEX);
  if (headerMatch) {
    text = text.slice(headerMatch[0].length).trim();
  }

  if (!text) {
    return {};
  }

  // Check for mailto:
  if (text.toLowerCase().startsWith('mailto:')) {
    return parseMailtoUri(text);
  }

  // Pattern 0: Tab-separated row (Spreadsheet copy/paste)
  if (text.includes('\t')) {
    const parts = text.split('\t').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const emailIndices: number[] = [];
      for (let idx = 0; idx < parts.length; idx++) {
        if (isLikelyEmail(parts[idx])) {
          emailIndices.push(idx);
        }
      }

      if (emailIndices.length === 1) {
        const emailIdx = emailIndices[0];
        const email = parts[emailIdx];
        const nameParts = parts.filter((_, idx) => idx !== emailIdx);
        const displayName = nameParts.length > 0 ? cleanDisplayName(nameParts.join(' ')) : undefined;
        return { email, displayName };
      } else if (emailIndices.length > 1) {
        const firstEmail = parts[emailIndices[0]];
        const extraRecipients = emailIndices.slice(1).map(idx => ({
          email: parts[idx],
          sourceText: parts[idx],
        }));
        return { email: firstEmail, extraRecipients };
      }
    }
  }

  // Detect and collapse redundant [mailto:email] suffixes that are identical to a plain leading email.
  // Example: "support@web-app.com [mailto:support@web-app.com]" is redundant representation, not two addresses.
  // Equality is checked deterministically by case-insensitive trim — no fuzzy matching.
  // If the addresses differ in any way, the segment is left intact and falls through to the multi-@ check.
  const redundantMailtoMatch = text.match(/^([^\s\[]+)\s+\[mailto:([^\]]+)\]$/i);
  if (redundantMailtoMatch) {
    const leadingPart = redundantMailtoMatch[1].trim();
    const mailtoAddr = redundantMailtoMatch[2].trim();
    if (leadingPart.toLowerCase() === mailtoAddr.toLowerCase() && isLikelyEmail(leadingPart)) {
      // Deterministic equality: both representations resolve to the same address.
      return { email: leadingPart };
    }
    // Addresses differ or are malformed — fall through to standard handling.
  }

  // Check for multiple email addresses in one segment without delimiters (e.g. space-separated)
  const atCount = (text.match(/@/g) || []).length;
  if (atCount > 1 && !text.startsWith('"')) {
    return {
      errorReason: 'multiple_addresses_in_segment',
      errorDescription: 'Multiple email addresses found in a single segment without delimiter',
    };
  }


  // Pattern 1: Name <email> or <email> (with optional trailing "wrote:")
  const angleMatch = text.match(/^(.*?)\s*<([^>]+)>\s*(?:wrote:?)?$/i);
  if (angleMatch) {
    const rawName = angleMatch[1].trim();
    const rawEmail = angleMatch[2].trim();
    const displayName = rawName ? cleanDisplayName(rawName) : undefined;

    if (isLikelyEmail(rawEmail)) {
      return { email: rawEmail, displayName };
    } else {
      return validateEmailSyntax(rawEmail, displayName);
    }
  }

  // Pattern 2: Check for broken angle brackets like "Name <email" or "email>"
  if (text.includes('<') && !text.includes('>')) {
    const parts = text.split('<');
    const possibleEmail = parts[1]?.trim() || '';
    return {
      errorReason: 'broken_angle_brackets',
      errorDescription: 'Unclosed angle bracket in recipient definition',
      email: possibleEmail.length > 0 ? possibleEmail : undefined,
      displayName: parts[0]?.trim() ? cleanDisplayName(parts[0]) : undefined,
    };
  }
  if (!text.includes('<') && text.includes('>')) {
    return {
      errorReason: 'broken_angle_brackets',
      errorDescription: 'Unmatched closing angle bracket',
    };
  }

  // Pattern 3: email (Display Name)
  const parenMatch = text.match(/^([^\s(]+)\s*\(([^)]+)\)$/);
  if (parenMatch) {
    const rawEmail = parenMatch[1].trim();
    const displayName = cleanDisplayName(parenMatch[2]);
    if (isLikelyEmail(rawEmail)) {
      return { email: rawEmail, displayName };
    } else {
      return validateEmailSyntax(rawEmail, displayName);
    }
  }

  // Pattern 5: CSV format "Name", email or Name, email
  if (text.includes(',')) {
    const lastCommaIdx = text.lastIndexOf(',');
    const possibleEmail = text.slice(lastCommaIdx + 1).trim();
    const possibleName = text.slice(0, lastCommaIdx).trim();
    if (isLikelyEmail(possibleEmail)) {
      return { email: possibleEmail, displayName: cleanDisplayName(possibleName) };
    }
  }

  // Pattern 6: Plain email address
  if (isLikelyEmail(text)) {
    return { email: text };
  }

  // If text contains @ but failed conservative syntax
  if (text.includes('@')) {
    return validateEmailSyntax(text);
  }

  // No email address found in this segment
  return {
    errorReason: 'unparsed_text',
    errorDescription: 'No valid email address found in this segment',
  };
}

/**
 * Validates syntax of an email string and assigns specific review reasons.
 * Never repairs or rewrites addresses — original text is preserved as-is.
 */
function validateEmailSyntax(rawEmail: string, displayName?: string): ExtractedCandidate {
  if (!rawEmail.includes('@')) {
    return {
      errorReason: 'missing_at_symbol',
      errorDescription: 'Missing @ symbol in email address',
      displayName,
    };
  }

  const atIdx = rawEmail.indexOf('@');
  const domain = rawEmail.slice(atIdx + 1);

  if (!domain || domain.trim().length === 0) {
    return {
      errorReason: 'missing_domain',
      errorDescription: 'Missing domain in email address',
      email: rawEmail,
      displayName,
    };
  }

  // Detect structural domain problems: consecutive dots, leading/trailing dot or hyphen
  const domainTrimmed = domain.trim();
  if (
    domainTrimmed.includes('..') ||
    domainTrimmed.startsWith('.') ||
    domainTrimmed.endsWith('.') ||
    domainTrimmed.startsWith('-') ||
    domainTrimmed.endsWith('-')
  ) {
    return {
      errorReason: 'malformed_domain',
      errorDescription: 'Malformed domain in email address',
      email: rawEmail,
      displayName,
    };
  }

  return {
    errorReason: 'malformed_email',
    errorDescription: 'Malformed email address syntax',
    email: rawEmail,
    displayName,
  };
}

/**
 * Main parser entry point. Takes raw pasted text, applies tokenization,
 * parses recipient structures, tracks duplicate occurrences, flags review items,
 * and rigorously guarantees the Completeness Invariant.
 */
export function parseRecipients(input: string): ParseResult {
  if (!input || !input.trim()) {
    return {
      recipients: [],
      reviewItems: [],
      duplicatesCount: 0,
      totalParsedCount: 0,
      unresolvedReviewCount: 0,
    };
  }

  const tokens = tokenizeInput(input);
  const rawRecipientsMap = new Map<string, CleanRecipient>();
  const reviewItems: ReviewItem[] = [];

  let duplicateCount = 0;
  let totalParsedCount = 0;

  const addRecipientCandidate = (
    email: string,
    displayName: string | undefined,
    sourceText: string,
    sourceRange: [number, number]
  ) => {
    totalParsedCount++;
    const normEmail = email.trim().toLowerCase();
    const existing = rawRecipientsMap.get(normEmail);

    const occurrence = {
      sourceText,
      sourceRange,
      rawDisplayName: displayName,
    };

    if (!existing) {
      rawRecipientsMap.set(normEmail, {
        id: `rec-${normEmail}-${rawRecipientsMap.size}`,
        email: email.trim(),
        normalizedEmail: normEmail,
        displayName,
        occurrences: [occurrence],
        occurrenceCount: 1,
        hasNameConflict: false,
      });
    } else {
      duplicateCount++;
      existing.occurrenceCount++;
      existing.occurrences.push(occurrence);

      const existingName = existing.displayName;
      const newName = displayName;

      if (newName && !existingName) {
        existing.displayName = newName;
      } else if (newName && existingName && newName.toLowerCase() !== existingName.toLowerCase()) {
        existing.hasNameConflict = true;
      }
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const text = token.text;

    if (/^(To|Cc|Bcc|From|Sent|Subject|Reply-To)\s*:?$/i.test(text)) {
      continue;
    }

    const candidate = parseTokenSegment(text);

    if (!candidate.errorReason && candidate.email && isLikelyEmail(candidate.email)) {
      addRecipientCandidate(candidate.email, candidate.displayName, text, [token.startIndex, token.endIndex]);

      if (candidate.extraRecipients && candidate.extraRecipients.length > 0) {
        for (const extra of candidate.extraRecipients) {
          addRecipientCandidate(extra.email, extra.displayName, extra.sourceText, [token.startIndex, token.endIndex]);
        }
      }

      if (candidate.unhandledQuery) {
        reviewItems.push({
          id: `rev-query-${i}-${token.startIndex}`,
          originalText: candidate.unhandledQuery,
          sourceRange: [token.startIndex, token.endIndex],
          reason: 'unparsed_text',
          reasonDescription: `Non-recipient parameters in mailto URI: ${candidate.unhandledQuery}`,
          resolved: false,
          dismissed: false,
        });
      }
    } else {
      const reviewId = `rev-${i}-${token.startIndex}`;
      reviewItems.push({
        id: reviewId,
        originalText: text,
        sourceRange: [token.startIndex, token.endIndex],
        reason: candidate.errorReason || 'unparsed_text',
        reasonDescription: candidate.errorDescription || 'Unparsed or ambiguous text',
        suggestedEmail: candidate.email,
        suggestedName: candidate.displayName,
        resolved: false,
        dismissed: false,
      });
    }
  }

  const finalRecipients: CleanRecipient[] = [];

  for (const recipient of rawRecipientsMap.values()) {
    if (recipient.hasNameConflict) {
      const distinctNames = Array.from(
        new Set(
          recipient.occurrences
            .map(o => o.rawDisplayName?.trim())
            .filter((name): name is string => Boolean(name && name.length > 0))
        )
      );

      const conflictRevId = `rev-conflict-${recipient.normalizedEmail}`;
      reviewItems.push({
        id: conflictRevId,
        originalText: recipient.occurrences.map(o => o.sourceText).join(' | '),
        sourceRange: recipient.occurrences[0].sourceRange,
        reason: 'conflicting_display_names',
        reasonDescription: `Found ${distinctNames.length} different display names for ${recipient.email}`,
        suggestedEmail: recipient.email,
        suggestedName: recipient.displayName,
        displayNameOptions: distinctNames,
        associatedRecipientId: recipient.id,
        resolved: false,
        dismissed: false,
      });
    }

    finalRecipients.push(recipient);
  }

  const unresolvedReviewCount = reviewItems.filter(r => !r.resolved && !r.dismissed).length;

  return {
    recipients: finalRecipients,
    reviewItems,
    duplicatesCount: duplicateCount,
    totalParsedCount,
    unresolvedReviewCount,
  };
}
