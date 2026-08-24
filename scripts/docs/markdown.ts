export interface MarkdownFacts {
  title: string;
  summary: string;
  links: string[];
  mentions: string[];
}

const REPO_MENTION = /`((?:docs|src|packages|services|scripts|android|ios|fastlane)\/[A-Za-z0-9_@()./\-[\]]+|@asol\/[A-Za-z0-9_.\-/]+)`/g;
const MARKDOWN_LINK = /\[[^\]]*\]\(([^)]+)\)/g;

export function extractMarkdownFacts(content: string, fallbackTitle: string): MarkdownFacts {
  const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const paragraphs = content
    .replace(/```[\s\S]*?```/g, '')
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith('#') && !part.startsWith('|') && !part.startsWith('- '));

  const links = new Set<string>();
  for (const match of content.matchAll(MARKDOWN_LINK)) {
    const target = match[1].trim().split('#')[0];
    if (target && !/^[a-z]+:/i.test(target) && !target.startsWith('#')) links.add(target);
  }

  const mentions = new Set<string>();
  for (const match of content.matchAll(REPO_MENTION)) mentions.add(match[1]);

  return {
    title: h1 || fallbackTitle,
    summary: (paragraphs[0] || '').replace(/\s+/g, ' ').slice(0, 280),
    links: [...links].sort(),
    mentions: [...mentions].sort(),
  };
}

export function searchableTokens(...values: Array<string | undefined>): string[] {
  const tokens = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    tokens.add(value.toLowerCase());
    for (const part of value.toLowerCase().split(/[^a-z0-9@/_-]+/).filter(Boolean)) {
      if (part.length >= 2) tokens.add(part);
    }
  }
  return [...tokens].sort();
}
