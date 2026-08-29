import { writeFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

import { parseTsx } from "../static-dom-ids/tsx-hosts";
import { loadAppTsx, planUidMigration, type UidMigrationEdit } from "./plan-uid-migration";

/**
 * Inserts the import after the last top-level import declaration (found by
 * parsing, so a multi-line `import { … } from "…"` is never split), or
 * right after a leading `"use client"` directive when the file has no
 * imports at all.
 */
function insertImport(file: string, source: string): string {
  const sourceFile = parseTsx(file, source);
  let insertAt = 0;
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) {
      insertAt = statement.getEnd();
    } else if (
      insertAt === 0 &&
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression) &&
      statement.expression.text === "use client"
    ) {
      insertAt = statement.getEnd();
    } else if (insertAt > 0) {
      break;
    }
  }
  return `${source.slice(0, insertAt)}\nimport { uiAttributes } from "@asol/ui-registry-core";${source.slice(insertAt)}`;
}

function attributeText(edit: UidMigrationEdit): string {
  if (edit.kind === "host") {
    return ` {...uiAttributes({ uid: "${edit.uid}", id: "${edit.id}" })}`;
  }
  return ` ui={{ uid: "${edit.uid}", id: "${edit.id}" }}`;
}

export function applyUidMigrationToRepo(root: string): {
  editedFiles: number;
  hostAssigned: number;
  primitiveAssigned: number;
  skipped: number;
} {
  const { edits, importsNeeded, skippedSpread } = planUidMigration(root);
  const sources = loadAppTsx(root);
  const byFile = new Map<string, UidMigrationEdit[]>();
  for (const edit of edits) {
    const list = byFile.get(edit.file) ?? [];
    list.push(edit);
    byFile.set(edit.file, list);
  }

  let hostAssigned = 0;
  let primitiveAssigned = 0;
  for (const [file, fileEdits] of byFile) {
    const ordered = [...fileEdits].sort((left, right) => right.insertAt - left.insertAt);
    let source = sources.get(file)!;
    for (const edit of ordered) {
      source = `${source.slice(0, edit.insertAt)}${attributeText(edit)}${source.slice(edit.insertAt)}`;
      if (edit.kind === "host") hostAssigned += 1;
      else primitiveAssigned += 1;
    }
    if (importsNeeded.has(file)) source = insertImport(file, source);
    writeFileSync(join(root, file), source, "utf8");
  }

  return { editedFiles: byFile.size, hostAssigned, primitiveAssigned, skipped: skippedSpread.length };
}
