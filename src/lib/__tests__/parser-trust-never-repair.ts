import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipients, isLikelyEmail } from '../parser';

describe('SendPrep Parser Trust Boundary --- Never Repair Invariants', () => {
  describe('A: Consecutive-dot domain must not be Ready', () => {
    it('[TRUST-A1] alexander.schulz@gmx..de is NOT classified as Ready', () => {
      const res = parseRecipients('alexander.schulz@gmx..de');
      assert.equal(res.recipients.length, 0, 'Malformed address must not appear in Ready recipients');
      assert.ok(res.reviewItems.length > 0, 'Must produce a review item');
      const item = res.reviewItems[0];
      assert.ok(
        item.reason === 'malformed_domain' || item.reason === 'malformed_email',
        `Expected malformed_domain or malformed_email, got: ${item.reason}`
      );
    });

    it('[TRUST-A2] original address text is preserved in review item - no gmx.de generated', () => {
      const res = parseRecipients('alexander.schulz@gmx..de');
      assert.equal(res.recipients.length, 0);
      const invented = res.recipients.find((r) => r.email === 'alexander.schulz@gmx.de');
      assert.equal(invented, undefined, 'Must never generate the repaired gmx.de address');
      const item = res.reviewItems[0];
      assert.ok(
        item.originalText.includes('gmx..de') || (item.suggestedEmail ?? '').includes('gmx..de'),
        'Review item must preserve the original consecutive-dot address'
      );
    });

    it('[TRUST-A3] isLikelyEmail rejects consecutive dots in domain', () => {
      assert.equal(isLikelyEmail('a@gmx..de'), false);
      assert.equal(isLikelyEmail('a@foo..bar.com'), false);
      assert.equal(isLikelyEmail('a@..de'), false);
    });

    it('[TRUST-A4] isLikelyEmail still accepts normal addresses with dots', () => {
      assert.equal(isLikelyEmail('a@sub.example.com'), true);
      assert.equal(isLikelyEmail('a.b.c@example.co.uk'), true);
    });

    it('[TRUST-A5] malformed domain with display name is also flagged, not Ready', () => {
      const res = parseRecipients('Alexander Schulz <alexander.schulz@gmx..de>');
      assert.equal(res.recipients.length, 0, 'Display-name wrapped malformed address must not be Ready');
      assert.ok(res.reviewItems.length > 0);
    });
  });

  describe('B: No TLD repair', () => {
    it('[TRUST-B1] person@example.con is never rewritten to example.com', () => {
      const res = parseRecipients('person@example.con');
      const hasRepaired = res.recipients.some((r) => r.email === 'person@example.com');
      assert.equal(hasRepaired, false, 'Must never output person@example.com');
      const hasRepairedInReview = res.reviewItems.some((r) =>
        (r.suggestedEmail ?? '').endsWith('@example.com')
      );
      assert.equal(hasRepairedInReview, false, 'Review item must not suggest person@example.com');
    });

    it('[TRUST-B2] gmial.com is preserved verbatim - no gmail.com invented', () => {
      const res = parseRecipients('user@gmial.com');
      const hasGmail = res.recipients.some((r) => r.email === 'user@gmail.com');
      assert.equal(hasGmail, false, 'Must never autocorrect gmial.com to gmail.com');
    });
  });

  describe('C: No missing-syntax repair', () => {
    it('[TRUST-C1] text without @ does not produce any invented recipient address', () => {
      const res = parseRecipients('notanemail');
      assert.equal(res.recipients.length, 0, 'No invented recipient from bare text');
    });

    it('[TRUST-C2] address with missing domain (trailing @) does not produce invented recipient', () => {
      const res = parseRecipients('user@');
      assert.equal(res.recipients.length, 0);
      assert.ok(res.reviewItems.length > 0);
      assert.equal(res.reviewItems[0].reason, 'missing_domain');
    });

    it('[TRUST-C3] leading-dot domain is flagged - no repair', () => {
      const res = parseRecipients('user@.example.com');
      assert.equal(res.recipients.length, 0, 'Leading-dot domain must not be Ready');
      assert.ok(res.reviewItems.length > 0);
      const invented = res.recipients.find((r) => r.email === 'user@example.com');
      assert.equal(invented, undefined);
    });

    it('[TRUST-C4] trailing-dot domain is flagged - no repair', () => {
      const res = parseRecipients('user@example.com.');
      assert.equal(res.recipients.length, 0, 'Trailing-dot domain must not be Ready');
      assert.ok(res.reviewItems.length > 0);
    });
  });

  describe('D: Redundant identical mailto representation', () => {
    it('[TRUST-D1] "support@web-app.com [mailto:support@web-app.com]" yields one Ready recipient', () => {
      const res = parseRecipients('support@web-app.com [mailto:support@web-app.com]');
      assert.equal(res.recipients.length, 1, 'Must yield exactly one recipient');
      assert.equal(res.recipients[0].email, 'support@web-app.com');
      const multipleAddressesItem = res.reviewItems.find((r) => r.reason === 'multiple_addresses_in_segment');
      assert.equal(multipleAddressesItem, undefined, 'Must NOT create a Multiple Addresses review item');
    });

    it('[TRUST-D2] case-insensitive identical mailto still collapses', () => {
      const res = parseRecipients('Support@Web-App.com [mailto:support@web-app.com]');
      assert.equal(res.recipients.length, 1);
      assert.equal(res.recipients[0].email, 'Support@Web-App.com', 'Original casing of first occurrence preserved');
    });

    it('[TRUST-D3] output address is the original, not a rewritten form', () => {
      const res = parseRecipients('support@web-app.com [mailto:support@web-app.com]');
      assert.equal(res.recipients[0].email, 'support@web-app.com');
    });
  });

  describe('E: Genuine multiple-address ambiguity', () => {
    it('[TRUST-E1] two genuinely different addresses space-separated remain in Review', () => {
      const res = parseRecipients('alice@example.com bob@example.com');
      assert.equal(res.reviewItems.length, 1);
      assert.equal(res.reviewItems[0].reason, 'multiple_addresses_in_segment');
      assert.equal(res.recipients.length, 0, 'Ambiguous segment must not silently produce Ready recipients');
    });

    it('[TRUST-E2] differing [mailto:] addresses are treated as ambiguous — not collapsed, not silently admitted', () => {
      const res = parseRecipients('alice@example.com [mailto:bob@example.com]');
      // IDENTICAL REPRESENTATIONS MAY COLLAPSE. DIFFERENT ADDRESSES MUST REMAIN AMBIGUOUS.
      // alice@example.com != bob@example.com, so no collapse must occur.
      assert.equal(res.recipients.length, 0, 'Neither address may be silently admitted as Ready');
      assert.equal(res.reviewItems.length, 1, 'Must produce exactly one review item');
      assert.equal(res.reviewItems[0].reason, 'multiple_addresses_in_segment', 'Must flag as multiple addresses, not collapse');
      // Prove neither specific address silently escaped into Ready
      const readyEmails = res.recipients.map((r) => r.normalizedEmail);
      assert.equal(readyEmails.includes('alice@example.com'), false, 'alice@example.com must not be silently admitted');
      assert.equal(readyEmails.includes('bob@example.com'), false, 'bob@example.com must not be silently admitted');
    });
  });

  describe('F: Deduplication regression', () => {
    it('[TRUST-F1] case-insensitive duplicate is still counted as one recipient', () => {
      const res = parseRecipients('user@example.com, USER@example.com, User@EXAMPLE.COM');
      assert.equal(res.recipients.length, 1);
      assert.equal(res.duplicatesCount, 2);
    });

    it('[TRUST-F2] Gmail dot variants are preserved as distinct (not collapsed)', () => {
      const res = parseRecipients('u.ser@gmail.com, user@gmail.com');
      assert.equal(res.recipients.length, 2, 'Gmail dot variants must not be collapsed');
    });

    it('[TRUST-F3] similar-looking but distinct addresses are never merged', () => {
      const inputs = [
        'john@example.com\njon@example.com',
        'john@example.com\njohn@example.co',
        'john+work@example.com\njohn@example.com',
      ];
      for (const input of inputs) {
        const res = parseRecipients(input);
        assert.equal(res.recipients.length, 2, `Expected 2 distinct recipients for: ${input}`);
      }
    });
  });

  describe('G: Display name conflict regression', () => {
    it('[TRUST-G1] conflicting display names still produce review item', () => {
      const res = parseRecipients('Alice <user@example.com>, Bob <user@example.com>');
      assert.equal(res.recipients.length, 1);
      assert.equal(res.reviewItems.length, 1);
      assert.equal(res.reviewItems[0].reason, 'conflicting_display_names');
    });
  });

  describe('H: Unparsed input safety', () => {
    it('[TRUST-H1] prose text adjacent to valid email produces review item - no silent loss', () => {
      const res = parseRecipients('Please add:\nalice@example.com\nThank you.');
      assert.equal(res.recipients.length, 1);
      assert.equal(res.recipients[0].email, 'alice@example.com');
      assert.ok(res.reviewItems.length >= 2, 'Both prose lines must appear in review');
    });

    it('[TRUST-H2] malformed address text is preserved in review verbatim', () => {
      const res = parseRecipients('alexander.schulz@gmx..de');
      assert.ok(res.reviewItems.length > 0);
      const item = res.reviewItems[0];
      const preserved = item.originalText.includes('gmx..de') || (item.suggestedEmail ?? '').includes('gmx..de');
      assert.ok(preserved, 'Original malformed text must be preserved in the review item');
    });
  });
});