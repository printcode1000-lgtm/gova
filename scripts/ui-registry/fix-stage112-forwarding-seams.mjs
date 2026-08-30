import { readFileSync, writeFileSync, existsSync } from "node:fs";

function read(path) { return readFileSync(path, "utf8"); }
function write(path, content) { writeFileSync(path, content); }
function replaceOnce(path, before, after) {
  const source = read(path);
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${path}: expected exactly one match, found ${count}`);
  write(path, source.replace(before, after));
}

const helperPath = "packages/ui-registry-core/src/domain/ui-forwarded-attributes.ts";
const helper = `import { uiAttributes } from "./ui-attributes";\nimport { composeUiInstanceId, type UiInstanceId } from "./ui-instance";\nimport type { UiDataAttributes } from "./ui-data-attributes";\nimport type { UiDescriptor } from "./ui-descriptor";\nimport type { UiState } from "./ui-state";\n\n/**\n * Applies a caller-owned canonical descriptor to the real DOM sink while\n * optionally composing a local repeated-copy instance. The uid/id/interaction\n * metadata remain owned by the caller; only runtime instance scope is added.\n */\nexport function uiForwardedAttributes(\n  ui: UiDescriptor,\n  localInstance?: UiInstanceId,\n  state?: UiState,\n): UiDataAttributes {\n  const instance = localInstance\n    ? composeUiInstanceId(ui.instance, localInstance)\n    : ui.instance;\n  return uiAttributes({\n    ...ui,\n    ...(instance ? { instance } : {}),\n    ...(state !== undefined ? { state } : {}),\n  });\n}\n`;
if (!existsSync(helperPath) || read(helperPath) !== helper) write(helperPath, helper);

const indexPath = "packages/ui-registry-core/src/index.ts";
if (!read(indexPath).includes('export { uiForwardedAttributes } from "./domain/ui-forwarded-attributes";')) {
  replaceOnce(indexPath,
    'export { uiAttributes } from "./domain/ui-attributes";\n',
    'export { uiAttributes } from "./domain/ui-attributes";\nexport { uiForwardedAttributes } from "./domain/ui-forwarded-attributes";\n');
}

const analyzerPath = "packages/architecture-core/src/dom-identity/analyzer.ts";
replaceOnce(analyzerPath,
`function spreadRegistrationKind(property: ts.JsxSpreadAttribute): UiRegistrationKind | null {\n  const expression = property.expression;\n  if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return null;\n  if (expression.expression.text !== 'uiAttributes' && expression.expression.text !== 'uiPageAttributes') return null;\n  const descriptor = expression.arguments[0];\n  if (isCanonicalLiteralDescriptor(descriptor)) return 'literal';\n  if (descriptor && ts.isIdentifier(descriptor) && descriptor.text === 'ui') return 'forwarded';\n  return 'computed';\n}`,
`function spreadRegistrationKind(property: ts.JsxSpreadAttribute): UiRegistrationKind | null {\n  const expression = property.expression;\n  if (!ts.isCallExpression(expression) || !ts.isIdentifier(expression.expression)) return null;\n  const callName = expression.expression.text;\n  if (callName !== 'uiAttributes' && callName !== 'uiPageAttributes' && callName !== 'uiForwardedAttributes') return null;\n  const descriptor = expression.arguments[0];\n  if (isCanonicalLiteralDescriptor(descriptor)) return 'literal';\n  if (descriptor && ts.isIdentifier(descriptor) && descriptor.text === 'ui') return 'forwarded';\n  return 'computed';\n}`);

const definitionPath = "packages/architecture-core/src/dom-identity/component-definition.ts";
replaceOnce(definitionPath,
"const UI_REGISTRY_CALL_NAMES = new Set(['uiAttributes', 'uiComponentAttributes', 'uiPrimitiveAttributes']);",
"const UI_REGISTRY_CALL_NAMES = new Set(['uiAttributes', 'uiComponentAttributes', 'uiPrimitiveAttributes', 'uiForwardedAttributes']);");

const categoryPath = "src/shared/ui/category-tabs-strip.tsx";
replaceOnce(categoryPath,
'import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";',
'import { createOpaqueUiInstanceId, uiAttributes, uiForwardedAttributes, type UiDescriptor } from "@asol/ui-registry-core";');
replaceOnce(categoryPath, '  itemUi?: UiDescriptor;\n', '  itemUi: UiDescriptor;\n');
replaceOnce(categoryPath, '  itemUi,\n', '  itemUi: ui,\n');
replaceOnce(categoryPath,
'          {...(itemUi ? uiAttributes(itemUi) : {})}\n',
'          {...uiForwardedAttributes(ui, createOpaqueUiInstanceId("category-tab", item.id))}\n');

const profileProductsPath = "src/features/profile-products/presentation/ProfileProductsTabs.tsx";
replaceOnce(profileProductsPath,
`        selectedId={selectedMainId}\n        snapshotId={\`profile-products-main-\${mode}-\${ownerUid}\`}\n        onSelect={onSelectMain}`,
`        selectedId={selectedMainId}\n        snapshotId={\`profile-products-main-\${mode}-\${ownerUid}\`}\n        itemUi={{ uid: "profile-products.main-tab-4Qm8ZK", id: "profile-products.main-tab", kind: "item" }}\n        onSelect={onSelectMain}`);
replaceOnce(profileProductsPath,
`          selectedId={selectedSubId}\n          snapshotId={\`profile-products-sub-\${mode}-\${ownerUid}\`}\n          onSelect={onSelectSub}`,
`          selectedId={selectedSubId}\n          snapshotId={\`profile-products-sub-\${mode}-\${ownerUid}\`}\n          itemUi={{ uid: "profile-products.sub-tab-7Nv2XP", id: "profile-products.sub-tab", kind: "item" }}\n          onSelect={onSelectSub}`);

const workingHoursPath = "src/features/profile-working-hours/presentation/WorkingHoursCard.tsx";
replaceOnce(workingHoursPath,
`        selectedId={selectedDayId}\n        onSelect={(dayId) => setSelectedDayId(dayId as WorkingDayId)}`,
`        selectedId={selectedDayId}\n        itemUi={{ uid: "profile-working-hours.day-tab-5Kt9RM", id: "profile-working-hours.day-tab", kind: "item" }}\n        onSelect={(dayId) => setSelectedDayId(dayId as WorkingDayId)}`);

const phonePath = "src/shared/ui/phone-field.tsx";
replaceOnce(phonePath,
'import { uiPrimitiveAttributes } from "./ui-primitive-attributes";\nimport { uiAttributes } from "@asol/ui-registry-core";',
'import { uiAttributes, uiForwardedAttributes } from "@asol/ui-registry-core";');
replaceOnce(phonePath, '  ui?: UiDescriptor;\n', '  ui: UiDescriptor;\n');
replaceOnce(phonePath,
'        {...uiPrimitiveAttributes("input", ui, disabled ? "disabled" : undefined)}\n',
'        {...uiForwardedAttributes(ui, undefined, disabled ? "disabled" : undefined)}\n');

const storagePath = "packages/storage-image-manager-core/src/components/StorageImageManager.tsx";
replaceOnce(storagePath,
'import { isUiUid, uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";',
'import { createOpaqueUiInstanceId, isUiUid, uiAttributes, uiForwardedAttributes, type UiDescriptor } from "@asol/ui-registry-core";');
replaceOnce(storagePath,
`  const t = translate ?? defaultTranslate;\n  const inputRef = React.useRef<HTMLInputElement>(null);`,
`  const t = translate ?? defaultTranslate;\n  const slotUiInstance = createOpaqueUiInstanceId("storage-image-slot", \`${'${config.id}'}:${'${index}'}\`);\n  const ui = index === 0 ? config.ui : undefined;\n  const inputRef = React.useRef<HTMLInputElement>(null);`);
replaceOnce(storagePath,
`  const removeCurrent = (event: React.MouseEvent<HTMLButtonElement>) => {`,
`  const handleDeviceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {\n    const file = event.target.files?.[0];\n    traceStorageImageManager(config.id, "web-file-input-changed", {\n      index,\n      selected: Boolean(file),\n    });\n    if (file && canChoose) {\n      setStage("selecting");\n      void processFile(file);\n    }\n    event.target.value = "";\n  };\n\n  const removeCurrent = (event: React.MouseEvent<HTMLButtonElement>) => {`);
replaceOnce(storagePath,
`      <input\n        ref={inputRef}\n        {...(index === 0 && config.ui ? uiAttributes(config.ui) : {})}\n        type="file"\n        accept="image/*"\n        className="hidden"\n        onChange={(event) => {\n          const file = event.target.files?.[0];\n          traceStorageImageManager(config.id, "web-file-input-changed", {\n            index,\n            selected: Boolean(file),\n          });\n          if (file && canChoose) {\n            setStage("selecting");\n            void processFile(file);\n          }\n          event.target.value = "";\n        }}\n        disabled={busy}\n      />`,
`      {ui ? (\n        <input\n          ref={inputRef}\n          {...uiForwardedAttributes(ui, slotUiInstance)}\n          type="file"\n          accept="image/*"\n          className="hidden"\n          onChange={handleDeviceFileChange}\n          disabled={busy}\n        />\n      ) : (\n        <input\n          ref={inputRef}\n          {...uiAttributes({ uid: "packages.storage-image-manager-core.storage-image-manager.input.2-K7mQ4P", id: "packages.storage-image-manager-core.storage-image-manager.input.2", instance: slotUiInstance })}\n          type="file"\n          accept="image/*"\n          className="hidden"\n          onChange={handleDeviceFileChange}\n          disabled={busy}\n        />\n      )}`);

console.log("Stage 112 forwarding seams applied.");
