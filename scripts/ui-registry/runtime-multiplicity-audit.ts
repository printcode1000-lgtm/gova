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
  readonly reason: "iterator" | "reusable-template";
  readonly hasInstance: boolean;
}

export interface RuntimeMultiplicityReport {
  readonly canonicalDescriptors: number;
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

/**
 * Audits runtime multiplicity from the same AST facts used by the canonical
 * identity system. This deliberately reports reusable-template potential
 * separately from direct iterator repetition so migrations can distinguish a
 * concrete collection row from a reusable component internal subpart.
 */
export function runtimeMultiplicityReport(root = cwd()): RuntimeMultiplicityReport {
  const sources = loadProjectTsx(root);
  const multiplicity = hostMultiplicity(sources);
  const findings: RuntimeMultiplicityFinding[] = [];
  let canonicalDescriptors = 0;
  let directIteratorSites = 0;
  let reusableTemplateSites = 0;
  let repeatedWithInstance = 0;

  for (const [file, source] of sources) {
    if (file.startsWith("packages/ui-registry-core/src/simulation/generated/") ||
        file.startsWith("packages/ui-registry-core/src/registry/generated/")) continue;
    const sourceFile = parseSource(file, source);
    for (const literal of findDescriptorLiterals(file, source, sourceFile)) {
      const uid = literalField(literal, "uid");
      const id = literalField(literal, "id");
      if (!uid || !id) continue;
      canonicalDescriptors += 1;

      const directIterator = isInsideIteratorCallback(literal.node);
      const reusableTemplate = !directIterator && multiplicity.repeatingFiles.has(file);
      if (!directIterator && !reusableTemplate) continue;

      const reason = directIterator ? "iterator" : "reusable-template";
      if (directIterator) directIteratorSites += 1;
      else reusableTemplateSites += 1;

      const hasInstance = literal.fields.has("instance");
      if (hasInstance) repeatedWithInstance += 1;
      else findings.push({ file, line: literal.line, uid, id, reason, hasInstance });
    }
  }

  return {
    canonicalDescriptors,
    repeatedSourceSites: directIteratorSites + reusableTemplateSites,
    repeatedWithInstance,
    directIteratorSites,
    reusableTemplateSites,
    unresolved: findings.sort((a, b) =>
      a.file.localeCompare(b.file) || a.line - b.line || a.uid.localeCompare(b.uid)),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runtimeMultiplicityReport();
  console.log(JSON.stringify({
    canonicalDescriptors: report.canonicalDescriptors,
    repeatedSourceSites: report.repeatedSourceSites,
    repeatedWithInstance: report.repeatedWithInstance,
    directIteratorSites: report.directIteratorSites,
    reusableTemplateSites: report.reusableTemplateSites,
    unresolvedCount: report.unresolved.length,
  }, null, 2));
  for (const finding of report.unresolved) {
    console.log(`UNRESOLVED ${finding.reason} ${finding.file}:${finding.line} ${finding.uid} (${finding.id})`);
  }
  if (process.argv.includes("--check") && report.unresolved.length > 0) process.exitCode = 1;
}
