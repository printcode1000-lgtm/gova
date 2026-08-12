import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const [sourcePath, outputDirectory, keepCsv, groupNamesCsv = ""] =
  process.argv.slice(2);
if (!sourcePath || !outputDirectory || !keepCsv) {
  throw new Error(
    "Usage: node split-top-level-declarations.mjs <source> <output-dir> <keep-names> [group-names]",
  );
}

const keepNames = new Set(keepCsv.split(",").filter(Boolean));
const configuredGroupNames = groupNamesCsv.split(",").filter(Boolean);
const sourceText = fs.readFileSync(sourcePath, "utf8");
const source = ts.createSourceFile(
  sourcePath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  sourcePath.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
);

function bindingNames(name, result = []) {
  if (ts.isIdentifier(name)) result.push(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) bindingNames(element.name, result);
    }
  }
  return result;
}

function declarationNames(statement) {
  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isInterfaceDeclaration(statement) ||
    ts.isTypeAliasDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  ) {
    return statement.name ? [statement.name.text] : [];
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      bindingNames(declaration.name),
    );
  }
  return [];
}

function moduleImportsFor(directory) {
  return source.statements
    .filter(ts.isImportDeclaration)
    .map((statement) => {
      const moduleName = statement.moduleSpecifier.text;
      if (typeof moduleName !== "string" || !moduleName.startsWith(".")) {
        return statement.getText(source);
      }
      const absoluteModule = path.resolve(path.dirname(sourcePath), moduleName);
      let adjustedModule = path
        .relative(directory, absoluteModule)
        .replaceAll(path.sep, "/");
      if (!adjustedModule.startsWith(".")) adjustedModule = `./${adjustedModule}`;
      return statement
        .getText(source)
        .replace(statement.moduleSpecifier.getText(source), JSON.stringify(adjustedModule));
    })
    .join("\n");
}

function referencedNames(text, candidates) {
  return candidates.filter((name) => new RegExp(`\\b${name}\\b`).test(text));
}

function exportedText(statement) {
  const text = statement.getText(source);
  const hasExport = statement.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
  );
  return hasExport ? text : `export ${text}`;
}

const directives = source.statements.filter(
  (statement) =>
    ts.isExpressionStatement(statement) &&
    ts.isStringLiteral(statement.expression),
);
const imports = source.statements.filter(ts.isImportDeclaration);
const candidates = source.statements.filter(
  (statement) =>
    !directives.includes(statement) &&
    !imports.includes(statement) &&
    declarationNames(statement).length > 0,
);
const moved = candidates.filter(
  (statement) => !declarationNames(statement).some((name) => keepNames.has(name)),
);
const kept = source.statements.filter((statement) => !moved.includes(statement));

const groups = [];
let group = [];
let groupLines = 0;
for (const statement of moved) {
  const lines = statement.getText(source).split(/\r?\n/).length;
  if (group.length > 0 && groupLines + lines > 300) {
    groups.push(group);
    group = [];
    groupLines = 0;
  }
  group.push(statement);
  groupLines += lines;
}
if (group.length > 0) groups.push(group);
if (groups.length === 0) throw new Error("No declarations were selected to move");

fs.mkdirSync(outputDirectory, { recursive: true });
const extension = sourcePath.endsWith("x") ? ".tsx" : ".ts";
const baseName = path.basename(sourcePath, path.extname(sourcePath));
const groupInfo = groups.map((statements, index) => ({
  statements,
  names: statements.flatMap(declarationNames),
  fileName: `${baseName}.${configuredGroupNames[index] ?? `section-${String(index + 1).padStart(2, "0")}`}${extension}`,
}));
const allMovedNames = groupInfo.flatMap(({ names }) => names);
const directiveText = directives.map((statement) => statement.getText(source)).join("\n");

for (const info of groupInfo) {
  const ownText = info.statements.map((statement) => statement.getText(source)).join("\n\n");
  const crossImports = groupInfo
    .filter((other) => other !== info)
    .map((other) => ({
      ...other,
      referenced: referencedNames(ownText, other.names),
    }))
    .filter(({ referenced }) => referenced.length > 0)
    .map(
      ({ fileName, referenced }) =>
        `import { ${referenced.join(", ")} } from "./${path.basename(fileName, extension)}";`,
    )
    .join("\n");
  const declarations = info.statements.map(exportedText).join("\n\n");
  const output = [
    directiveText,
    moduleImportsFor(outputDirectory),
    crossImports,
    declarations,
  ]
    .filter(Boolean)
    .join("\n\n");
  fs.writeFileSync(path.join(outputDirectory, info.fileName), `${output}\n`, "utf8");
}

const keptBody = kept
  .filter((statement) => !directives.includes(statement) && !imports.includes(statement))
  .map((statement) => statement.getText(source))
  .join("\n\n");
let relativeOutput = path
  .relative(path.dirname(sourcePath), outputDirectory)
  .replaceAll(path.sep, "/");
if (!relativeOutput.startsWith(".")) relativeOutput = `./${relativeOutput}`;
const movedImports = groupInfo
  .map(({ fileName, names }) => ({
    fileName,
    names: referencedNames(keptBody, names),
  }))
  .filter(({ names }) => names.length > 0)
  .map(
    ({ fileName, names }) =>
      `import { ${names.join(", ")} } from "${relativeOutput}/${path.basename(fileName, extension)}";`,
  )
  .join("\n");
const movedReExports = groupInfo
  .map(({ fileName, statements }) => ({
    fileName,
    valueNames: statements
      .filter((statement) =>
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        ) &&
        !ts.isInterfaceDeclaration(statement) &&
        !ts.isTypeAliasDeclaration(statement),
      )
      .flatMap(declarationNames),
    typeNames: statements
      .filter(
        (statement) =>
          statement.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
          ) &&
          (ts.isInterfaceDeclaration(statement) ||
            ts.isTypeAliasDeclaration(statement)),
      )
      .flatMap(declarationNames),
  }))
  .flatMap(({ fileName, valueNames, typeNames }) => {
    const moduleName = `${relativeOutput}/${path.basename(fileName, extension)}`;
    return [
      valueNames.length > 0
        ? `export { ${valueNames.join(", ")} } from "${moduleName}";`
        : "",
      typeNames.length > 0
        ? `export type { ${typeNames.join(", ")} } from "${moduleName}";`
        : "",
    ].filter(Boolean);
  })
  .join("\n");
const originalOutput = [
  directiveText,
  moduleImportsFor(path.dirname(sourcePath)),
  movedImports,
  movedReExports,
  keptBody,
]
  .filter(Boolean)
  .join("\n\n");
fs.writeFileSync(sourcePath, `${originalOutput}\n`, "utf8");

console.log(
  `Moved ${moved.length} declarations from ${sourcePath} into ${groups.length} modules.`,
);
