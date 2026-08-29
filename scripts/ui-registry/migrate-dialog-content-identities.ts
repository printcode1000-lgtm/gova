import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import ts from "typescript";

interface PlannedIdentity {
  readonly uid: string;
  readonly id: string;
}

const ROOT = process.cwd();
const PLANS: Readonly<Record<string, readonly PlannedIdentity[]>> = {
  "src/features/auth/presentation/LoginRequiredDialog.tsx": [
    { uid: "auth.login-required-dialog.content-g5CmEp", id: "auth.login-required-dialog.dialog-content" },
  ],
  "src/features/data-health/presentation/DataHealthDialogs.tsx": [
    { uid: "data-health.issue-detail.content-XlP3wc", id: "data-health.issue-detail.dialog-content" },
    { uid: "data-health.cleanup-plan.content-9Kj8Fg", id: "data-health.cleanup-plan.dialog-content" },
    { uid: "data-health.order-purge.content-15Lsyv", id: "data-health.order-purge.dialog-content" },
  ],
  "src/features/google-play-console/presentation/components/ReleaseCommandConfirmDialog.tsx": [
    { uid: "release-console.command-confirm.content-w5qCoa", id: "release-console.command-confirm.dialog-content" },
  ],
  "src/features/google-play-console/presentation/components/ReleaseJobStopDialog.tsx": [
    { uid: "release-console.job-stop.content-1xSjbt", id: "release-console.job-stop.dialog-content" },
  ],
  "src/features/notifications/presentation/NotificationPermissionPrompt.tsx": [
    { uid: "notifications.permission-prompt.content-bjo4LF", id: "notifications.permission-prompt.dialog-content" },
  ],
  "src/features/sharing/application/ShareMenu.tsx": [
    { uid: "sharing.share-menu.content-42OhDd", id: "sharing.share-menu.dialog-content" },
  ],
  "src/shared/ui/confirm-dialog.tsx": [
    { uid: "shared.confirm-dialog.content-1p9SW8", id: "shared.confirm-dialog.content" },
  ],
  "src/shared/ui/phone-country-dialog.tsx": [
    { uid: "shared.phone-country-dialog.content-lQy7vN", id: "shared.phone-country-dialog.content" },
  ],
};

function isDialogContent(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): boolean {
  return ts.isIdentifier(node.tagName) && node.tagName.text === "DialogContent";
}

function uiAttribute(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): ts.JsxAttribute | null {
  const match = node.attributes.properties.find(
    (property) => ts.isJsxAttribute(property) && property.name.getText() === "ui",
  );
  return match && ts.isJsxAttribute(match) ? match : null;
}

function uiAttributesSpread(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): {
  property: ts.JsxSpreadAttribute;
  object: ts.ObjectLiteralExpression;
} | null {
  for (const property of node.attributes.properties) {
    if (!ts.isJsxSpreadAttribute(property) || !ts.isCallExpression(property.expression)) continue;
    const call = property.expression;
    if (!ts.isIdentifier(call.expression) || call.expression.text !== "uiAttributes") continue;
    const argument = call.arguments[0];
    if (!argument || !ts.isObjectLiteralExpression(argument)) continue;
    return { property, object: argument };
  }
  return null;
}

function migratePageSave(): void {
  const relative = "src/features/page-save/presentation/PageSaveDialog.tsx";
  const path = resolve(ROOT, relative);
  const source = readFileSync(path, "utf8");
  const sourceFile = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits: Array<{ start: number; end: number; text: string }> = [];

  function visit(node: ts.Node): void {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && isDialogContent(node)) {
      if (uiAttribute(node)) return;
      const spread = uiAttributesSpread(node);
      if (!spread) throw new Error(`${relative}: DialogContent has neither ui nor a literal uiAttributes spread.`);
      const objectText = spread.object.getText(sourceFile);
      if (!objectText.includes('uid: "page-save.dialog-CfGhr4"')) {
        throw new Error(`${relative}: expected preserved Page Save UID was not found.`);
      }
      edits.push({
        start: spread.property.getStart(sourceFile),
        end: spread.property.getEnd(),
        text: `ui={${objectText}}`,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (edits.length !== 1) throw new Error(`${relative}: expected exactly one DialogContent spread conversion, found ${edits.length}.`);
  const edit = edits[0]!;
  writeFileSync(path, source.slice(0, edit.start) + edit.text + source.slice(edit.end));
}

function migratePlannedFile(relative: string, planned: readonly PlannedIdentity[]): void {
  const path = resolve(ROOT, relative);
  const source = readFileSync(path, "utf8");
  const sourceFile = ts.createSourceFile(relative, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const missing: Array<ts.JsxOpeningElement | ts.JsxSelfClosingElement> = [];

  function visit(node: ts.Node): void {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && isDialogContent(node) && !uiAttribute(node)) {
      missing.push(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);

  if (missing.length !== planned.length) {
    throw new Error(`${relative}: expected ${planned.length} unregistered DialogContent sites, found ${missing.length}.`);
  }

  const edits = missing.map((node, index) => ({
    position: node.tagName.getEnd(),
    text: ` ui={{ uid: ${JSON.stringify(planned[index]!.uid)}, id: ${JSON.stringify(planned[index]!.id)} }}`,
  })).sort((left, right) => right.position - left.position);

  let next = source;
  for (const edit of edits) next = next.slice(0, edit.position) + edit.text + next.slice(edit.position);
  writeFileSync(path, next);
}

migratePageSave();
for (const [file, plan] of Object.entries(PLANS)) migratePlannedFile(file, plan);
console.log(`Migrated Page Save plus ${Object.values(PLANS).reduce((sum, entries) => sum + entries.length, 0)} DialogContent callers.`);
