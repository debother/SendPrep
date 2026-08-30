export type ReviewReason =
  | 'conflicting_display_names'
  | 'malformed_email'
  | 'missing_domain'
  | 'missing_at_symbol'
  | 'broken_angle_brackets'
  | 'ambiguous_name_address'
  | 'multiple_addresses_in_segment'
  | 'unparsed_text';

export interface RecipientOccurrence {
  sourceText: string;
  sourceRange: [number, number];
  rawDisplayName?: string;
}

export interface CleanRecipient {
  id: string;
  email: string;             // Original casing of first seen instance
  normalizedEmail: string;   // lowercase, trimmed for duplicate tracking
  displayName?: string;      // Cleaned display name if consistent
  occurrences: RecipientOccurrence[];
  occurrenceCount: number;
  hasNameConflict?: boolean;
}

export interface ReviewItem {
  id: string;
  originalText: string;
  sourceRange: [number, number];
  reason: ReviewReason;
  reasonDescription: string;
  suggestedEmail?: string;
  suggestedName?: string;
  displayNameOptions?: string[]; // for conflicting display names
  associatedRecipientId?: string;
  resolved: boolean;
  dismissed: boolean;
}

export interface ParseResult {
  recipients: CleanRecipient[];
  reviewItems: ReviewItem[];
  duplicatesCount: number;
  totalParsedCount: number;
  unresolvedReviewCount: number;
}

export type OutputFormat = 'outlook' | 'standard' | 'addresses_only' | 'csv';
