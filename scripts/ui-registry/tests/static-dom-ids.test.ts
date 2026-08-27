import assert from "node:assert/strict";

import { fileSemanticPrefix } from "../static-dom-ids/file-semantic";
import { literalHtmlIds } from "../static-dom-ids/literal-html-ids";
import {
  applyStaticDomIdEdits,
  planStaticDomIds,
} from "../static-dom-ids/plan-static-dom-ids";
import { applyDomIdForwarding, componentForwardsDomId } from "../static-dom-ids/dom-id-forwarding";
import { duplicateLiteralIds } from "../static-dom-ids/apply-to-repo";
import { isUiUidPrefix } from "@asol/ui-registry-core";

function plan(files: Record<string, string>) {
  return planStaticDomIds(new Map(Object.entries(files)));
}

assert.equal(
  fileSemanticPrefix("src/features/super-admin/presentation/SuperAdminFeaturedMarqueePage.tsx"),
  "super-admin.super-admin-featured-marquee-page",
);

const uniquePage = plan({
  "src/app/demo/page.tsx": `
export default function Page() {
  return (
    <section>
      <h2>Title</h2>
      <p>Hint</p>
      {items.map((item) => (
        <div key={item}>{item}</div>
      ))}
    </section>
  );
}
const items = ["a"];
`,
});
assert.equal(uniquePage.filter((edit) => edit.tag === "div").length, 0);
assert.ok(uniquePage.some((edit) => edit.tag === "h2"));
assert.ok(uniquePage.some((edit) => edit.tag === "p"));
assert.ok(uniquePage.some((edit) => edit.tag === "section"));
for (const edit of uniquePage) {
  assert.ok(isUiUidPrefix(edit.id), edit.id);
}

const repeatingShared = plan({
  "src/app/x/page.tsx": `
import { Card } from "@/features/demo/Card";
export default function Page() {
  return (
    <>
      <Card />
      <Card />
    </>
  );
}
`,
  "src/features/demo/Card.tsx": `
export function Card() {
  return <div className="card">once per use</div>;
}
`,
});
assert.equal(
  repeatingShared.filter((edit) => edit.file.includes("Card") && edit.tag === "div").length,
  0,
  "hosts inside a component used twice must not receive a literal id",
);
assert.equal(
  repeatingShared.filter((edit) => edit.file.includes("page.tsx") && edit.tag === "Card").length,
  2,
  "each static usage of a repeating component must receive its own id",
);

const barrel = plan({
  "src/app/b/page.tsx": `
import { Banner } from "@/features/demo/ui";
export default function Page() {
  return <Banner />;
}
`,
  "src/features/demo/ui.ts": `
export * from "./Banner";
`,
  "src/features/demo/Banner.tsx": `
export function Banner() {
  return <section><h2>T</h2></section>;
}
`,
});
assert.ok(barrel.some((edit) => edit.file.includes("Banner") && edit.tag === "h2"));

const twoDoors = plan({
  "src/app/one/page.tsx": `
import { Banner } from "@/features/demo/ui";
export default function Page() {
  return <Banner />;
}
`,
  "src/app/two/page.tsx": `
import { Panel } from "@/features/demo/ui";
export default function Page() {
  return <Panel />;
}
`,
  "src/features/demo/ui.ts": `
export * from "./Banner";
export * from "./Panel";
`,
  "src/features/demo/Banner.tsx": `
export function Banner() {
  return <h2>b</h2>;
}
`,
  "src/features/demo/Panel.tsx": `
export function Panel() {
  return <h2>p</h2>;
}
`,
});
assert.ok(twoDoors.some((edit) => edit.file.includes("Banner")));
assert.ok(twoDoors.some((edit) => edit.file.includes("Panel")));


const singleShared = plan({
  "src/app/x/page.tsx": `
import { Banner } from "@/features/demo/Banner";
export default function Page() {
  return <Banner />;
}
`,
  "src/features/demo/Banner.tsx": `
export function Banner() {
  return <div className="banner"><p>hello</p></div>;
}
`,
});
assert.ok(singleShared.some((edit) => edit.file.includes("Banner") && edit.tag === "div"));
assert.ok(singleShared.some((edit) => edit.file.includes("Banner") && edit.tag === "p"));
assert.equal(
  singleShared.filter((edit) => edit.tag === "Banner").length,
  0,
  "a component used once keeps inner host ids; the usage site is not minted",
);

const localHelper = plan({
  "src/app/y/page.tsx": `
function Icon() {
  return <span>i</span>;
}
export default function Page() {
  return (
    <div>
      <h2>Once</h2>
      <Icon />
      <Icon />
    </div>
  );
}
`,
});
assert.equal(localHelper.filter((edit) => edit.tag === "span").length, 0);
assert.ok(localHelper.some((edit) => edit.tag === "h2"));
assert.equal(localHelper.filter((edit) => edit.tag === "Icon").length, 2);

const mappedComponent = plan({
  "src/app/z/page.tsx": `
import { Row } from "@/features/demo/Row";
export default function Page() {
  return items.map((item) => <Row key={item} />);
}
const items = ["a", "b"];
`,
  "src/features/demo/Row.tsx": `
export function Row() {
  return <p>row</p>;
}
`,
});
assert.equal(mappedComponent.filter((edit) => edit.file.includes("Row")).length, 0);
assert.equal(
  mappedComponent.filter((edit) => edit.tag === "Row").length,
  0,
  "a mapped usage must not receive a literal id",
);

const staticButtons = plan({
  "src/app/p/page.tsx": `
import { Button } from "@/shared/ui/button";
export default function Page() {
  return (
    <div>
      <Button>Save</Button>
      <Button>Cancel</Button>
      {items.map((item) => (
        <Button key={item}>{item}</Button>
      ))}
    </div>
  );
}
const items = ["a"];
`,
  "src/shared/ui/button.tsx": `
export function Button(props: { children?: unknown }) {
  return <button {...props} />;
}
`,
});
assert.equal(
  staticButtons.filter((edit) => edit.file.includes("button.tsx")).length,
  0,
  "shared primitives never bake a literal id",
);
assert.equal(staticButtons.filter((edit) => edit.tag === "Button").length, 2);
assert.equal(staticButtons.filter((edit) => edit.tag === "button").length, 0);

const skipNonDom = plan({
  "src/app/q/page.tsx": `
import { Select } from "@/shared/ui/select";
export default function Page() {
  return <Select />;
}
`,
  "src/shared/ui/select.tsx": `
export function Select({ children }: { children?: unknown }) {
  return children;
}
`,
});
assert.equal(skipNonDom.filter((edit) => edit.tag === "Select").length, 0);

const skipExisting = plan({
  "src/app/w/page.tsx": `
export default function Page() {
  return <p id="already.there">x</p>;
}
`,
});
assert.equal(skipExisting.length, 0);

const skipSpread = plan({
  "src/app/s/page.tsx": `
export default function Page() {
  return <div {...props} />;
}
const props = {};
`,
});
assert.equal(skipSpread.length, 0);

const applied = applyStaticDomIdEdits(
  new Map([["src/app/a/page.tsx", "export default function Page() {\n  return <h2>T</h2>;\n}\n"]]),
  plan({ "src/app/a/page.tsx": "export default function Page() {\n  return <h2>T</h2>;\n}\n" }),
);
const html = applied.get("src/app/a/page.tsx")!;
assert.match(html, /<h2 id="[^"]+">T<\/h2>/);
assert.equal(duplicateLiteralIds(applied).length, 0);
assert.equal(literalHtmlIds(html).length, 1);

assert.equal(
  componentForwardsDomId(
    `export function Button(props: { children?: unknown }) { return <button {...props} />; }`,
    "src/shared/ui/button.tsx",
    "Button",
  ),
  true,
);
assert.equal(
  componentForwardsDomId(
    `export function Card() { return <div className="card" />; }`,
    "src/features/demo/Card.tsx",
    "Card",
  ),
  false,
);
const forwarded = applyDomIdForwarding(
  `export function Card() { return <div className="card" />; }`,
  "src/features/demo/Card.tsx",
  "Card",
);
assert.match(forwarded, /id=\{id\}/);
assert.equal(componentForwardsDomId(forwarded, "src/features/demo/Card.tsx", "Card"), true);

console.log("static-dom-ids tests passed.");
