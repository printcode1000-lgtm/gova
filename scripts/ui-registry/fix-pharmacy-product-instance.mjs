import fs from 'node:fs';

function replaceOnce(text, from, to, label) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, got ${count}`);
  return text.replace(from, to);
}

const dialogsPath = 'src/features/pharmacy-profile-catalog/presentation/catalog-manager/PharmacyCatalogManagerPage.dialogs.tsx';
let dialogs = fs.readFileSync(dialogsPath, 'utf8');
dialogs = replaceOnce(
  dialogs,
  'import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";',
  'import { uiAttributes, type UiDescriptor, type UiInstanceId } from "@asol/ui-registry-core";',
  'dialogs import',
);
dialogs = replaceOnce(
  dialogs,
  '  onToggle,\n  toggleUi,\n}: {\n  product: PharmacyProfileCatalogProductView;\n  disabled?: boolean;\n  onToggle: () => void;\n  /** Registered descriptor for this row\'s visibility toggle, from the caller. */\n  toggleUi?: UiDescriptor;\n} & { id?: string }) {',
  '  onToggle,\n  instance,\n}: {\n  product: PharmacyProfileCatalogProductView;\n  disabled?: boolean;\n  onToggle: () => void;\n  /** Opaque runtime identity for this repeated product row. */\n  instance: UiInstanceId;\n} & { id?: string }) {',
  'ProductManagerCard props',
);
const start = dialogs.indexOf('export function ProductManagerCard');
const end = dialogs.indexOf('\nexport function StatusBadge', start);
if (start < 0 || end < 0) throw new Error('ProductManagerCard block not found');
let block = dialogs.slice(start, end);
block = block.replace(/uiAttributes\(\{([^{}]*?)\}\)/g, (match, body) => {
  if (/\binstance\s*:/.test(body)) return match;
  return `uiAttributes({${body}, instance })`;
});
block = replaceOnce(
  block,
  '<StatusBadge hidden={product.status === "hidden"} />',
  '<StatusBadge hidden={product.status === "hidden"} instance={instance} />',
  'product status badge',
);
block = replaceOnce(
  block,
  '<VisibilityButton ui={{ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.visibility-button-Xsep4k", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.visibility-button" }}\n              hidden={product.status === "hidden"}\n              disabled={disabled}\n              onClick={onToggle}\n              ui={toggleUi}\n            />',
  '<VisibilityButton\n              ui={{ uid: "pharmacy-toggle-l9ZwPk", id: "pharmacy-toggle", kind: "item", interaction: { type: "toggle" }, simulation: { kind: "list-item", id: "pharmacy-toggle" }, instance }}\n              hidden={product.status === "hidden"}\n              disabled={disabled}\n              onClick={onToggle}\n            />',
  'product visibility button',
);
dialogs = dialogs.slice(0, start) + block + dialogs.slice(end);
dialogs = replaceOnce(
  dialogs,
  'export function StatusBadge({ id, hidden }: { hidden: boolean } & { id?: string }) {\n  return (\n    <span {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.span.2-AC8Xho", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.span.2" })}',
  'export function StatusBadge({ id, hidden, instance }: { hidden: boolean; instance?: UiInstanceId } & { id?: string }) {\n  return (\n    <span {...uiAttributes({ uid: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.span.2-AC8Xho", id: "pharmacy-profile-catalog.catalog-manager.pharmacy-catalog-manager-page.dialogs.span.2", instance })}',
  'StatusBadge instance',
);
fs.writeFileSync(dialogsPath, dialogs);

const pagePath = 'src/features/pharmacy-profile-catalog/presentation/PharmacyCatalogManagerPage.tsx';
let page = fs.readFileSync(pagePath, 'utf8');
page = replaceOnce(
  page,
  'import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";',
  'import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";',
  'page ui import',
);
page = replaceOnce(
  page,
  '\n\nconst PHARMACY_TOGGLE_UI: UiDescriptor = { uid: "pharmacy-toggle-l9ZwPk", id: "pharmacy-toggle", kind: "item", interaction: { type: "toggle" }, simulation: { kind: "list-item", id: "pharmacy-toggle" } };',
  '',
  'remove PHARMACY_TOGGLE_UI',
);
page = replaceOnce(
  page,
  '                      onToggle={() => toggleProduct(product)}\n                      toggleUi={PHARMACY_TOGGLE_UI}\n',
  '                      onToggle={() => toggleProduct(product)}\n                      instance={createOpaqueUiInstanceId("pharmacy-product", product.id)}\n',
  'product card caller instance',
);
fs.writeFileSync(pagePath, page);

console.log('Scoped repeated pharmacy product cards and preserved pharmacy-toggle simulation identity.');
