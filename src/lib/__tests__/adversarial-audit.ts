import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseRecipients } from '../parser';
import { formatRecipients } from '../formatter';

export interface AuditRecord {
  id: string;
  name: string;
  input: string;
  expectedRecipients: number;
  expectedDuplicates: number;
  expectedReviewItems: number;
  expectedRecipientEmails: string[];
}

export const ADVERSARIAL_CORPUS: AuditRecord[] = [
  {
    id: 'ADV-01',
    name: 'Mixed Outlook Header with CC/BCC, semicolons, and German umlauts',
    input: `From: Jörg Müller <joerg.mueller@unternehmensberatung.de>
To: Dr. Bettina Schröder <b.schroeder@klinikum-berlin.de>; Jürgen von der Vogelweide <juergen@alt-deutsch.org>
Cc: "Müller-Lüdenscheidt, Dr. h.c." <m-l@kanzlei.de>; info@kanzlei.de
Bcc: intern-archiv@unternehmensberatung.de`,
    expectedRecipients: 6,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: [
      'joerg.mueller@unternehmensberatung.de',
      'b.schroeder@klinikum-berlin.de',
      'juergen@alt-deutsch.org',
      'm-l@kanzlei.de',
      'info@kanzlei.de',
      'intern-archiv@unternehmensberatung.de',
    ],
  },
  {
    id: 'ADV-02',
    name: 'Copied Gmail thread with quotes, angle brackets, and relative timestamps',
    input: `On Mon, Aug 24, 2026 at 3:45 PM "O'Connor, Siobhán" <siobhan.oconnor@dublin-tech.ie> wrote:
> Thanks for the update. Adding the Dublin team:
"Liam O'Sullivan" <liam@dublin-tech.ie>, Sorcha Ní Dhómhnaill <sorcha@dublin-tech.ie>`,
    expectedRecipients: 3,
    expectedDuplicates: 0,
    expectedReviewItems: 3, // Prose lines On Mon, Aug 24, and > Thanks for...
    expectedRecipientEmails: [
      'siobhan.oconnor@dublin-tech.ie',
      'liam@dublin-tech.ie',
      'sorcha@dublin-tech.ie',
    ],
  },
  {
    id: 'ADV-03',
    name: 'Excel copy with Name TAB Email, empty cells, and Department column',
    input: `Jean-Luc Picard\tcaptain@enterprise.space\tCommand
William T. Riker\tnum1@enterprise.space\tBridge
Geordi La Forge\tgeordi@enterprise.space\tEngineering`,
    expectedRecipients: 3,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: [
      'captain@enterprise.space',
      'num1@enterprise.space',
      'geordi@enterprise.space',
    ],
  },
  {
    id: 'ADV-04',
    name: 'Multiple recipient lists pasted together with casing differences and duplicates',
    input: `ALICE@example.org, Bob Smith <bob@example.org>
alice@example.org; "Smith, Bob" <bob@example.org>
Alice <Alice@Example.Org>`,
    expectedRecipients: 2,
    expectedDuplicates: 3,
    expectedReviewItems: 1, // Bob has conflicting names: "Bob Smith" vs "Smith, Bob"
    expectedRecipientEmails: [
      'ALICE@example.org',
      'bob@example.org',
    ],
  },
  {
    id: 'ADV-05',
    name: 'Display names containing semicolons, hyphens, and titles',
    input: `"Smith; Jane - Vice President" <jane.smith@corp.com>; "Finance; Tax Dept" <tax@corp.com>`,
    expectedRecipients: 2,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: [
      'jane.smith@corp.com',
      'tax@corp.com',
    ],
  },
  {
    id: 'ADV-06',
    name: 'Multilingual and Non-Latin scripts (CJK, Arabic, Cyrillic, Nordic)',
    input: `李明 <ming.li@beijing-tech.cn>,
山田太郎 <yamada@tokyo-group.jp>,
أحمد حسam <ahmed@cairo-net.eg>,
Иван Петров <ivan@moscow-trade.ru>,
Kjeld Nørgaard <kjeld@aarhus-design.dk>`,
    expectedRecipients: 5,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: [
      'ming.li@beijing-tech.cn',
      'yamada@tokyo-group.jp',
      'ahmed@cairo-net.eg',
      'ivan@moscow-trade.ru',
      'kjeld@aarhus-design.dk',
    ],
  },
  {
    id: 'ADV-07',
    name: 'Complex Mailto URI with to, cc, bcc, and unhandled body parameter',
    input: `mailto:project-lead@office.org?to=assistant@office.org&cc=counsel@office.org&bcc=audit@office.org&subject=Quarterly%20Report&body=Attached%20please%20find`,
    expectedRecipients: 4,
    expectedDuplicates: 0,
    expectedReviewItems: 1, // ?subject=...&body=... non-recipient params in Needs Review
    expectedRecipientEmails: [
      'project-lead@office.org',
      'assistant@office.org',
      'counsel@office.org',
      'audit@office.org',
    ],
  },
  {
    id: 'ADV-08',
    name: 'Accidental email signature pasted with social handles and phone numbers',
    input: `Elena Rostova <elena@logistics.eu>
--
Best regards,
Elena Rostova | Logistics Coordinator
Direct: +49 30 12345678
Follow us on Twitter: @LogisticsEU
Website: https://logistics.eu`,
    expectedRecipients: 1,
    expectedDuplicates: 0,
    expectedReviewItems: 6, // 6 non-recipient signature fragments captured for review
    expectedRecipientEmails: ['elena@logistics.eu'],
  },
  {
    id: 'ADV-09',
    name: 'Malformed brackets: unclosed angle brackets, inverted brackets, extra spaces',
    input: `Unclosed User <unclosed@example.com
Valid Guy <valid@example.com>
Broken Right unmatched@example.com>`,
    expectedRecipients: 1,
    expectedDuplicates: 0,
    expectedReviewItems: 2, // 2 broken bracket lines captured in Needs Review
    expectedRecipientEmails: ['valid@example.com'],
  },
  {
    id: 'ADV-10',
    name: 'Multiple addresses glued together without comma or semicolon (space separated)',
    input: `first@dept.gov second@dept.gov third@dept.gov`,
    expectedRecipients: 0,
    expectedDuplicates: 0,
    expectedReviewItems: 1, // multi-address segment flagged
    expectedRecipientEmails: [],
  },
  {
    id: 'ADV-11',
    name: 'Whitespace chaos, mixed CRLF/LF, leading and trailing tabs, empty lines',
    input: `   \r\n\t   "Clean User"   <clean@example.com>   \r\n\r\n\t\t\n   Second User <second@example.com>  \t\r\n  `,
    expectedRecipients: 2,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: ['clean@example.com', 'second@example.com'],
  },
  {
    id: 'ADV-12',
    name: 'Internal corporate domain names without standard public TLDs',
    input: `dev-build@jenkins-ci.internal, db-admin@sql01.corp, sysops@app-srv02.lan`,
    expectedRecipients: 3,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: [
      'dev-build@jenkins-ci.internal',
      'db-admin@sql01.corp',
      'sysops@app-srv02.lan',
    ],
  },
  {
    id: 'ADV-13',
    name: 'XSS Injection and HTML markup payload in display name',
    input: `<img src=x onerror=alert('xss')> <security-test@safe.org>, "<b>Bold Name</b>" <bold@safe.org>`,
    expectedRecipients: 2,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: ['security-test@safe.org', 'bold@safe.org'],
  },
  {
    id: 'ADV-14',
    name: 'Tag/plus addressing and dot distinction preserved without mutation',
    input: `user+newsletter@gmail.com, user+receipts@gmail.com, first.last@gmail.com, firstlast@gmail.com`,
    expectedRecipients: 4,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: [
      'user+newsletter@gmail.com',
      'user+receipts@gmail.com',
      'first.last@gmail.com',
      'firstlast@gmail.com',
    ],
  },
  {
    id: 'ADV-15',
    name: 'False-Positive strings: Twitter handles, GitHub @mentions, package version numbers',
    input: `Check with @support or @john regarding version@2.1.4 release`,
    expectedRecipients: 0,
    expectedDuplicates: 0,
    expectedReviewItems: 1, // Captured in review, NOT parsed as recipient
    expectedRecipientEmails: [],
  },
  {
    id: 'ADV-16',
    name: 'Pasted meeting invite summary with mixed headers and bullet points',
    input: `Meeting: Q4 Strategy Review
Organizer: Chief Officer <chief@hq.net>
Required: Manager A <mgr.a@hq.net>; Manager B <mgr.b@hq.net>
Optional: intern@hq.net
Agenda: Review deliverables`,
    expectedRecipients: 4,
    expectedDuplicates: 0,
    expectedReviewItems: 2, // "Meeting: Q4 Strategy Review" & "Agenda: Review deliverables"
    expectedRecipientEmails: ['chief@hq.net', 'mgr.a@hq.net', 'mgr.b@hq.net', 'intern@hq.net'],
  },
  {
    id: 'ADV-17',
    name: 'Pasted Apple Mail copy with commas in names and quotes',
    input: `"von Blomberg, Axel Freiherr" <axel@blomberg.de>, "D'Souza, Anthony" <anthony@dsouza.in>`,
    expectedRecipients: 2,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: ['axel@blomberg.de', 'anthony@dsouza.in'],
  },
  {
    id: 'ADV-18',
    name: 'Extreme length recipient list (1000 addresses) without mutation or loss',
    input: Array.from({ length: 1000 }, (_, i) => `Colleague ${i} <colleague_${i}@enterprise.com>`).join(';\n'),
    expectedRecipients: 1000,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: ['colleague_0@enterprise.com', 'colleague_999@enterprise.com'],
  },
  {
    id: 'ADV-19',
    name: 'Triple duplicate with 3 conflicting title variations',
    input: `Maria Garcia <m.garcia@global.es>
Maria Garcia - Regional Director <m.garcia@global.es>
Dr. Maria Garcia, PhD <m.garcia@global.es>`,
    expectedRecipients: 1,
    expectedDuplicates: 2,
    expectedReviewItems: 2, // 1 conflict item + 1 review item for unquoted name prefix
    expectedRecipientEmails: ['m.garcia@global.es'],
  },
  {
    id: 'ADV-20',
    name: 'Parenthetical display name containing comma and special symbols',
    input: `compliance@bank.ch (Compliance & Anti-Money Laundering, Zurich)`,
    expectedRecipients: 1,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: ['compliance@bank.ch'],
  },
  {
    id: 'ADV-21',
    name: 'Email with hyphens, numbers, dots, and underscores in local part',
    input: `first.m_last-99@sub-domain.example-corp.co.uk`,
    expectedRecipients: 1,
    expectedDuplicates: 0,
    expectedReviewItems: 0,
    expectedRecipientEmails: ['first.m_last-99@sub-domain.example-corp.co.uk'],
  },
  {
    id: 'ADV-22',
    name: 'CSV style paste with quoted fields and commas',
    input: `"García, José",jose.garcia@empresa.es\n"Müller, Stefan",stefan.mueller@firma.de`,
    expectedRecipients: 2,
    expectedDuplicates: 0,
    expectedReviewItems: 2, // Separated quoted name headers captured in Needs Review
    expectedRecipientEmails: ['jose.garcia@empresa.es', 'stefan.mueller@firma.de'],
  }
];

describe('Adversarial Trust & Accounting Audit', () => {
  for (const sample of ADVERSARIAL_CORPUS) {
    it(`[${sample.id}] ${sample.name}`, () => {
      const res = parseRecipients(sample.input);

      // Verify recipient count
      assert.equal(
        res.recipients.length,
        sample.expectedRecipients,
        `[${sample.id}] Recipient count mismatch: expected ${sample.expectedRecipients}, got ${res.recipients.length}`
      );

      // Verify duplicate count
      assert.equal(
        res.duplicatesCount,
        sample.expectedDuplicates,
        `[${sample.id}] Duplicate count mismatch: expected ${sample.expectedDuplicates}, got ${res.duplicatesCount}`
      );

      // Verify review items count
      assert.equal(
        res.reviewItems.length,
        sample.expectedReviewItems,
        `[${sample.id}] Review items count mismatch: expected ${sample.expectedReviewItems}, got ${res.reviewItems.length}`
      );

      // Verify expected emails are present without silent loss or mutation
      const parsedEmails = res.recipients.map(r => r.email);
      for (const expectedEmail of sample.expectedRecipientEmails) {
        assert.ok(
          parsedEmails.some(e => e.toLowerCase() === expectedEmail.toLowerCase()),
          `[${sample.id}] Missing expected email: ${expectedEmail}`
        );
      }

      // Verify Round-Trip invariant for all valid parsed outputs
      if (res.recipients.length > 0 && res.reviewItems.length === 0) {
        const formatted = formatRecipients(res.recipients, 'standard');
        const roundTripRes = parseRecipients(formatted);
        assert.equal(
          roundTripRes.recipients.length,
          res.recipients.length,
          `[${sample.id}] Round-trip count mismatch`
        );
        assert.equal(
          roundTripRes.reviewItems.length,
          0,
          `[${sample.id}] Round-trip produced unexpected review items`
        );
      }
    });
  }
});
