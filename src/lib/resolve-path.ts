/**
 * Resolve a dot-notation path against a JSON value.
 *
 * Supported syntax:
 *   "foo.bar.baz"      → nested property access
 *   "items[0]"         → array index
 *   "items[*].name"    → collect "name" from every element of "items"
 *   ""                 → return root
 */
export function resolvePath(data: unknown, path: string): unknown {
  if (!path) return data;

  const tokens = tokenize(path);
  return walk(data, tokens);
}

/** Parse "items[0].name" → ["items", "[0]", "name"] and "items[*].name" → ["items", "[*]", "name"] */
function tokenize(path: string): string[] {
  const tokens: string[] = [];
  let current = '';

  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === '.') {
      if (current) tokens.push(current);
      current = '';
    } else if (ch === '[') {
      if (current) tokens.push(current);
      const close = path.indexOf(']', i);
      if (close === -1) {
        // Malformed — treat rest as literal
        current = path.slice(i);
        break;
      }
      tokens.push(path.slice(i, close + 1)); // e.g. "[0]" or "[*]"
      current = '';
      i = close;
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function walk(data: unknown, tokens: string[]): unknown {
  let current: unknown = data;

  for (let i = 0; i < tokens.length; i++) {
    if (current == null) return undefined;

    const token = tokens[i];

    // Wildcard: collect from every array element
    if (token === '[*]') {
      if (!Array.isArray(current)) return undefined;
      const remaining = tokens.slice(i + 1);
      if (remaining.length === 0) return current;
      return current.map((item) => walk(item, remaining));
    }

    // Array index: [0], [1], etc.
    const indexMatch = token.match(/^\[(\d+)\]$/);
    if (indexMatch) {
      if (!Array.isArray(current)) return undefined;
      current = current[Number(indexMatch[1])];
      continue;
    }

    // Property access
    if (typeof current === 'object' && current !== null) {
      current = (current as Record<string, unknown>)[token];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Flatten a JSON value into an array of { path, value } leaf entries.
 * Used by the config UI to show available paths.
 */
export function flattenPaths(
  data: unknown,
  prefix = '',
  maxDepth = 6,
): Array<{ path: string; value: unknown; type: string }> {
  const results: Array<{ path: string; value: unknown; type: string }> = [];
  _flatten(data, prefix, 0, maxDepth, results);
  return results;
}

function _flatten(
  data: unknown,
  prefix: string,
  depth: number,
  maxDepth: number,
  out: Array<{ path: string; value: unknown; type: string }>,
) {
  if (depth > maxDepth) return;

  if (data === null || data === undefined) {
    out.push({ path: prefix, value: data, type: 'null' });
    return;
  }

  if (Array.isArray(data)) {
    out.push({ path: prefix, value: `Array(${data.length})`, type: 'array' });
    // Show first 3 elements
    const limit = Math.min(data.length, 3);
    for (let i = 0; i < limit; i++) {
      const childPath = prefix ? `${prefix}[${i}]` : `[${i}]`;
      _flatten(data[i], childPath, depth + 1, maxDepth, out);
    }
    return;
  }

  if (typeof data === 'object') {
    if (prefix) {
      out.push({ path: prefix, value: '{...}', type: 'object' });
    }
    for (const key of Object.keys(data as Record<string, unknown>)) {
      const childPath = prefix ? `${prefix}.${key}` : key;
      _flatten((data as Record<string, unknown>)[key], childPath, depth + 1, maxDepth, out);
    }
    return;
  }

  out.push({ path: prefix, value: data, type: typeof data });
}
