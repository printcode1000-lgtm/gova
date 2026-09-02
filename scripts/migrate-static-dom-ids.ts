import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';

import { stableStaticDomSuffix, writeStaticDomIdentityManifest } from '@asol/architecture-core';

const ROOT = process.cwd();
const SOURCE_ROOTS = ['src/app', 'src/features', 'src/shared', 'packages'] as const;
const EXCLUDED = ['/node_modules/', '/dist/', '/.next/', '/out/', '/generated/', '/tests/', '/src/tests/', '.test.', '.spec.'];
const VALID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+-[a-z0-9]{6}$/;
const DYNAMIC_CALL_NAMES = new Set(['map', 'flatMap']);
const STATIC_REFERENCE_ATTRIBUTES = new Set([
  'htmlFor',
  'aria-controls',
  'aria-labelledby',
  'aria-describedby',
  'aria-owns',
  'aria-activedescendant',
]);

interface Replacement {
  start: number;
  end: number;
  text: string;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function collectFiles(): string[] {
  const out: string[] = [];
  function walk(dir: string): void {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const normalized = normalizePath(full);
      if (EXCLUDED.some((part) => normalized.includes(part))) continue;
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else if (entry.endsWith('.tsx')) out.push(full);
    }
  }
  for (const root of SOURCE_ROOTS) walk(join(ROOT, root));
  return out.sort();
}

function isIntrinsic(tagName: ts.JsxTagNameExpression): tagName is ts.Identifier {
  return ts.isIdentifier(tagName) && tagName.text[0] === tagName.text[0]?.toLowerCase();
}

function tagText(tagName: ts.JsxTagNameExpression): string {
  return tagName.getText().replace(/[^A-Za-z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function isInsideDynamicCollection(node: ts.Node): boolean {
  let current: ts.Node | undefined = node;
  while (current?.parent) {
    const parent: ts.Node = current.parent;
    if ((ts.isArrowFunction(parent) || ts.isFunctionExpression(parent)) && ts.isCallExpression(parent.parent)) {
      const expression = parent.parent.expression;
      if (ts.isPropertyAccessExpression(expression) && DYNAMIC_CALL_NAMES.has(expression.name.text)) return true;
    }
    current = parent;
  }
  return false;
}

function attrs(node: ts.JsxOpeningLikeElement): ts.JsxAttribute[] {
  return node.attributes.properties.filter(ts.isJsxAttribute);
}

function idAttr(node: ts.JsxOpeningLikeElement): ts.JsxAttribute | undefined {
  return attrs(node).find((attr) => attr.name.getText() === 'id');
}

function attrName(attr: ts.JsxAttribute): string {
  return attr.name.getText();
}

function fileScope(rel: string): string {
  return rel
    .replace(/\.[cm]?tsx$/, '')
    .replace(/^src\//, '')
    .replace(/^packages\//, 'pkg/')
    .replace(/\/(page|layout|error|global-error)$/, '/$1')
    .split('/')
    .filter((part) => !/^\[.*\]$/.test(part))
    .slice(-4)
    .join('-')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'static-dom';
}

function quoteLike(text: string): '"' | "'" {
  return text.includes("'") && !text.includes('"') ? '"' : "'";
}

function semantic(tag: string, index: number): string {
  const names: Record<string, string> = {
    a: 'link',
    button: 'button',
    form: 'form',
    h1: 'heading',
    h2: 'heading',
    h3: 'heading',
    h4: 'heading',
    h5: 'heading',
    h6: 'heading',
    img: 'image',
    input: 'input',
    label: 'label',
    main: 'main',
    nav: 'nav',
    p: 'text',
    section: 'section',
    span: 'text',
    textarea: 'textarea',
  };
  return `${names[tag] ?? tag}-${index}`;
}

function nextId(rel: string, tag: string, index: number, used: Set<string>): string {
  const scope = fileScope(rel);
  const base = `${scope}-${semantic(tag, index)}`;
  let salt = 0;
  while (true) {
    const suffix = stableStaticDomSuffix(`${rel}:${tag}:${index}:${salt}`);
    const id = `${base}-${suffix}`.replace(/-+/g, '-');
    if (!used.has(id)) {
      used.add(id);
      return id;
    }
    salt += 1;
  }
}

function migrateFile(file: string, used: Set<string>, oldToNew: Map<string, string>): { changed: boolean; added: number } {
  const rel = normalizePath(relative(ROOT, file));
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements: Replacement[] = [];
  let index = 0;
  let added = 0;

  function visit(node: ts.Node): void {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      if (!isInsideDynamicCollection(node)) {
        const attr = idAttr(node);
        const intrinsic = isIntrinsic(node.tagName);
        if (!intrinsic && !attr) {
          ts.forEachChild(node, visit);
          return;
        }
        index += 1;
        const tag = intrinsic ? node.tagName.text : tagText(node.tagName);
        const id = nextId(rel, tag, index, used);
        if (!attr) {
          replacements.push({ start: node.tagName.end, end: node.tagName.end, text: ` id="${id}"` });
          added += 1;
        } else if (!attr.initializer) {
          replacements.push({ start: attr.getStart(source), end: attr.end, text: `id="${id}"` });
          added += 1;
        } else if (ts.isStringLiteral(attr.initializer)) {
          const old = attr.initializer.text;
          if (VALID.test(old)) {
            used.add(old);
          } else {
            oldToNew.set(old, id);
            const quote = quoteLike(attr.initializer.getText(source));
            replacements.push({ start: attr.initializer.getStart(source), end: attr.initializer.end, text: `${quote}${id}${quote}` });
            added += 1;
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  if (replacements.length === 0) return { changed: false, added };

  let next = text;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    next = next.slice(0, replacement.start) + replacement.text + next.slice(replacement.end);
  }
  writeFileSync(file, next);
  return { changed: true, added };
}

const used = new Set<string>();
let filesChanged = 0;
let idsAdded = 0;
const oldToNew = new Map<string, string>();

for (const file of collectFiles()) {
  const result = migrateFile(file, used, oldToNew);
  if (result.changed) filesChanged += 1;
  idsAdded += result.added;
}

function migrateStaticReferences(file: string): void {
  if (oldToNew.size === 0) return;
  const text = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const replacements: Replacement[] = [];

  function replacementFor(value: string): string | undefined {
    if (oldToNew.has(value)) return oldToNew.get(value);
    if (value.startsWith('#') && oldToNew.has(value.slice(1))) return `#${oldToNew.get(value.slice(1))}`;
    return undefined;
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxAttribute(node) && STATIC_REFERENCE_ATTRIBUTES.has(attrName(node)) && node.initializer) {
      if (ts.isStringLiteral(node.initializer)) {
        const next = replacementFor(node.initializer.text);
        if (next) {
          const quote = quoteLike(node.initializer.getText(source));
          replacements.push({ start: node.initializer.getStart(source), end: node.initializer.end, text: `${quote}${next}${quote}` });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  if (replacements.length === 0) return;
  let next = text;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    next = next.slice(0, replacement.start) + replacement.text + next.slice(replacement.end);
  }
  writeFileSync(file, next);
}

for (const file of collectFiles()) migrateStaticReferences(file);

const manifest = writeStaticDomIdentityManifest();
console.log(`Migrated ${idsAdded} static DOM identities across ${filesChanged} files.`);
console.log(`Manifest entries: ${manifest.entries.length}.`);
