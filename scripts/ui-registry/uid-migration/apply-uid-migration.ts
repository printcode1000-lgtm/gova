import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { loadAppTsx, planUidMigration, type UidMigrationEdit } from "./plan-uid-migration";

function insertImport(source: string): string {
  const lines = source.split("\n");
  let insertAt = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if (/^import\s/.test(lines[index]!) || /^["']use client["'];?$/.test(lines[index]!.trim())) {
      insertAt = index + 1;
    } else if (lines[index]!.trim() === "" && insertAt > 0) {
      continue;
    } else if (insertAt > 0) {
      break;
    }
  }
  lines.splice(insertAt, 0, 'import { uiAttributes } from "@asol/ui-registry-core";');
  return lines.join("\n");
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
    if (importsNeeded.has(file)) source = insertImport(source);
    writeFileSync(join(root, file), source, "utf8");
  }

  return { editedFiles: byFile.size, hostAssigned, primitiveAssigned, skipped: skippedSpread.length };
}
