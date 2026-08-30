# SendPrep

> **Paste the mess. Prep the send.**

SendPrep turns messy copied email recipients and email headers into a clean, deduplicated, reviewed recipient list ready to paste into Outlook, Gmail, Apple Mail, or another email client.

---

## What it does

Paste messy recipient text from Outlook, Gmail, spreadsheets, email headers, or plain text.

SendPrep:

- **Parses recipient structures**: Handles `Name <email@example.com>`, `"Last, First" <email@example.com>`, `email@example.com (Display Name)`, spreadsheet tabs, `mailto:` query parameters (`to`, `cc`, `bcc`), and plain email addresses.
- **Merges duplicate email identities conservatively**: Collapses case-insensitive duplicate email addresses while preserving original display casing and tracking merged occurrences.
- **Preserves display names**: Retains associated display names without truncation, corruption, or unintended mutation.
- **Surfaces ambiguous fragments for review**: Highlights syntax issues, unclosed brackets, and conflicting display names for explicit user resolution.
- **Produces copy-ready recipient formats**: Formats clean output for Outlook (semicolon), Gmail / Apple Mail (comma), Addresses only (line-separated), and CSV text.

---

## Trust model

**Nothing uncertain is silently discarded.**

SendPrep operates on a strict zero-guessing trust invariant. When input is malformed, contains unseparated text, or features conflicting display names for the same address, it is surfaced under **Needs Review** rather than silently dropped or heuristically guessed.

Unresolved items in Needs Review are excluded from the copied list until explicitly resolved or dismissed, ensuring no corrupted or accidental text reaches your mail client.

---

## Privacy

> "Your recipient data is processed locally in your browser and is not uploaded by SendPrep."

- **No backend**: Operates 100% locally in browser memory.
- **No recipient uploads**: No recipient data is ever transmitted across the network.
- **No analytics or telemetry**: Zero tracking scripts, cookies, or remote metric beacons.
- **No persistent recipient storage**: Recipient text is not saved to `localStorage`, `sessionStorage`, or indexed databases.

---

## What SendPrep does NOT do

SendPrep is an office recipient organization and formatting utility. It explicitly does not perform:

- **No mailbox verification**: Does not check whether an email inbox exists or is active.
- **No SMTP/MX verification**: Does not perform DNS lookups or SMTP handshakes.
- **No deliverability scoring**: Does not predict spam scores or bounce probability.
- **No typo correction**: Does not autocorrect domains (e.g. `gmial.com` is never rewritten).
- **No sending**: Does not send emails or connect to SMTP servers.
- **No contact syncing**: Does not integrate with address books, CRM systems, or cloud APIs.

---

## Development

```bash
# Install dependencies
npm install

# Run automated tests (unit and adversarial suites)
npm test

# Run development server
npm run dev

# Run production build
npm run build
```

---

## Production

Running `npm run build` compiles the application into static client assets located in the `dist/` directory.

The `dist/` directory contains standard static files (`index.html`, JavaScript chunks, CSS) suitable for direct deployment to any static web host, CDN, or static file server (such as Cloudflare Pages, GitHub Pages, Netlify, Vercel, AWS S3, or Nginx).

*(Note: `npm run preview` is a local testing utility and should not be used as a production server).*
