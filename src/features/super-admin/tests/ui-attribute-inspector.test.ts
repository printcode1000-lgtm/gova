import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { isUiUid, parseUiUid } from "@asol/ui-registry-core";

import {
  formatInspectorOutput,
  formatUiAttributes,
  selectedUiUid,
} from "../presentation/ui-attribute-inspector-model";
import { pickInspectedElement } from "../presentation/ui-inspector-element-picker";
import { buildRegistrationProposal } from "../presentation/ui-registration-proposal";

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

/** Deterministic random source: proposals must be reproducible in tests. */
function sequenceRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function proposalFor(attributes: Record<string, string>): string {
  return buildRegistrationProposal(attributes, sequenceRandom(20260826));
}

function uidOfProposal(proposal: string): string {
  return proposal.match(/uid: "([^"]+)"/)?.[1] ?? "";
}

assert.equal(
  formatUiAttributes({
    "data-ui-state": "loading",
    class: "ignored",
    "data-ui-id": "orders.details",
    "data-ui": "page",
  }),
  'data-ui="page"\ndata-ui-id="orders.details"\ndata-ui-state="loading"',
);
assert.equal(formatUiAttributes({ id: "private-value" }), "");

// ── Browser-style exact element selection ──────────────────────────────────
// The picker returns the exact node touched, whatever its tag or registration.
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
    `A touched <${tagLike.tag}> must be selected exactly, not its nearest registered ancestor.`,
  );
}

// A text node has no attributes of its own, so it resolves to its parent.
const parentElement = { nodeType: ELEMENT_NODE, tag: "span" };
assert.equal(pickInspectedElement({ nodeType: TEXT_NODE, parentElement }), parentElement);
assert.equal(pickInspectedElement({ nodeType: TEXT_NODE, parentElement: null }), null);
assert.equal(pickInspectedElement(null), null);
assert.equal(pickInspectedElement(undefined), null);
assert.equal(pickInspectedElement({}), null);

// ── Inspector output ───────────────────────────────────────────────────────
const registered = {
  "data-ui-uid": "page-save.dialog.execute-Ox5spc",
  "data-ui": "action",
  "data-ui-id": "page-save.dialog.execute",
  "data-ui-action": "execute",
  "data-ui-part": "confirm",
  "data-simulation-target": "page-save-execute",
};
assert.equal(selectedUiUid(registered), "page-save.dialog.execute-Ox5spc");
const registeredOutput = formatInspectorOutput(registered, [
  registered,
  { "data-ui-uid": "page-save.dialog-CfGhr4", "data-ui": "region" },
]);
assert.equal(
  registeredOutput.split("\n")[0],
  'data-ui-uid="page-save.dialog.execute-Ox5spc"',
  "The uid must be the first line of the inspector output.",
);
assert.match(registeredOutput, /data-simulation-target="page-save-execute"/);
assert.match(registeredOutput, /-- parent --/);

// An unregistered element is still selected, still outlined, and still copied;
// only its uid is reported as missing.
const unregistered = { "data-ui": "component", "data-ui-component": "button" };
assert.equal(selectedUiUid(unregistered), null);
assert.equal(selectedUiUid(undefined), null);
const unregisteredOutput = formatInspectorOutput(unregistered, [unregistered]);
assert.equal(unregisteredOutput.split("\n")[0], "data-ui-uid=(missing)");
assert.match(unregisteredOutput, /data-ui-component="button"/);
// An element with no UiRegistry metadata at all still reports a missing uid.
assert.equal(formatInspectorOutput(undefined, []), "data-ui-uid=(missing)");

// An ancestor's uid is the ancestor's: an unregistered element that merely sits
// inside a registered region must still report a missing uid.
const insideRegisteredRegion = formatInspectorOutput({}, [
  { "data-ui-uid": "page-save.dialog-CfGhr4", "data-ui": "region" },
]);
assert.equal(insideRegisteredRegion.split("\n")[0], "data-ui-uid=(missing)");
assert.match(insideRegisteredRegion, /page-save\.dialog-CfGhr4/);

// ── Add to UiRegistry proposal ─────────────────────────────────────────────
const fullProposal = proposalFor({
  "data-ui": "action",
  "data-ui-id": "orders.cancel",
  "data-ui-action": "cancel",
  "data-ui-part": "footer",
  "data-ui-state": "idle empty",
  "data-simulation-target": "order-cancel",
});
const proposedUid = uidOfProposal(fullProposal);
assert.ok(isUiUid(proposedUid), `${proposedUid} must be a newly generated uid.`);
assert.equal(parseUiUid(proposedUid)?.prefix, "orders.cancel");
assert.equal(
  fullProposal,
  [
    "uiAttributes({",
    `  uid: ${JSON.stringify(proposedUid)},`,
    '  id: "orders.cancel",',
    '  kind: "action",',
    '  action: "cancel",',
    '  part: "footer",',
    '  state: ["idle", "empty"],',
    '  simulation: { kind: "event", id: "order-cancel" },',
    "})",
  ].join("\n"),
);

// Two proposals never mint the same uid.
const firstUid = uidOfProposal(buildRegistrationProposal({ "data-ui-id": "a.b" }, sequenceRandom(1)));
const secondUid = uidOfProposal(buildRegistrationProposal({ "data-ui-id": "a.b" }, sequenceRandom(2)));
assert.notEqual(firstUid, secondUid);

// Unknown semantics are marked TODO per field; nothing is invented.
const fallbackProposal = proposalFor(unregistered);
assert.match(fallbackProposal, /id: "TODO",/);
assert.match(fallbackProposal, /kind: "component",/);
assert.match(fallbackProposal, /Unregistered button fallback/);
assert.equal(parseUiUid(uidOfProposal(fallbackProposal))?.prefix, "button");
// With no safe identity at all the uid still parses, under a TODO prefix.
const bareProposal = proposalFor({});
assert.equal(parseUiUid(uidOfProposal(bareProposal))?.prefix, "todo");
assert.match(bareProposal, /id: "TODO",/);
assert.match(bareProposal, /kind: "TODO",/);

// Unsafe values are never carried into a proposal.
const unsafeProposal = proposalFor({
  "data-ui": "action",
  "data-ui-id": "Private Order 42",
  "data-ui-action": "Cancel Order",
  "data-ui-state": "Loading Orders",
  title: "user content",
  href: "https://example.test/orders?token=secret",
  value: "01000000000",
});
assert.match(unsafeProposal, /id: "TODO",/);
assert.match(unsafeProposal, /action: "TODO",/);
assert.doesNotMatch(
  unsafeProposal,
  /Private Order 42|Cancel Order|user content|example\.test|secret|01000000000/,
);

// All five simulation kinds survive a proposal round trip.
for (const [attribute, kind] of [
  ["data-simulation-target", "event"],
  ["data-simulation-field", "field"],
  ["data-simulation-list-item", "list-item"],
  ["data-simulation-file", "file"],
  ["data-simulation-state", "state"],
] as const) {
  assert.match(
    proposalFor({ "data-ui-id": "sample.control", [attribute]: "sample-id" }),
    new RegExp(`simulation: \\{ kind: "${kind}", id: "sample-id" \\}`),
  );
}

// ── Component contract ─────────────────────────────────────────────────────
const inspectorSource = readFileSync(
  path.join(
    process.cwd(),
    "src/features/super-admin/presentation/SuperAdminUiAttributeInspector.tsx",
  ),
  "utf8",
);
assert.match(inspectorSource, /addEventListener\("pointerdown", onPointerDown, true\)/);
assert.match(inspectorSource, /addEventListener\("click", onClickCapture, true\)/);
assert.match(inspectorSource, /NativeCore\.writeClipboard/);
// Selection uses the exact-element picker, and the outline is applied to that
// same element before its uid is known.
assert.match(inspectorSource, /const selected = pickInspectedElement\(event\.target\);/);
assert.match(inspectorSource, /selected\.style\.outline = "3px solid var\(--color-primary\)"/);
assert.match(inspectorSource, /const ownAttributes = attributesFor\(selected\);/);
assert.match(inspectorSource, /setSelectedAttributes\(ownAttributes\)/);
// The Add-to-UiRegistry decision reads only the selected element's own
// attributes, so an ancestor uid can never hide a missing registration.
assert.match(inspectorSource, /selectedUiUid\(selectedAttributes\) === null/);
assert.doesNotMatch(inspectorSource, /nearestInspectableElement/);
// Selecting never activates the element beneath the pointer.
assert.equal(inspectorSource.match(/event\.preventDefault\(\);/g)?.length, 2);
assert.equal(inspectorSource.match(/event\.stopImmediatePropagation\(\);/g)?.length, 2);

// The Add to UiRegistry control exists, is excluded from selection, copies a
// proposal, and never writes to the page or to source files.
assert.match(inspectorSource, /missingUid \? \(/);
assert.match(inspectorSource, /onClick=\{copyRegistrationProposal\}/);
assert.match(inspectorSource, /buildRegistrationProposal\(selectedAttributes, Math\.random\)/);
const addUidBlock = inspectorSource.slice(
  inspectorSource.indexOf("{missingUid ? ("),
  inspectorSource.indexOf('          uid: "super-admin.ui-inspector.toggle'),
);
assert.match(addUidBlock, /INSPECTOR_CONTROL_ATTRIBUTE\]: "true"/);
assert.match(addUidBlock, /aria-label=/);
assert.match(addUidBlock, /active:scale-95/);
// Built from parts so this assertion does not itself write a desktop-only
// token that the touch-interaction guard would reject.
const DESKTOP_ONLY = new RegExp([`hover${":"}`, `cursor-${"pointer"}`, "title="].join("|"));
assert.doesNotMatch(addUidBlock, DESKTOP_ONLY);
// Both capture handlers ignore the inspector's own controls, so neither button
// can select itself or fire the element beneath it.
assert.equal(inspectorSource.match(/isInspectorControl\((?:selected|clicked)\)/g)?.length, 2);
assert.match(
  inspectorSource,
  /return element !== null && element\.closest\(`\[\$\{INSPECTOR_CONTROL_ATTRIBUTE\}\]`\) !== null;/,
);

console.log("Super-admin UI attribute inspector contract tests passed.");
