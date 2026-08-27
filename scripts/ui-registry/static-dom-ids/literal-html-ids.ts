const LITERAL_ID = /\bid\s*=\s*"([^"]+)"/g;

/** Every author-written `id="…"` literal in one source string. */
export function literalHtmlIds(source: string): string[] {
  return [...source.matchAll(LITERAL_ID)].map((match) => match[1]!);
}
