import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const [sourcePath, componentName, outputDirectory] = process.argv.slice(2);
if (!sourcePath || !componentName || !outputDirectory) {
  throw new Error(
    "Usage: node split-component-model-view.mjs <source> <function-component> <output-dir>",
  );
}

const sourceText = fs.readFileSync(sourcePath, "utf8");
const source = ts.createSourceFile(
  sourcePath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const component = source.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === componentName,
);
if (!component?.body) throw new Error(`Function component ${componentName} not found`);
if (
  component.parameters.length !== 1 ||
  !ts.isObjectBindingPattern(component.parameters[0].name)
) {
  throw new Error("Only a single destructured props parameter is supported");
}

const returnStatements = component.body.statements.filter(ts.isReturnStatement);
if (returnStatements.length !== 1 || !returnStatements[0].expression) {
  throw new Error("The component must have exactly one top-level return expression");
}
const returnStatement = returnStatements[0];
if (component.body.statements.at(-1) !== returnStatement) {
  throw new Error("The component return must be its final top-level statement");
}

function bindingNames(name, result = []) {
  if (ts.isIdentifier(name)) result.push(name.text);
  else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) bindingNames(element.name, result);
    }
  }
  return result;
}

function statementNames(statement) {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      bindingNames(declaration.name),
    );
  }
  if (ts.isFunctionDeclaration(statement) && statement.name) {
    return [statement.name.text];
  }
  return [];
}

function adjustedImports(directory) {
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

const directives = source.statements
  .filter(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression),
  )
  .map((statement) => statement.getText(source))
  .join("\n");
const logicStatements = component.body.statements.slice(0, -1);
const propNames = bindingNames(component.parameters[0].name);
const modelNames = [
  ...propNames,
  ...logicStatements.flatMap(statementNames),
].filter((name, index, names) => names.indexOf(name) === index);
const componentPrefix = sourceText
  .slice(component.getStart(source), component.body.getStart(source))
  .trimEnd();
const modelName = `use${componentName}Model`;
const viewName = `${componentName}View`;
const modelPrefix = componentPrefix.replace(
  new RegExp(`function\\s+${componentName}\\b`),
  `function ${modelName}`,
);
const modelBody = logicStatements
  .map((statement) => statement.getText(source))
  .join("\n\n");
const modelFileBase = `${componentName}.model`;
const viewFileBase = `${componentName}.view`;

fs.mkdirSync(outputDirectory, { recursive: true });
const modelOutput = [
  directives,
  adjustedImports(outputDirectory),
  `${modelPrefix}{\n${modelBody}\n\nreturn { ${modelNames.join(", ")} };\n}`,
  `\nexport type ${componentName}Model = ReturnType<typeof ${modelName}>;`,
]
  .filter(Boolean)
  .join("\n\n");
fs.writeFileSync(
  path.join(outputDirectory, `${modelFileBase}.tsx`),
  `${modelOutput}\n`,
  "utf8",
);

const returnExpression = returnStatement.expression.getText(source);
const viewOutput = [
  directives,
  adjustedImports(outputDirectory),
  `import type { ${componentName}Model } from "./${modelFileBase}";`,
  `export function ${viewName}({ model }: { model: ${componentName}Model }) {\n  const { ${modelNames.join(", ")} } = model;\n  return ${returnExpression};\n}`,
]
  .filter(Boolean)
  .join("\n\n");
fs.writeFileSync(
  path.join(outputDirectory, `${viewFileBase}.tsx`),
  `${viewOutput}\n`,
  "utf8",
);

let relativeOutput = path
  .relative(path.dirname(sourcePath), outputDirectory)
  .replaceAll(path.sep, "/");
if (!relativeOutput.startsWith(".")) relativeOutput = `./${relativeOutput}`;
const callArgument = `{ ${propNames.join(", ")} }`;
const wrapper = `${componentPrefix}{\n  const model = ${modelName}(${callArgument});\n  return <${viewName} model={model} />;\n}`;
const otherBody = source.statements
  .filter(
    (statement) =>
      statement !== component &&
      !ts.isImportDeclaration(statement) &&
      !(
        ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression)
      ),
  )
  .map((statement) => statement.getText(source))
  .join("\n\n");
const originalOutput = [
  directives,
  adjustedImports(path.dirname(sourcePath)),
  `import { ${modelName} } from "${relativeOutput}/${modelFileBase}";`,
  `import { ${viewName} } from "${relativeOutput}/${viewFileBase}";`,
  wrapper,
  otherBody,
]
  .filter(Boolean)
  .join("\n\n");
fs.writeFileSync(sourcePath, `${originalOutput}\n`, "utf8");

console.log(`Split ${componentName} into model, view, and public wrapper.`);
