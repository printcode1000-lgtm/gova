import fs from 'node:fs';

function replaceExact(path, from, to, label) {
  let source = fs.readFileSync(path, 'utf8');
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  source = source.replace(from, to);
  fs.writeFileSync(path, source);
}

const headerPath = 'src/shared/layouts/AppHeader.tsx';
replaceExact(
  headerPath,
  `<Link {...uiAttributes({ uid: 'home-search-r8SiS9', id: 'home-search', kind: 'action', interaction: { type: 'tap' }, simulation: { kind: 'event', id: 'home-search' } })}\n              {...uiAttributes({ uid: 'app.header.search-C0Ynx3', id: 'app.header.search', kind: 'action', action: 'navigate-search', part: 'search' })}`,
  `<Link {...uiAttributes({ uid: 'home-search-r8SiS9', id: 'home-search', kind: 'action', action: 'navigate-search', part: 'search', interaction: { type: 'tap' }, simulation: { kind: 'event', id: 'home-search' } })}`,
  'merge search identity',
);
replaceExact(
  headerPath,
  `<Link {...uiAttributes({ uid: 'nav-cart-a5OnHB', id: 'nav-cart', kind: 'action', interaction: { type: 'tap' }, simulation: { kind: 'event', id: 'nav-cart' } })}\n              {...uiAttributes({ uid: 'app.header.cart-Y4wePh', id: 'app.header.cart', kind: 'action', action: 'navigate-cart', part: 'cart' })}`,
  `<Link {...uiAttributes({ uid: 'nav-cart-a5OnHB', id: 'nav-cart', kind: 'action', action: 'navigate-cart', part: 'cart', interaction: { type: 'tap' }, simulation: { kind: 'event', id: 'nav-cart' } })}`,
  'merge cart identity',
);

const guardPath = 'packages/architecture-core/src/checks/ui-attribute-contract.ts';
let guard = fs.readFileSync(guardPath, 'utf8');
const guardAnchor = `function scanKeyAfterSpread(file: string, sourceFile: ts.SourceFile): void {`;
if (!guard.includes(guardAnchor)) throw new Error('UI guard anchor missing');
if (!guard.includes('function scanMultipleUiDescriptorSources(')) {
  const helper = `function scanMultipleUiDescriptorSources(file: string, sourceFile: ts.SourceFile): void {\n  function visit(node: ts.Node): void {\n    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {\n      const sources: Array<{ line: number; label: string }> = [];\n      for (const property of node.attributes.properties) {\n        if (ts.isJsxSpreadAttribute(property) && isRegistryCall(property.expression)) {\n          sources.push({\n            line: sourceFile.getLineAndCharacterOfPosition(property.getStart()).line + 1,\n            label: property.expression.expression.getText(sourceFile),\n          });\n          continue;\n        }\n        if (ts.isJsxAttribute(property) && property.name.getText(sourceFile) === \"ui\") {\n          sources.push({\n            line: sourceFile.getLineAndCharacterOfPosition(property.getStart()).line + 1,\n            label: \"ui prop\",\n          });\n        }\n      }\n      if (sources.length > 1) {\n        const first = sources[0]!;\n        const rest = sources.slice(1).map((source) => \`${'${'}source.label} at line ${'${'}source.line}\`).join(\", \" );\n        addViolation(\n          \"UI Attributes\",\n          file,\n          \`JSX element has multiple UiRegistry descriptor sources: ${'${'}first.label} at line ${'${'}first.line}, ${'${'}rest}. Merge them into one canonical descriptor source.\`,\n        );\n      }\n    }\n    ts.forEachChild(node, visit);\n  }\n  visit(sourceFile);\n}\n\n`;
  guard = guard.replace(guardAnchor, helper + guardAnchor);
}
const callAnchor = `      scanDuplicateJsxAttributes(file, sourceFile);\n      scanKeyAfterSpread(file, sourceFile);`;
if (!guard.includes(callAnchor)) throw new Error('UI guard invocation anchor missing');
guard = guard.replace(
  callAnchor,
  `      scanDuplicateJsxAttributes(file, sourceFile);\n      scanMultipleUiDescriptorSources(file, sourceFile);\n      scanKeyAfterSpread(file, sourceFile);`,
);
fs.writeFileSync(guardPath, guard);

const testPath = 'packages/architecture-core/src/tests/ui-attribute-guard.test.ts';
let test = fs.readFileSync(testPath, 'utf8');
const probeAnchor = `  // An unregistered generic fallback is legitimate and must not be reported.\n  \"fallback.tsx\":`;
if (!test.includes(probeAnchor)) throw new Error('UI guard probe anchor missing');
if (!test.includes('multiple-ui-sources.tsx')) {
  const probes = `  // Two registry sources on one JSX element race; the last spread silently wins.\n  \"multiple-ui-sources.tsx\":\n    'import { uiAttributes } from \"@asol/ui-registry-core\";\\n' +\n    'export const Multi = () => <i {...uiAttributes({ uid: \"probe.multi-one-A1b2C3\", id: \"probe.multi-one\" })} {...uiAttributes({ uid: \"probe.multi-two-D4e5F6\", id: \"probe.multi-two\" })} />;\\n',\n  // A caller-owned ui prop and emitted registry attributes are also competing identity sources.\n  \"ui-plus-spread.tsx\":\n    'import { uiAttributes } from \"@asol/ui-registry-core\";\\n' +\n    'const Box = (props: any) => <div {...props} />;\\n' +\n    'export const MultiProp = () => <Box ui={{ uid: \"probe.multi-prop-G7h8I9\", id: \"probe.multi-prop\" }} {...uiAttributes({ uid: \"probe.multi-spread-J1k2L3\", id: \"probe.multi-spread\" })} />;\\n',\n`;
  test = test.replace(probeAnchor, probes + probeAnchor);
}
const assertionAnchor = `  [\"a key written after the spread\", /key-after-spread\\.tsx[^\\n]*key follows the uiAttributes spread/],`;
if (!test.includes(assertionAnchor)) throw new Error('UI guard assertion anchor missing');
if (!test.includes('["multiple registry descriptor sources"')) {
  test = test.replace(
    assertionAnchor,
    `${assertionAnchor}\n  [\"multiple registry descriptor sources\", /multiple-ui-sources\\.tsx[^\\n]*multiple UiRegistry descriptor sources/],\n  [\"ui prop plus registry spread\", /ui-plus-spread\\.tsx[^\\n]*multiple UiRegistry descriptor sources/],`,
  );
}
fs.writeFileSync(testPath, test);

console.log('Stage 124 single UI descriptor source patch prepared.');
