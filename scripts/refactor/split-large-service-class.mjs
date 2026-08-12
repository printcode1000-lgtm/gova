import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const [sourcePath, partsDirectory, exportedClassName, singletonStatement = ""] =
  process.argv.slice(2);

if (!sourcePath || !partsDirectory || !exportedClassName) {
  throw new Error(
    "Usage: node split-large-service-class.mjs <source> <parts-dir> <class> [singleton-statement]",
  );
}

const sourceText = fs.readFileSync(sourcePath, "utf8");
const source = ts.createSourceFile(
  sourcePath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  sourcePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
);
const classNode = source.statements.find(
  (statement) =>
    ts.isClassDeclaration(statement) &&
    statement.name?.text === exportedClassName,
);

if (!classNode) throw new Error(`Class ${exportedClassName} was not found`);
const originalHeritage = classNode.heritageClauses
  ?.map((clause) => clause.getText(source))
  .join(" ");

const imports = source.statements
  .filter(ts.isImportDeclaration)
  .map((statement) => {
    const moduleName = statement.moduleSpecifier.text;
    if (typeof moduleName !== "string" || !moduleName.startsWith(".")) {
      return statement.getText(source);
    }
    const absoluteModule = path.resolve(path.dirname(sourcePath), moduleName);
    let adjustedModule = path
      .relative(partsDirectory, absoluteModule)
      .replaceAll(path.sep, "/");
    if (!adjustedModule.startsWith(".")) adjustedModule = `./${adjustedModule}`;
    return statement
      .getText(source)
      .replace(statement.moduleSpecifier.getText(source), JSON.stringify(adjustedModule));
  })
  .join("\n");
const sharedDeclarations = source.statements
  .filter(
    (statement) =>
      statement !== classNode &&
      !ts.isImportDeclaration(statement) &&
      statement.end <= classNode.getStart(source),
  )
  .map((statement) => statement.getText(source))
  .join("\n");

const memberGroups = [];
let currentGroup = [];
let currentLines = 0;
for (const member of classNode.members) {
  const memberText = member.getText(source);
  const memberLines = memberText.split(/\r?\n/).length;
  if (currentGroup.length > 0 && currentLines + memberLines > 220) {
    memberGroups.push(currentGroup);
    currentGroup = [];
    currentLines = 0;
  }
  currentGroup.push(memberText.replace(/\bprivate\b/g, "protected"));
  currentLines += memberLines;
}
if (currentGroup.length > 0) memberGroups.push(currentGroup);

function abstractSignature(member) {
  if (!ts.isMethodDeclaration(member) || !member.body) return null;
  const visibility = member.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword,
  )
    ? [ts.factory.createModifier(ts.SyntaxKind.ProtectedKeyword)]
    : [];
  const parameters = member.parameters.map((parameter) =>
    ts.factory.updateParameterDeclaration(
      parameter,
      parameter.modifiers,
      parameter.dotDotDotToken,
      parameter.name,
      parameter.questionToken ??
        (parameter.initializer
          ? ts.factory.createToken(ts.SyntaxKind.QuestionToken)
          : undefined),
      parameter.type,
      undefined,
    ),
  );
  const declaration = ts.factory.updateMethodDeclaration(
    member,
    [...visibility, ts.factory.createModifier(ts.SyntaxKind.AbstractKeyword)],
    member.asteriskToken,
    member.name,
    member.questionToken,
    member.typeParameters,
    parameters,
    member.type ?? ts.factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
    undefined,
  );
  return ts.createPrinter().printNode(ts.EmitHint.Unspecified, declaration, source);
}

const forwardSignatures = classNode.members
  .slice(memberGroups[0].length)
  .map(abstractSignature)
  .filter(Boolean);

fs.mkdirSync(partsDirectory, { recursive: true });
const sourceBaseName = path.basename(sourcePath, path.extname(sourcePath));
const partBaseName = sourceBaseName.replace(/\.server$/, "");
const classBaseName = exportedClassName.replace(/(?:Service|Repository)$/, "");

for (let index = 0; index < memberGroups.length; index += 1) {
  const partNumber = index + 1;
  const className = `${classBaseName}Part${partNumber}`;
  const previousClassName = `${classBaseName}Part${partNumber - 1}`;
  const previousImport =
    index === 0
      ? ""
      : `\nimport { ${previousClassName} } from "./${partBaseName}.part-${String(partNumber - 1).padStart(2, "0")}";`;
  const heritage =
    index === 0
      ? originalHeritage
        ? ` ${originalHeritage}`
        : ""
      : ` extends ${previousClassName}`;
  const ownMembers = memberGroups[index].map((member) => `  ${member}`);
  const declarations =
    index === 0 ? forwardSignatures.map((member) => `  ${member}`) : [];
  const body = [...ownMembers, ...declarations].join("\n\n");
  const abstractKeyword = index < memberGroups.length - 1 ? "abstract " : "";
  const output = `${imports}${previousImport}\n${sharedDeclarations}\n\nexport ${abstractKeyword}class ${className}${heritage} {\n${body}\n}\n`;
  const outputPath = path.join(
    partsDirectory,
    `${partBaseName}.part-${String(partNumber).padStart(2, "0")}.ts`,
  );
  fs.writeFileSync(outputPath, output, "utf8");
}

const lastPartNumber = memberGroups.length;
const lastClassName = `${classBaseName}Part${lastPartNumber}`;
const relativePartsPath = path
  .relative(path.dirname(sourcePath), partsDirectory)
  .replaceAll(path.sep, "/");
const lastModule = `${relativePartsPath}/${partBaseName}.part-${String(lastPartNumber).padStart(2, "0")}`;
const wrapper = `import { ${lastClassName} } from "./${lastModule}";\n\nexport class ${exportedClassName} extends ${lastClassName} {}\n${singletonStatement ? `\n${singletonStatement}\n` : ""}`;
fs.writeFileSync(sourcePath, wrapper, "utf8");

console.log(
  `Split ${sourcePath} into ${memberGroups.length} responsibility-sized class layers.`,
);
