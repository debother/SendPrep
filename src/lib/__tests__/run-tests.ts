import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipients } from '../parser';
import { formatRecipients } from '../formatter';

describe('SendPrep Core Parser & Regression Invariants', () => {
  // Requirement 1 & Fixture: Plain address
  it('parses a single plain email address', () => {
    const res = parseRecipients('max@example.com');
    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].email, 'max@example.com');
    assert.equal(res.recipients[0].displayName, undefined);
    assert.equal(res.reviewItems.length, 0);
  });

  // Requirement 1 & Fixture: Name <email>
  it('parses standard Name <email> recipient', () => {
    const res = parseRecipients('Max Mustermann <max@example.com>');
    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].email, 'max@example.com');
    assert.equal(res.recipients[0].displayName, 'Max Mustermann');
    assert.equal(res.reviewItems.length, 0);
  });

  // Requirement 8 & Fixture: Quoted commas inside display names
  it('does not split display names with quoted commas', () => {
    const input = '"Doe, John" <john@example.com>, "Smith, Jane" <jane@example.org>';
    const res = parseRecipients(input);
    assert.equal(res.recipients.length, 2);
    assert.equal(res.recipients[0].displayName, 'Doe, John');
    assert.equal(res.recipients[0].email, 'john@example.com');
    assert.equal(res.recipients[1].displayName, 'Smith, Jane');
    assert.equal(res.recipients[1].email, 'jane@example.org');
  });

  // Fixture: Parenthetical display name email (Name)
  it('parses parenthetical display names', () => {
    const res = parseRecipients('john@example.com (John Doe)');
    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].email, 'john@example.com');
    assert.equal(res.recipients[0].displayName, 'John Doe');
  });

  // Amendment 2 & Fixture: mailto: prefix with query parameters
  it('parses mailto: links and extracts recipient query params while preserving non-recipient params', () => {
    const res = parseRecipients('mailto:max@example.com?cc=erika@example.com&subject=Hello%20World');
    assert.equal(res.recipients.length, 2);
    assert.deepEqual(res.recipients.map(r => r.email), ['max@example.com', 'erika@example.com']);
    // Non-recipient query parameter (?subject=Hello World) is preserved in Needs Review to satisfy Completeness Invariant
    assert.equal(res.reviewItems.length, 1);
    assert.ok(res.reviewItems[0].originalText.includes('subject=Hello World'));
  });

  // Fixture: Mixed separators (comma, semicolon, newline, tab)
  it('handles mixed separators seamlessly', () => {
    const input = 'a@example.com; b@example.com,\nc@example.com\r\nd@example.com\te@example.com';
    const res = parseRecipients(input);
    assert.equal(res.recipients.length, 5);
    const emails = res.recipients.map(r => r.email);
    assert.deepEqual(emails, ['a@example.com', 'b@example.com', 'c@example.com', 'd@example.com', 'e@example.com']);
  });

  // Fixture: Outlook-style headers (To:, Cc:, Bcc:)
  it('parses Outlook-style headers and ignores standalone header markers', () => {
    const input = `To: Max Mustermann <max@example.de>;
Erika <erika@example.de>

Cc: Peter Example <peter@example.com>
Bcc: intern-archiv@unternehmensberatung.de`;

    const res = parseRecipients(input);
    assert.equal(res.recipients.length, 4);
    assert.deepEqual(res.recipients.map(r => r.email), [
      'max@example.de',
      'erika@example.de',
      'peter@example.com',
      'intern-archiv@unternehmensberatung.de',
    ]);
    assert.equal(res.reviewItems.length, 0);
  });

  // Fixture: Spreadsheet paste (tab-separated Name TAB Email)
  it('parses spreadsheet tab-separated input', () => {
    const input = `Max Mustermann\tmax@example.de
Erika Musterfrau\terika@example.de`;
    const res = parseRecipients(input);
    assert.equal(res.recipients.length, 2);
    assert.equal(res.recipients[0].displayName, 'Max Mustermann');
    assert.equal(res.recipients[0].email, 'max@example.de');
    assert.equal(res.recipients[1].displayName, 'Erika Musterfrau');
    assert.equal(res.recipients[1].email, 'erika@example.de');
  });

  // Requirement 4 & Fixture: Duplicate casing collapse
  it('collapses duplicate emails with different casing and tracks occurrences', () => {
    const input = 'MAX@example.com, max@example.com,  Max@example.com ';
    const res = parseRecipients(input);
    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].email, 'MAX@example.com'); // Preserves first seen casing
    assert.equal(res.recipients[0].occurrenceCount, 3);
    assert.equal(res.duplicatesCount, 2);
    assert.equal(res.reviewItems.length, 0);
  });

  // Requirement 5: Provider-specific assumptions must NOT collapse
  it('does NOT collapse different emails or Gmail dot variants', () => {
    const input = 'john.smith@example.com, johnsmith@example.com, user+tag@example.com, user@example.com';
    const res = parseRecipients(input);
    assert.equal(res.recipients.length, 4);
    assert.equal(res.duplicatesCount, 0);
  });

  // Requirement 7: Never autocorrects typos
  it('never autocorrects email addresses like gmial.com', () => {
    const res = parseRecipients('max@gmial.com');
    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].email, 'max@gmial.com');
  });

  // Amendment 1: Conservative email syntax does not reject internal domains
  it('accepts intranet/internal domains without enforcing rigid TLD requirements', () => {
    const res = parseRecipients('admin@internalhost');
    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].email, 'admin@internalhost');
  });

  // Requirement 6 & Fixture: Conflicting display names require review
  it('flags conflicting display names for review without guessing', () => {
    const input = `Max Mustermann <max@example.com>
Dr. Maximilian Mustermann – Legal <max@example.com>`;
    const res = parseRecipients(input);

    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].occurrenceCount, 2);
    assert.equal(res.duplicatesCount, 1);

    // Must have a review item for conflicting display names
    assert.equal(res.reviewItems.length, 1);
    assert.equal(res.reviewItems[0].reason, 'conflicting_display_names');
    assert.ok(res.reviewItems[0].displayNameOptions?.includes('Max Mustermann'));
    assert.ok(res.reviewItems[0].displayNameOptions?.includes('Dr. Maximilian Mustermann – Legal'));
  });

  // Duplicate with same or compatible display name merges cleanly
  it('merges duplicate with identical display name cleanly without review item', () => {
    const input = 'Max Mustermann <max@example.com>, Max Mustermann <max@example.com>, <max@example.com>';
    const res = parseRecipients(input);
    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].displayName, 'Max Mustermann');
    assert.equal(res.recipients[0].occurrenceCount, 3);
    assert.equal(res.reviewItems.length, 0);
  });

  // Multiple (3+) conflicting display names
  it('identifies 3+ distinct conflicting names for one email address', () => {
    const input = `Max <max@example.com>, Maximilian Mustermann <max@example.com>, Max M. <max@example.com>`;
    const res = parseRecipients(input);
    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].occurrenceCount, 3);
    assert.equal(res.reviewItems.length, 1);
    assert.equal(res.reviewItems[0].reason, 'conflicting_display_names');
    assert.equal(res.reviewItems[0].displayNameOptions?.length, 3);
  });

  // Fixture: Broken angle brackets
  it('flags broken angle brackets for review', () => {
    const res = parseRecipients('Max Mustermann <max@example.com');
    assert.equal(res.recipients.length, 0);
    assert.equal(res.reviewItems.length, 1);
    assert.equal(res.reviewItems[0].reason, 'broken_angle_brackets');
    assert.equal(res.reviewItems[0].suggestedEmail, 'max@example.com');
    assert.equal(res.reviewItems[0].suggestedName, 'Max Mustermann');
  });

  // Fixture: Missing @ and Missing Domain
  it('flags missing @ or missing domain', () => {
    const res1 = parseRecipients('max.example.com');
    assert.equal(res1.reviewItems[0].reason, 'unparsed_text');

    const res2 = parseRecipients('max@');
    assert.equal(res2.reviewItems[0].reason, 'missing_domain');
  });

  // Fixture: Multiple addresses in one unseparated segment
  it('detects multiple addresses in a single segment without delimiter', () => {
    const res = parseRecipients('alice@example.com bob@example.com');
    assert.equal(res.reviewItems.length, 1);
    assert.equal(res.reviewItems[0].reason, 'multiple_addresses_in_segment');
  });

  // Fixture: Unicode display names
  it('handles Unicode display names properly', () => {
    const input = 'José García <jose@example.com>, Müller <muller@example.de>, 李明 <ming@example.com>';
    const res = parseRecipients(input);
    assert.equal(res.recipients.length, 3);
    assert.equal(res.recipients[0].displayName, 'José García');
    assert.equal(res.recipients[1].displayName, 'Müller');
    assert.equal(res.recipients[2].displayName, '李明');
  });

  // Security: HTML and script injection strings inside display names
  it('safely handles HTML/script-like display names without corrupting output', () => {
    const input = '<script>alert("XSS")</script> <xss@example.com>';
    const res = parseRecipients(input);
    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].email, 'xss@example.com');
    assert.equal(res.recipients[0].displayName, '<script>alert("XSS")</script>');

    // Formatting with special chars wraps in quotes
    const formatted = formatRecipients(res.recipients, 'standard');
    assert.ok(formatted.includes('<xss@example.com>'));
  });

  // Requirement 2 & 3 & 9: Completeness invariant (No silent disappearance)
  it('guarantees completeness invariant: non-recipient prose becomes review item', () => {
    const input = `Please find the list of attendees below:
alice@example.com
Also note that bob is away.`;
    const res = parseRecipients(input);

    assert.equal(res.recipients.length, 1);
    assert.equal(res.recipients[0].email, 'alice@example.com');

    // Both prose lines must be captured as review items so nothing silently disappears
    assert.ok(res.reviewItems.length >= 2);
    assert.ok(res.reviewItems.some(r => r.originalText.includes('attendees')));
    assert.ok(res.reviewItems.some(r => r.originalText.includes('bob is away')));
  });

  // Empty and whitespace input
  it('returns empty result for empty or whitespace-only inputs', () => {
    assert.equal(parseRecipients('').recipients.length, 0);
    assert.equal(parseRecipients('   \n\t  ').recipients.length, 0);
  });

  // Large input batch performance
  it('efficiently handles large batches of 500+ recipients', () => {
    const entries: string[] = [];
    for (let i = 0; i < 500; i++) {
      entries.push(`User ${i} <user${i}@example.com>`);
    }
    // Add duplicates
    entries.push('User 0 <user0@example.com>');
    entries.push('User 1 <user1@example.com>');

    const startTime = performance.now();
    const res = parseRecipients(entries.join(';\n'));
    const elapsed = performance.now() - startTime;

    assert.equal(res.recipients.length, 500);
    assert.equal(res.duplicatesCount, 2);
    assert.ok(elapsed < 200, `Parsing 500 recipients took ${elapsed}ms (expected < 200ms)`);
  });

  // Output formatting tests
  describe('Output Formatting', () => {
    const sampleRecipients = [
      {
        id: '1',
        email: 'john@example.com',
        normalizedEmail: 'john@example.com',
        displayName: 'Doe, John',
        occurrences: [],
        occurrenceCount: 1,
      },
      {
        id: '2',
        email: 'alice@example.com',
        normalizedEmail: 'alice@example.com',
        displayName: 'Alice Smith',
        occurrences: [],
        occurrenceCount: 1,
      },
      {
        id: '3',
        email: 'plain@example.com',
        normalizedEmail: 'plain@example.com',
        occurrences: [],
        occurrenceCount: 1,
      },
    ];

    it('formats for Outlook (semicolon + space)', () => {
      const formatted = formatRecipients(sampleRecipients, 'outlook');
      assert.equal(formatted, '"Doe, John" <john@example.com>; Alice Smith <alice@example.com>; plain@example.com');
    });

    it('formats for Gmail / Standard (comma + space)', () => {
      const formatted = formatRecipients(sampleRecipients, 'standard');
      assert.equal(formatted, '"Doe, John" <john@example.com>, Alice Smith <alice@example.com>, plain@example.com');
    });

    it('formats for Addresses Only', () => {
      const formatted = formatRecipients(sampleRecipients, 'addresses_only');
      assert.equal(formatted, 'john@example.com\nalice@example.com\nplain@example.com');
    });

    it('formats for CSV Text with proper escaping', () => {
      const formatted = formatRecipients(sampleRecipients, 'csv');
      const expected = `Name,Email\n"Doe, John",john@example.com\nAlice Smith,alice@example.com\n,plain@example.com`;
      assert.equal(formatted, expected);
    });
  });

  // Requirement 12: Round-trip re-parsing invariant
  it('round-trips SendPrep standard output through parser producing exact same recipients', () => {
    const initialInput = `
      Max Mustermann <max@example.de>;
      "Smith, Jane" <jane@example.org>,
      mailto:info@example.net
      plain@example.com
    `;
    const firstPass = parseRecipients(initialInput);
    assert.equal(firstPass.recipients.length, 4);

    const standardOutput = formatRecipients(firstPass.recipients, 'standard');
    const secondPass = parseRecipients(standardOutput);

    assert.equal(secondPass.recipients.length, 4);
    assert.equal(secondPass.reviewItems.length, 0);
    assert.deepEqual(
      secondPass.recipients.map(r => ({ email: r.email, name: r.displayName })),
      firstPass.recipients.map(r => ({ email: r.email, name: r.displayName }))
    );

    const outlookOutput = formatRecipients(firstPass.recipients, 'outlook');
    const thirdPass = parseRecipients(outlookOutput);
    assert.equal(thirdPass.recipients.length, 4);
    assert.equal(thirdPass.reviewItems.length, 0);
  });
});
