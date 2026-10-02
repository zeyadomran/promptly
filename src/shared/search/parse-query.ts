export interface ParsedQuery {
  text: string[];
  tags: string[];
  sources: string[];
}

/** Whitespace separates AND terms; quotes group a literal substring. */
export function parseQuery(query: string): ParsedQuery {
  const result: ParsedQuery = { text: [], tags: [], sources: [] };
  let cursor = 0;

  while (cursor < query.length) {
    while (/\s/u.test(query[cursor] ?? '') && cursor < query.length) cursor += 1;
    if (cursor >= query.length) break;
    const prefix = /^(tag|from):/iu.exec(query.slice(cursor));
    const field = prefix?.[1]?.toLowerCase();

    if (prefix !== null) cursor += prefix[0].length;
    let value = '';
    let quoted = false;

    while (cursor < query.length) {
      const character = query[cursor] ?? '';

      if (character === '\\') {
        const next = query[cursor + 1];

        // Other backslashes stay literal (paths, regex-looking text, etc.).
        if (next !== undefined && (/\s/u.test(next) || ['"', '\\', ':'].includes(next))) {
          value += next;
          cursor += 2;
          continue;
        }
      }

      if (character === '"') quoted = !quoted;
      else if (!quoted && /\s/u.test(character)) break;
      else value += character;
      cursor += 1;
    }

    // Empty/incomplete filters and empty quotes contribute no restriction.
    if (value !== '') {
      if (field === 'tag') result.tags.push(value);
      else if (field === 'from') result.sources.push(value);
      else result.text.push(value);
    }
  }

  return result;
}
