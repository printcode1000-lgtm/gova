import { cwd } from "node:process";

import {
  findDescriptorLiterals,
  hostMultiplicity,
  isInsideIteratorCallback,
  loadProjectTsx,
} from "@asol/architecture-core";
import ts from "typescript";

export interface RuntimeMultiplicityFinding {
  readonly file: string;
  readonly line: number;
  readonly uid: string;
  readonly id: string;
  readonly component: string | null;
  readonly reason: "iterator" | "reusable-template";
  readonly hasInstance: boolean;
}

export interface RuntimeMultiplicityReport {
  readonly canonicalInlineDescriptors: number;
  readonly repeatedSourceSites: number;
  readonly repeatedWithInstance: number;
  readonly directIteratorSites: number;
  readonly reusableTemplateSites: number;
  readonly unresolved: readonly RuntimeMultiplicityFinding[];
}

function parseSource(file: string, source: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function literalField(
  literal: ReturnType<typeof findDescriptorLiterals>[number],
  name: string,
): string | null {
  return literal.fields.get(name)?.literalValue ?? null;
}

function variableNameForFunction(node: ts.FunctionExpression | ts.ArrowFunction): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) return current.name.text;
    if (ts.isPropertyAssignment(current) && (ts.isIdentifier(current.name) || ts.isStringLiteral(current.name))) {
      return current.name.text;
    }
    if (ts.isFunctionDeclaration(current) || ts.isClassDeclaration(current)) break;
    current = current.parent;
  }
  return null;
}

/** Nearest component/template function that owns the descriptor's JSX site. */
function containingComponent(node: ts.Node): string | null {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isFunctionDeclaration(current) && current.name) return current.name.text;
    if (ts.isFunctionExpression(current)) return current.name?.text ?? variableNameForFunction(current);
    if (ts.isArrowFunction(current)) return variableNameForFunction(current);
    if (ts.isMethodDeclaration(current) && (ts.isIdentifier(current.name) || ts.isStringLiteral(current.name))) {
      return current.name.text;
    }
    current = current.parent;
  }
  return null;
}

function symbolKey(file: string, component: string): string {
  return `${file}#${component}`;
}

/**
 * Audits actual inline DOM descriptor sites. A site is repeated when it sits
 * directly in an iterator callback, or its containing component symbol is
 * itself rendered more than once. File-level repetition is used only as a
 * fallback when import analysis cannot resolve a precise exported symbol.
 */
export function runtimeMultiplicityReport(root = cwd()): RuntimeMultiplicityReport {
  const sources = loadProjectTsx(root);
  const multiplicity = hostMultiplicity(sources);
  const findings: RuntimeMultiplicityFinding[] = [];
  let canonicalInlineDescriptors = 0;
  let directIteratorSites = 0;
  let reusableTemplateSites = 0;
  let repeatedWithInstance = 0;

  for (const [file, source] of sources) {
    if (
      file.startsWith("packages/ui-registry-core/src/simulation/generated/") ||
      file.startsWith("packages/ui-registry-core/src/registry/generated/")
    ) continue;
    const sourceFile = parseSource(file, source);
    for (const literal of findDescriptorLiterals(file, source, sourceFile)) {
      if (literal.declarationKind !== "inline") continue;
      const uid = literalField(literal, "uid");
      const id = literalField(literal, "id");
      if (!uid || !id) continue;
      canonicalInlineDescriptors += 1;

      const directIterator = isInsideIteratorCallback(literal.node);
      const component = containingComponent(literal.node);
      const repeatedComponent =
        !directIterator &&
        component !== null &&
        (multiplicity.repeatingSymbols.has(symbolKey(file, component)) ||
          multiplicity.repeatingFiles.has(file));
      if (!directIterator && !repeatedComponent) continue;

      const reason = directIterator ? "iterator" : "reusable-template";
      if (directIterator) directIteratorSites += 1;
      else reusableTemplateSites += 1;

      const hasInstance = literal.fields.has("instance");
      if (hasInstance) repeatedWithInstance += 1;
      else findings.push({ file, line: literal.line, uid, id, component, reason, hasInstance });
    }
  }

  return {
    canonicalInlineDescriptors,
    repeatedSourceSites: directIteratorSites + reusableTemplateSites,
    repeatedWithInstance,
    directIteratorSites,
    reusableTemplateSites,
    unresolved: findings.sort(
      (a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.uid.localeCompare(b.uid),
    ),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runtimeMultiplicityReport();
  console.log(
    JSON.stringify(
      {
        canonicalInlineDescriptors: report.canonicalInlineDescriptors,
        repeatedSourceSites: report.repeatedSourceSites,
        repeatedWithInstance: report.repeatedWithInstance,
        directIteratorSites: report.directIteratorSites,
        reusableTemplateSites: report.reusableTemplateSites,
        unresolvedCount: report.unresolved.length,
      },
      null,
      2,
    ),
  );
  for (const finding of report.unresolved) {
    console.log(
      `UNRESOLVED ${finding.reason} ${finding.file}:${finding.line} ${finding.uid} (${finding.id}) component=${finding.component ?? "unknown"}`,
    );
  }
  if (process.argv.includes("--check") && report.unresolved.length > 0) process.exitCode = 1;
}
