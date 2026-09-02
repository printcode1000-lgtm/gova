import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { formatInspectorOutput, isInspectableId, selectedElementId } from "../presentation/ui-attribute-inspector-model";
import {
  pickIdentifiedElement,
  pickInspectedElement,
} from "../presentation/ui-inspector-element-picker";

/**
 * The DOM inspector, standing on its own.
 *
 * It reads the plain HTML `id` off the selected node and nothing else. There is
 * no registry, catalog, or manifest behind it, so these tests deliberately use
 * bare attribute bags: whatever the DOM carries is the whole truth.
 */

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

// ── Browser-style exact element selection ──────────────────────────────────
// The picker returns the exact node touched, whatever its tag.
for (const tagLike of [
  { nodeType: ELEMENT_NODE, tag: "button" },
  { nodeType: ELEMENT_NODE, tag: "div" },
  { nodeType: ELEMENT_NODE, tag: "span" },
  { nodeType: ELEMENT_NODE, tag: "svg" },
  { nodeType: ELEMENT_NODE, tag: "img" },
  { nodeType: ELEMENT_NODE, tag: "section" },
  { nodeType: ELEMENT_NODE, tag: "dialog" },
  { nodeType: ELEMENT_NODE, tag: "input" },
]) {
  assert.equal(
    pickInspectedElement(tagLike),
    tagLike,
    `A touched <${tagLike.tag}> must be selected exactly, not its nearest ancestor.`,
  );
}

// A text node has no attributes of its own, so it resolves to its parent.
const parentElement = { nodeType: ELEMENT_NODE, tag: "span" };
assert.equal(pickInspectedElement({ nodeType: TEXT_NODE, parentElement }), parentElement);
assert.equal(pickInspectedElement({ nodeType: TEXT_NODE, parentElement: null }), null);
assert.equal(pickInspectedElement(null), null);
assert.equal(pickInspectedElement(undefined), null);
assert.equal(pickInspectedElement({}), null);

// ── Which ids are worth reporting ──────────────────────────────────────────
// Every real HTML id is reported exactly as the DOM carries it.
assert.equal(isInspectableId("auth.otp-input.div"), true);
assert.equal(isInspectableId("shared.ui.progress.indicator"), true);
assert.equal(isInspectableId("registration-store-name"), true);
assert.equal(isInspectableId("otp"), true);
assert.equal(isInspectableId("Private Order 42"), true);
assert.equal(isInspectableId(""), false);

// Internal third-party DOM (for example an SVG path) resolves to the closest
// repository element that owns a real id.
const identifiedRoot = {
  nodeType: ELEMENT_NODE,
  getAttribute: (name: string) => name === "id" ? "toolbar-copy-button-a1b2c3" : null,
  parentElement: null,
};
const internalSvg = {
  nodeType: ELEMENT_NODE,
  getAttribute: () => null,
  parentElement: identifiedRoot,
};
assert.equal(pickIdentifiedElement(identifiedRoot), identifiedRoot);
assert.equal(pickIdentifiedElement(internalSvg), identifiedRoot);
assert.equal(pickIdentifiedElement({ ...internalSvg, parentElement: null }), null);

// ── Inspector output ───────────────────────────────────────────────────────
assert.equal(selectedElementId({ id: "auth.otp-input.div" }), "auth.otp-input.div");
assert.equal(selectedElementId({ id: "Private Order 42" }), "Private Order 42");
assert.equal(selectedElementId({}), null);
assert.equal(selectedElementId(undefined), null);

assert.equal(formatInspectorOutput({ id: "page-save.dialog.execute" }), "page-save.dialog.execute");
assert.equal(formatInspectorOutput({ id: "Private Order 42" }), "Private Order 42");
assert.equal(formatInspectorOutput({}), "مفقود");
assert.equal(formatInspectorOutput(undefined), "مفقود");

// ── The inspector stays decoupled ──────────────────────────────────────────
// Its whole point after the registry was removed is that it depends on nothing
// but the DOM. A reintroduced lookup would make it silently stale again.
const inspectorSource = readFileSync("src/features/super-admin/presentation/SuperAdminUiAttributeInspector.tsx", "utf8");
const modelSource = readFileSync("src/features/super-admin/presentation/ui-attribute-inspector-model.ts", "utf8");
for (const [name, source] of [
  ["inspector", inspectorSource],
  ["model", modelSource],
] as const) {
  assert.doesNotMatch(source, /ui-registry-core|simulation-core/, `${name} must not import a removed package`);
  assert.doesNotMatch(source, /data-ui|data-simulation/, `${name} must not read a removed attribute family`);
}

// The add/register control is gone, and with it any way to enqueue a UI entry.
assert.doesNotMatch(inspectorSource, /Registration|Pending|registry/i, "no registration path may remain");
assert.doesNotMatch(inspectorSource, /<Plus\b/, "the add button must be gone");
assert.match(inspectorSource, /pickIdentifiedElement\(touched\)/, "internal DOM must resolve to the closest id owner");
assert.match(inspectorSource, /event\.stopImmediatePropagation\(\)/, "selection must not trigger or dismiss touched UI");
assert.match(
  inspectorSource,
  /NativeCore\.writeClipboard\(\{ string: text \}\)/,
  "the displayed selected id must be the exact value sent to the clipboard gateway",
);

console.log("ui attribute inspector: all checks passed.");
