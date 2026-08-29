import fs from 'node:fs';

const path = 'packages/architecture-core/src/checks/ui-attribute-contract.ts';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, got ${count}`);
  source = source.replace(from, to);
}

replaceOnce(
  'function scanKeyAfterSpread(file: string, sourceFile: ts.SourceFile): void {',
  `function scanDuplicateJsxAttributes(file: string, sourceFile: ts.SourceFile): void {\n  function visit(node: ts.Node): void {\n    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {\n      const firstByName = new Map<string, ts.JsxAttribute>();\n      for (const property of node.attributes.properties) {\n        if (!ts.isJsxAttribute(property)) continue;\n        const name = property.name.getText(sourceFile);\n        const first = firstByName.get(name);\n        if (first) {\n          const line = sourceFile.getLineAndCharacterOfPosition(property.getStart()).line + 1;\n          const firstLine = sourceFile.getLineAndCharacterOfPosition(first.getStart()).line + 1;\n          addViolation(\"UI Attributes\", file, \`Duplicate JSX attribute \"\${name}\" at line \${line}; first declared at line \${firstLine}.\`);\n        } else {\n          firstByName.set(name, property);\n        }\n      }\n    }\n    ts.forEachChild(node, visit);\n  }\n  visit(sourceFile);\n}\n\nfunction scanKeyAfterSpread(file: string, sourceFile: ts.SourceFile): void {`,
  'insert duplicate JSX guard',
);

replaceOnce(
  '      scanManualAttributes(file, sourceFile);\n      scanKeyAfterSpread(file, sourceFile);',
  '      scanManualAttributes(file, sourceFile);\n      scanDuplicateJsxAttributes(file, sourceFile);\n      scanKeyAfterSpread(file, sourceFile);',
  'invoke duplicate JSX guard',
);

fs.writeFileSync(path, source);
console.log('Added permanent AST duplicate JSX attribute guard.');
