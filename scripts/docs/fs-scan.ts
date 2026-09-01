import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { relative, resolve, sep } from 'path';

export const REPO_ROOT = process.cwd();

const IGNORED_FILES = new Set(['android/local.properties']);

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

interface GitIgnoreIndex {
  files: Set<string>;
  directories: string[];
}

let gitIgnoreIndex: GitIgnoreIndex | null = null;

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

/**
 * Build the ignored-path index from Git itself instead of duplicating .gitignore.
 *
 * Repository knowledge must describe the repository, not machine-local files.
 * In particular, ignored credentials such as GoogleService-Info.plist can exist
 * on a developer workstation while being absent from a clean Actions checkout.
 * Letting those files into the graph makes generated documentation depend on the
 * machine that ran the generator and can accidentally surface secret filenames.
 *
 * `--directory` keeps large ignored trees (node_modules, .local, build outputs)
 * compact while exact ignored files remain exact entries. New, non-ignored
 * untracked source files are intentionally NOT excluded, so docs generation still
 * sees a file an agent has just created before its first commit.
 */
function loadGitIgnoreIndex(): GitIgnoreIndex {
  if (gitIgnoreIndex) return gitIgnoreIndex;

  const result = spawnSync(
    'git',
    ['ls-files', '--others', '--ignored', '--exclude-standard', '--directory', '-z'],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (result.error || result.status !== 0) {
    const detail = result.error?.message || result.stderr?.trim() || `exit ${String(result.status)}`;
    throw new Error(`Unable to resolve Git-ignored repository paths: ${detail}`);
  }

  const files = new Set<string>();
  const directories: string[] = [];
  for (const raw of result.stdout.split('\0')) {
    if (!raw) continue;
    const normalized = normalizePath(raw);
    if (normalized.endsWith('/')) directories.push(normalized.slice(0, -1));
    else files.add(normalized);
  }
  directories.sort((a, b) => a.localeCompare(b));
  gitIgnoreIndex = { files, directories };
  return gitIgnoreIndex;
}

function isGitIgnored(repoPath: string): boolean {
  const normalized = normalizePath(repoPath).replace(/\/$/, '');
  const ignored = loadGitIgnoreIndex();
  if (ignored.files.has(normalized)) return true;
  return ignored.directories.some(
    (directory) => normalized === directory || normalized.startsWith(`${directory}/`),
  );
}

function shouldIgnoreDirectory(parent: string, name: string): boolean {
  if (IGNORED_DIRECTORIES.has(name)) return true;
  if (parent.startsWith('services/') && name === 'generated') return true;
  return isGitIgnored(normalizePath(`${parent}/${name}`));
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
      const child = normalizePath(`${repoPath}/${entry.name}`);
      if (entry.isDirectory() && shouldIgnoreDirectory(repoPath, entry.name)) continue;
      if (IGNORED_FILES.has(child) || isGitIgnored(child)) continue;
      if (child.startsWith('docs/09-agent-knowledge/generated/')) continue;
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile() && predicate(child)) result.push(child);
    }
  };

  const normalizedRoot = normalizePath(root);
  if (isGitIgnored(normalizedRoot)) return [];
  if (statSync(absolutePath(root)).isFile()) return predicate(root) ? [normalizedRoot] : [];
  visit(normalizedRoot);
  return result.sort();
}

export function immediateDirectories(root: string): string[] {
  if (!isDirectory(root)) return [];
  return readdirSync(absolutePath(root), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        !shouldIgnoreDirectory(root, entry.name),
    )
    .map((entry) => normalizePath(`${root}/${entry.name}`))
    .sort();
}

export function toRepoPath(absolute: string): string {
  return normalizePath(relative(REPO_ROOT, absolute));
}
