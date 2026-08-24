import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const FEATURES = path.join(SRC, 'features');
const CANONICAL_DIRS = new Set(['domain', 'application', 'infrastructure', 'presentation', 'ports', 'server', 'tests']);
const DOOR_FILES = new Set(['index.ts', 'index.tsx', 'ui.ts', 'ui.tsx', 'server.ts', 'server.tsx']);
const LEGACY_TARGETS = {
  hooks: ['presentation', 'hooks'],
  context: ['presentation', 'context'],
  utils: ['application', 'utils'],
  config: ['application', 'config'],
  public: ['application', 'public'],
  shared: ['application', 'shared'],
  runtime: ['infrastructure', 'runtime'],
  processing: ['application', 'processing'],
  validation: ['domain', 'validation'],
  types: ['domain', 'types'],
};
const CODE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const TEXT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.txt', '.css', '.scss']);
const RESOLVE_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.css', '.scss'];
const SKIP_DIRS = new Set(['.git', 'node_modules', '.next', 'out', 'coverage']);

function posix(p) { return p.split(path.sep).join('/'); }
function repoRel(abs) { return posix(path.relative(ROOT, abs)); }
function srcRel(abs) { return posix(path.relative(SRC, abs)); }
function ensureDir(file) { mkdirSync(path.dirname(file), { recursive: true }); }

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (/^services[\\/][^\\/]+[\\/]generated(?:[\\/]|$)/.test(repoRel(abs))) continue;
      walk(abs, out);
    } else if (entry.isFile()) out.push(abs);
  }
  return out;
}

function isServerService(file, content) {
  const name = path.basename(file);
  if (/\.server\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(name)) return true;
  if (/server-(?:service|repository|adapter)/i.test(name)) return true;
  if (/^(?:release-command-service|data-health-core-service|specialty-chat-service)/.test(name)) return true;
  if (/['\"]server-only['\"]/.test(content)) return true;
  return false;
}

function rootDestination(featureRoot, file) {
  const name = path.basename(file);
  if (/core-ports?\./i.test(name) || /-ports?\./i.test(name)) return path.join(featureRoot, 'ports', name);
  if (/^use-[^.]+\.(?:ts|tsx)$/.test(name)) return path.join(featureRoot, 'presentation', 'hooks', name);
  if (/\.server\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(name)) return path.join(featureRoot, 'server', name);
  if (/^(?:config|constants?)\./i.test(name)) return path.join(featureRoot, 'application', 'config', name);
  return path.join(featureRoot, 'application', name);
}

function serviceDestination(featureRoot, file, relInside) {
  const content = CODE_EXTS.has(path.extname(file)) ? readFileSync(file, 'utf8') : '';
  const layer = isServerService(file, content) ? ['server', 'services'] : ['application', 'services'];
  return path.join(featureRoot, ...layer, relInside);
}

const moveMap = new Map();
const legacyRoots = [];
const featureNames = readdirSync(FEATURES, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort();

for (const feature of featureNames) {
  const featureRoot = path.join(FEATURES, feature);
  for (const entry of readdirSync(featureRoot, { withFileTypes: true })) {
    const abs = path.join(featureRoot, entry.name);
    if (entry.isDirectory() && !CANONICAL_DIRS.has(entry.name)) {
      legacyRoots.push(abs);
      const files = walk(abs, []);
      for (const file of files) {
        const relInside = path.relative(abs, file);
        let dest;
        if (entry.name === 'services') dest = serviceDestination(featureRoot, file, relInside);
        else {
          const parts = LEGACY_TARGETS[entry.name];
          if (!parts) throw new Error(`Unknown legacy feature root ${repoRel(abs)}. Add an explicit semantic mapping.`);
          dest = path.join(featureRoot, ...parts, relInside);
        }
        moveMap.set(file, dest);
      }
    } else if (entry.isFile() && CODE_EXTS.has(path.extname(entry.name)) && !DOOR_FILES.has(entry.name)) {
      moveMap.set(abs, rootDestination(featureRoot, abs));
    }
  }
}

const destinationOwners = new Map();
for (const [oldAbs, newAbs] of moveMap) {
  const key = path.resolve(newAbs);
  if (destinationOwners.has(key) && destinationOwners.get(key) !== oldAbs) {
    throw new Error(`Destination collision: ${repoRel(newAbs)} from ${repoRel(oldAbs)} and ${repoRel(destinationOwners.get(key))}`);
  }
  if (existsSync(newAbs) && path.resolve(newAbs) !== path.resolve(oldAbs)) {
    const oldContent = readFileSync(oldAbs);
    const newContent = readFileSync(newAbs);
    if (!oldContent.equals(newContent)) throw new Error(`Destination already exists with different content: ${repoRel(newAbs)}`);
  }
  destinationOwners.set(key, oldAbs);
}

const allBefore = walk(ROOT, []);
const oldFileSet = new Set(allBefore.map(f => path.resolve(f)));

function resolveOldModule(importer, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(importer), spec);
  else return null;
  const candidates = [base];
  for (const ext of RESOLVE_EXTS) candidates.push(base + ext);
  for (const ext of RESOLVE_EXTS) candidates.push(path.join(base, 'index' + ext));
  for (const candidate of candidates) if (oldFileSet.has(path.resolve(candidate))) return path.resolve(candidate);
  return null;
}

function moduleBase(abs) {
  const ext = path.extname(abs);
  if (CODE_EXTS.has(ext) || ext === '.json') {
    const stripped = abs.slice(0, -ext.length);
    if (path.basename(stripped) === 'index') return path.dirname(stripped);
    return stripped;
  }
  return abs;
}

function newSpecifier(importerOld, targetOld, original) {
  const importerNew = moveMap.get(importerOld) ?? importerOld;
  const targetNew = moveMap.get(targetOld) ?? targetOld;
  const targetBase = moduleBase(targetNew);
  if (original.startsWith('@/')) return '@/' + srcRel(targetBase);
  let rel = posix(path.relative(path.dirname(importerNew), targetBase));
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel || './';
}

function importStringNodes(sourceFile) {
  const nodes = [];
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      nodes.push(node.moduleSpecifier);
    } else if (ts.isCallExpression(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      const expr = node.expression;
      if (expr.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(expr) && expr.text === 'require')) nodes.push(node.arguments[0]);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteralLike(node.argument.literal)) {
      nodes.push(node.argument.literal);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return nodes;
}

function rewriteImports(oldAbs, content) {
  const ext = path.extname(oldAbs);
  if (!CODE_EXTS.has(ext)) return content;
  const kind = /tsx|jsx/.test(ext) ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(oldAbs, content, ts.ScriptTarget.Latest, true, kind);
  const replacements = [];
  for (const node of importStringNodes(sf)) {
    const spec = node.text;
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
    const target = resolveOldModule(oldAbs, spec);
    if (!target) continue;
    const importerMoves = moveMap.has(oldAbs);
    const targetMoves = moveMap.has(target);
    if (!importerMoves && !targetMoves) continue;
    const next = newSpecifier(oldAbs, target, spec);
    if (next !== spec) replacements.push([node.getStart(sf) + 1, node.getEnd() - 1, next]);
  }
  replacements.sort((a, b) => b[0] - a[0]);
  let out = content;
  for (const [start, end, value] of replacements) out = out.slice(0, start) + value + out.slice(end);
  return out;
}

const rewritten = new Map();
for (const oldAbs of allBefore) {
  if (!CODE_EXTS.has(path.extname(oldAbs))) continue;
  const content = readFileSync(oldAbs, 'utf8');
  const next = rewriteImports(oldAbs, content);
  if (next !== content || moveMap.has(oldAbs)) rewritten.set(oldAbs, next);
}

for (const [oldAbs, newAbs] of [...moveMap.entries()].sort((a, b) => b[0].length - a[0].length)) {
  if (!existsSync(oldAbs)) continue;
  ensureDir(newAbs);
  if (existsSync(newAbs)) rmSync(oldAbs, { force: true });
  else renameSync(oldAbs, newAbs);
}
for (const legacy of [...legacyRoots].sort((a, b) => b.length - a.length)) if (existsSync(legacy)) rmSync(legacy, { recursive: true, force: true });

for (const [oldAbs, content] of rewritten) {
  const dest = moveMap.get(oldAbs) ?? oldAbs;
  ensureDir(dest);
  writeFileSync(dest, content);
}

const genericPairs = [];
for (const [oldAbs, newAbs] of moveMap) {
  const oldRel = repoRel(oldAbs);
  const newRel = repoRel(newAbs);
  genericPairs.push([oldRel, newRel]);
  const oldExt = path.extname(oldRel);
  const newExt = path.extname(newRel);
  if (CODE_EXTS.has(oldExt) && CODE_EXTS.has(newExt)) genericPairs.push([oldRel.slice(0, -oldExt.length), newRel.slice(0, -newExt.length)]);
  if (oldRel.startsWith('src/')) {
    const oldAlias = '@/' + oldRel.slice(4).replace(/\.(?:tsx?|jsx?|mjs|cjs)$/, '');
    const newAlias = '@/' + newRel.slice(4).replace(/\.(?:tsx?|jsx?|mjs|cjs)$/, '');
    genericPairs.push([oldAlias, newAlias]);
  }
}
genericPairs.sort((a, b) => b[0].length - a[0].length);

for (const file of walk(ROOT, [])) {
  if (!TEXT_EXTS.has(path.extname(file))) continue;
  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  let next = content;
  for (const [from, to] of genericPairs) if (next.includes(from)) next = next.split(from).join(to);
  if (next !== content) writeFileSync(file, next);
}

const violations = [];
for (const feature of featureNames) {
  const root = path.join(FEATURES, feature);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && !CANONICAL_DIRS.has(entry.name)) violations.push(`${feature}/${entry.name}/`);
    if (entry.isFile() && CODE_EXTS.has(path.extname(entry.name)) && !DOOR_FILES.has(entry.name)) violations.push(`${feature}/${entry.name}`);
  }
}
if (violations.length) throw new Error(`Canonicalization incomplete:\n${violations.join('\n')}`);

console.log(`Canonicalized ${featureNames.length} features; moved ${moveMap.size} files. Direct feature roots now contain only seven canonical layers plus index/ui/server doors.`);
