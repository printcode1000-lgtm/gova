import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scannedRoots = ["src", "packages"];
const skippedDirectories = new Set(["node_modules", "tests", "__tests__"]);
const pageSaveRoot = path.join("src", "features", "page-save");

function collectSourceFiles(directory: string, found: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const entryPath = path.join(directory, entry);
    if (statSync(entryPath).isDirectory()) {
      if (skippedDirectories.has(entry)) continue;
      collectSourceFiles(entryPath, found);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    if (/\.test\.(ts|tsx)$/.test(entry)) continue;
    found.push(entryPath);
  }
  return found;
}

const sourceFiles = scannedRoots.flatMap((directory) =>
  collectSourceFiles(path.join(root, directory)).map((filePath) =>
    path.relative(root, filePath),
  ),
);

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8");
}

/**
 * Save, upload, and delete are the page-save registry's job. A page that opens
 * its own native confirmation has, by definition, taken that job back.
 */
function testNoNativeConfirmations() {
  const offenders = sourceFiles.filter((filePath) =>
    /window\.confirm\s*\(/.test(read(filePath)),
  );
  assert.deepEqual(
    offenders,
    [],
    "window.confirm is forbidden; stage the operation through @asol/page-save-core instead",
  );
}

/**
 * Image slots stage their work; nothing in the manager may upload or delete on
 * its own button.
 */
function testImageManagerHasNoOwnActionButtons() {
  const manager = read(
    "packages/storage-image-manager-core/src/components/StorageImageManager.tsx",
  );
  assert.doesNotMatch(manager, /confirmUpload|confirmRemove/);
  assert.doesNotMatch(manager, /uploadSelected/);
  assert.match(manager, /uploadPending:\s*async/);

  const configTypes = read(
    "packages/storage-image-manager-core/src/components/storage-image-manager.types.ts",
  );
  assert.doesNotMatch(
    configTypes,
    /confirmUpload|confirmRemove/,
    "image manager configs must not carry their own confirmation flags",
  );
}

/**
 * The header's check mark must not be cancelled by the very snapshot change
 * that starts it, so the countdown lives in an effect of its own.
 */
function testSuccessFlashOwnsItsTimer() {
  const header = read(
    "src/features/page-save/presentation/PageSaveHeaderButton.tsx",
  );
  assert.match(header, /acknowledgePageSaveResult\(\)/);
  assert.match(
    header,
    /if \(!successFlash\) return undefined;[\s\S]*?\}, \[successFlash\]\);/,
    "the flash countdown must depend on successFlash alone",
  );
}

/** Every staged operation kind must round-trip through the package door. */
function testPackageOwnsOperationQueue() {
  const packageDoor = read("packages/page-save-core/src/index.ts");
  for (const symbol of [
    "stagePageSaveOperation",
    "unstagePageSaveOperation",
    "runPageSaveOperations",
    "buildPageSaveOperationItems",
    "dropPageSaveItems",
  ]) {
    assert.match(packageDoor, new RegExp(symbol), `${symbol} must be exported`);
  }

  const queue = read(
    "packages/page-save-core/src/runtime/page-save-operation-queue.ts",
  );
  assert.match(
    queue,
    /if \(succeeded\) unstagePageSaveOperation/,
    "a failed operation must stay staged so the dialog can retry it",
  );
}

/** The shared dialog exposes one execute contract on every page-save surface. */
function testDialogExecuteContract() {
  const dialog = read(
    "src/features/page-save/presentation/PageSaveDialog.tsx",
  );
  const arabic = read("src/shared/locales/ar.json");
  const english = read("src/shared/locales/en.json");

  assert.match(
    dialog,
    /DialogFooter className="[^"]*flex-row[^"]*flex-nowrap/,
    "Close and Execute must stay on one non-wrapping row",
  );
  assert.match(
    dialog,
    /disabled=\{!item\.ephemeral \|\| !item\.canSave \|\| isSaving\}/,
    "form-derived checkboxes must be visibly locked",
  );
  assert.match(
    dialog,
    /if \(!item\.ephemeral\) return;/,
    "the change handler must also reject form-item selection changes",
  );
  assert.match(dialog, /pageSave\.itemAlwaysIncluded/);

  // Execute can discard as well as save, so the button must not wear a save
  // icon. The hero mark above the title stays `Save` — that one names the
  // dialog, not the action.
  assert.match(
    dialog,
    /<Check className="me-2 h-4 w-4" \/>/,
    "the Execute button must not be labelled with a save icon",
  );
  assert.match(arabic, /"pageSave\.confirmSave": "تنفيذ"/);
  assert.match(arabic, /"pageSave\.cancel": "غلق"/);
  assert.match(english, /"pageSave\.confirmSave": "Execute"/);
  assert.match(english, /"pageSave\.cancel": "Close"/);
}

/**
 * The registry is the only importer allowed to reach the queue internals; every
 * feature goes through the package door.
 */
function testNoDeepImports() {
  const offenders = sourceFiles.filter((filePath) =>
    /@asol\/page-save-core\/src\//.test(read(filePath)),
  );
  assert.deepEqual(offenders, [], "deep imports into page-save-core are forbidden");
}

/**
 * Save/delete/upload copy belongs to the page-save dialog. Pages outside the
 * page-save feature must not ship their own success or failure banners.
 */
function testNoPageOwnedSaveMessages() {
  const forbidden = [
    /تم الحفظ بنجاح/,
    /تم حفظ التغييرات/,
    /تم حفظ التعديلات/,
    /فشل حفظ التغييرات/,
    /تعذر حفظ الإعدادات/,
    /تعذر حفظ التعديلات/,
    /استخدم أيقونة الحفظ/,
    /اضغط على زر الحفظ/,
    /Changes saved successfully/,
    /Failed to save changes/,
    /unsavedChanges/,
  ];
  const offenders = sourceFiles.filter((filePath) => {
    if (filePath.startsWith(pageSaveRoot)) return false;
    const source = read(filePath);
    return forbidden.some((pattern) => pattern.test(source));
  });
  assert.deepEqual(
    offenders,
    [],
    "save result messaging belongs to PageSaveDialog only",
  );
}

/**
 * A control that only edits form state must not read as a storage delete, or
 * the user cannot tell staged work from work that already happened.
 */
function testLocalRemovalsAreNotLabelledAsDeletes() {
  const labelAttributes = ["aria-label", "labels.delete"];
  const deleteWords = ['"حذف', "'حذف", '"Delete"', "'Delete'"];
  const isOffendingLine = (line: string): boolean =>
    labelAttributes.some((attribute) => line.includes(attribute)) &&
    deleteWords.some((word) => line.includes(word));

  const offenders = sourceFiles.filter((filePath) => {
    if (filePath.startsWith(pageSaveRoot)) return false;
    return read(filePath).split("\n").some(isOffendingLine);
  });
  assert.deepEqual(
    offenders,
    [],
    "label list-row removals as removals; only the page-save dialog deletes",
  );
}

/** Surfaces that stage work must register the matching page-save scope. */
function testStagingSurfacesRegisterScopes() {
  const registrations: Array<[string, RegExp]> = [
    [
      "src/features/profile/presentation/ProductsCard.tsx",
      /usePageSaveOperations\('profile-edit'\)/,
    ],
    [
      "src/features/product/presentation/ProductReviews.tsx",
      /usePageSaveOperationScope\(/,
    ],
    [
      "src/features/data-health/presentation/use-data-health-page.ts",
      /usePageSaveOperationScope\(/,
    ],
    [
      "src/features/dev-cloud-backup/presentation/use-dev-cloud-backup-page.ts",
      /usePageSaveOperationScope\(/,
    ],
    [
      "src/features/super-admin/presentation/SuperAdminLogsPage.tsx",
      /usePageSaveOperationScope\(/,
    ],
    [
      "src/features/super-admin/presentation/SuperAdminUsersPage.tsx",
      /usePageSaveOperationScope\(\{\s*id:\s*"super-admin-users"/,
    ],
    [
      "src/features/system-logs/SuperAdminErrorFloatingButton.tsx",
      /usePageSaveOperationScope\(/,
    ],
    [
      "src/features/google-play-console/hooks/use-store-assets.ts",
      /usePageSaveOperationScope\(/,
    ],
    [
      "src/features/pharmacy-profile-catalog/presentation/PharmacyCatalogManagerPage.tsx",
      /usePageSaveOperationScope\(/,
    ],
    [
      "src/features/profile/presentation/CustomRequestPageContent.tsx",
      /usePageSaveRegistration\(/,
    ],
    [
      "src/features/auth/presentation/AccountDeletionPageContent.tsx",
      /usePageSaveRegistration\(/,
    ],
    [
      "src/features/dev-tools/presentation/DeveloperCategorySelector.tsx",
      /usePageSaveRegistration\(/,
    ],
  ];

  for (const [filePath, pattern] of registrations) {
    assert.match(read(filePath), pattern, `${filePath} must register a page-save scope`);
  }
}

function main() {
  testNoNativeConfirmations();
  testImageManagerHasNoOwnActionButtons();
  testSuccessFlashOwnsItsTimer();
  testPackageOwnsOperationQueue();
  testDialogExecuteContract();
  testNoDeepImports();
  testNoPageOwnedSaveMessages();
  testLocalRemovalsAreNotLabelledAsDeletes();
  testStagingSurfacesRegisterScopes();
  console.log("page-save ownership tests passed.");
}

main();
