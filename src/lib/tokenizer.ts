export interface RawToken {
  text: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Tokenizes raw text into candidate segments while respecting:
 * - Quoted strings (e.g. "Doe, John")
 * - Angle brackets (e.g. <max@example.com>)
 * - Parentheses (e.g. (Display Name))
 * - Delimiters: commas, semicolons, newlines
 */
export function tokenizeInput(input: string): RawToken[] {
  const tokens: RawToken[] = [];
  const len = input.length;
  let tokenStart = 0;
  let inQuotes = false;
  let quoteChar = '';
  let inAngleBrackets = false;
  let inParentheses = false;

  for (let i = 0; i < len; i++) {
    const char = input[i];

    // Handle quotes
    if ((char === '"' || char === "'") && !inAngleBrackets) {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      }
    }
    // Handle angle brackets & parentheses (only when not in quotes)
    else if (!inQuotes) {
      if (char === '<') {
        inAngleBrackets = true;
      } else if (char === '>') {
        inAngleBrackets = false;
      } else if (char === '(') {
        inParentheses = true;
      } else if (char === ')') {
        inParentheses = false;
      }
    }

    const isNewline = char === '\n' || char === '\r';

    // Newlines reset unclosed brackets/parentheses from preceding lines
    if (isNewline) {
      inAngleBrackets = false;
      inParentheses = false;
    }

    // Comma / Semicolon / Newline delimiter
    // Only split when NOT inside quotes, angle brackets, or parentheses
    const isDelimiter =
      !inQuotes &&
      ((!inAngleBrackets && !inParentheses && (char === ',' || char === ';')) || isNewline);

    if (isDelimiter) {
      if (i > tokenStart) {
        const raw = input.slice(tokenStart, i);
        if (raw.trim().length > 0) {
          const leadingWs = raw.search(/\S/);
          const trailingWs = raw.length - raw.trimEnd().length;
          tokens.push({
            text: raw.trim(),
            startIndex: tokenStart + (leadingWs >= 0 ? leadingWs : 0),
            endIndex: i - trailingWs,
          });
        }
      }
      tokenStart = i + 1;
    }
  }

  // Push remainder
  if (tokenStart < len) {
    const raw = input.slice(tokenStart, len);
    if (raw.trim().length > 0) {
      const leadingWs = raw.search(/\S/);
      const trailingWs = raw.length - raw.trimEnd().length;
      tokens.push({
        text: raw.trim(),
        startIndex: tokenStart + (leadingWs >= 0 ? leadingWs : 0),
        endIndex: len - trailingWs,
      });
    }
  }

  return tokens;
}
