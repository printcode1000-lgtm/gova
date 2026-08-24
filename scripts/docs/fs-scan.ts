import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { relative, resolve, sep } from 'path';

export const REPO_ROOT = process.cwd();

const IGNORED_DIRECTORIES = new Set([
  '.git',
  '.next',
  'node_modules',
  'out',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.gradle',
  'DerivedData',
  'Pods',
  'xcuserdata',
]);

export function normalizePath(value: string): string {
  return value.split(sep).join('/').replace(/^\.\//, '');
}

export function absolutePath(repoPath: string): string {
  return resolve(REPO_ROOT, repoPath);
}

export function pathExists(repoPath: string): boolean {
  return existsSync(absolutePath(repoPath));
}

export function readRepoText(repoPath: string): string {
  return readFileSync(absolutePath(repoPath), 'utf8');
}

export function readRepoJson<T>(repoPath: string): T {
  return JSON.parse(readRepoText(repoPath)) as T;
}

export function isDirectory(repoPath: string): boolean {
  return pathExists(repoPath) && statSync(absolutePath(repoPath)).isDirectory();
}

function shouldIgnoreDirectory(parent: string, name: string): boolean {
  if (IGNORED_DIRECTORIES.has(name)) return true;
  if (parent.startsWith('services/') && name === 'generated') return true;
  return false;
}

export function walkFiles(
  root: string,
  predicate: (path: string) => boolean = () => true,
): string[] {
  if (!pathExists(root)) return [];
  const result: string[] = [];

  const visit = (repoPath: string): void => {
    const absolute = absolutePath(repoPath);
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (entry.isDirectory() && shouldIgnoreDirectory(repoPath, entry.name)) continue;
      const child = normalizePath(`${repoPath}/${entry.name}`);
      if (child.startsWith('docs/09-agent-knowledge/generated/')) continue;
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile() && predicate(child)) result.push(child);
    }
  };

  if (statSync(absolutePath(root)).isFile()) return predicate(root) ? [normalizePath(root)] : [];
  visit(normalizePath(root));
  return result.sort();
}

export function immediateDirectories(root: string): string[] {
  if (!isDirectory(root)) return [];
  return readdirSync(absolutePath(root), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !shouldIgnoreDirectory(root, entry.name))
    .map((entry) => normalizePath(`${root}/${entry.name}`))
    .sort();
}

export function toRepoPath(absolute: string): string {
  return normalizePath(relative(REPO_ROOT, absolute));
}
