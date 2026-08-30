import type { CleanRecipient, OutputFormat } from '../types/parser';

/**
 * Formats a display name for mail client output, quoting if it contains special characters
 */
export function formatClientRecipient(recipient: CleanRecipient): string {
  const { email, displayName } = recipient;
  if (!displayName || !displayName.trim()) {
    return email;
  }

  const name = displayName.trim();
  // If name contains comma, semicolon, quotes, or angle brackets, wrap in quotes
  if (name.includes(',') || name.includes(';') || name.includes('"') || name.includes('<') || name.includes('>')) {
    const escaped = name.replace(/"/g, '\\"');
    return `"${escaped}" <${email}>`;
  }

  return `${name} <${email}>`;
}

/**
 * Formats a recipient for CSV according to RFC 4180
 */
export function formatCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Formats clean recipients into the requested output format string
 */
export function formatRecipients(recipients: CleanRecipient[], format: OutputFormat): string {
  if (!recipients || recipients.length === 0) {
    return '';
  }

  switch (format) {
    case 'outlook':
      return recipients.map(formatClientRecipient).join('; ');

    case 'standard':
      return recipients.map(formatClientRecipient).join(', ');

    case 'addresses_only':
      return recipients.map(r => r.email).join('\n');

    case 'csv': {
      const rows = ['Name,Email'];
      for (const r of recipients) {
        const nameField = formatCsvField(r.displayName || '');
        const emailField = formatCsvField(r.email);
        rows.push(`${nameField},${emailField}`);
      }
      return rows.join('\n');
    }

    default:
      return recipients.map(formatClientRecipient).join(', ');
  }
}
