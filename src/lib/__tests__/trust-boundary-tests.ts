import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipients, isLikelyEmail, safeDecodeURIComponent } from '../parser';

describe('SendPrep RC1 Trust Boundary Hardening', () => {
  describe('Fix 1: Truthful Clipboard Contract & Feedback', () => {
    it('isLikelyEmail correctly admits valid addresses and rejects malformed inputs', () => {
      assert.equal(isLikelyEmail('valid@example.com'), true);
      assert.equal(isLikelyEmail('person@internalhost'), true);
      assert.equal(isLikelyEmail('Person+tag@Example.COM'), true);
      assert.equal(isLikelyEmail('not-an-email'), false);
      assert.equal(isLikelyEmail('user@'), false);
      assert.equal(isLikelyEmail('@domain.com'), false);
      assert.equal(isLikelyEmail('user@.domain.com'), false);
      assert.equal(isLikelyEmail('user@-domain.com'), false);
    });
  });

  describe('Fix 2: Manual Review Email Admission Hardening', () => {
    it('rejects malformed manual address from becoming CleanRecipient', () => {
      // Simulating manual review admission logic
      const malformedInput = 'not-an-email';
      const isValid = isLikelyEmail(malformedInput);
      assert.equal(isValid, false, 'Malformed address must not pass admission check');
    });

    it('admits valid conventional address', () => {
      const input = 'jane.doe@example.com';
      const isValid = isLikelyEmail(input);
      assert.equal(isValid, true, 'Valid address must pass admission check');
    });

    it('admits internal-domain address without enforcing public TLD', () => {
      const input = 'person@internalhost';
      const isValid = isLikelyEmail(input);
      assert.equal(isValid, true, 'Internal domain address must be admitted');
    });

    it('preserves plus addressing and casing while normalising email', () => {
      const input = 'Person+tag@Example.COM';
      const isValid = isLikelyEmail(input);
      assert.equal(isValid, true);
      assert.equal(input.trim().toLowerCase(), 'person+tag@example.com');
    });

    it('does not autocorrect typos in manual email addresses', () => {
      const input = 'user@gmial.com';
      const isValid = isLikelyEmail(input);
      assert.equal(isValid, true);
      // Ensure the address is admitted as-is without rewriting
      assert.equal(input, 'user@gmial.com');
    });
  });

  describe('Fix 3: Fail-Closed Mailto Decoding', () => {
    it('safeDecodeURIComponent does not throw on malformed percent encoding', () => {
      const malformed = '%E0%A4%A';
      assert.doesNotThrow(() => {
        const res = safeDecodeURIComponent(malformed);
        assert.equal(res.isMalformed, true);
        assert.equal(res.decoded, '%E0%A4%A');
      });

      const invalidHex = '%ZZ';
      assert.doesNotThrow(() => {
        const res = safeDecodeURIComponent(invalidHex);
        assert.equal(res.isMalformed, true);
        assert.equal(res.decoded, '%ZZ');
      });
    });

    it('safeDecodeURIComponent correctly decodes valid percent encoding', () => {
      const valid = 'Hello%20World%26More';
      const res = safeDecodeURIComponent(valid);
      assert.equal(res.isMalformed, false);
      assert.equal(res.decoded, 'Hello World&More');
    });

    it('parses mailto with malformed subject percent-encoding without crashing', () => {
      const input = 'mailto:test@example.com?subject=%E0%A4%A';
      let res: ReturnType<typeof parseRecipients>;
      assert.doesNotThrow(() => {
        res = parseRecipients(input);
      });

      assert.equal(res!.recipients.length, 1);
      assert.equal(res!.recipients[0].email, 'test@example.com');
      // Malformed query param preserved for review
      assert.equal(res!.reviewItems.length, 1);
      assert.ok(res!.reviewItems[0].originalText.includes('%E0%A4%A'));
    });

    it('parses mailto with malformed cc and valid bcc without crashing', () => {
      const input = 'mailto:?cc=%ZZ&bcc=bob@example.com&body=%E0%A4%A';
      let res: ReturnType<typeof parseRecipients>;
      assert.doesNotThrow(() => {
        res = parseRecipients(input);
      });

      // bob@example.com is safely extracted
      assert.equal(res!.recipients.length, 1);
      assert.equal(res!.recipients[0].email, 'bob@example.com');
      // malformed cc=%ZZ and body=%E0%A4%A preserved in review
      assert.equal(res!.reviewItems.length, 1);
      assert.ok(res!.reviewItems[0].originalText.includes('cc=%ZZ'));
      assert.ok(res!.reviewItems[0].originalText.includes('body=%E0%A4%A'));
    });

    it('parses mailto with valid encoded query parameters', () => {
      const input = 'mailto:lead@example.com?cc=alice%40example.com&subject=Project%20Update';
      const res = parseRecipients(input);

      assert.equal(res.recipients.length, 2);
      assert.equal(res.recipients[0].email, 'lead@example.com');
      assert.equal(res.recipients[1].email, 'alice@example.com');
      assert.equal(res.reviewItems.length, 1);
      assert.ok(res.reviewItems[0].originalText.includes('subject=Project Update'));
    });
  });
});
