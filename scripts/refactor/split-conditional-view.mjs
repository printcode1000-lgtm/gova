import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const [sourcePath, componentName, trueViewName, falseViewName] =
  process.argv.slice(2);
if (!sourcePath || !componentName || !trueViewName || !falseViewName) {
  throw new Error(
    "Usage: node split-conditional-view.mjs <source> <component> <true-view> <false-view>",
  );
}

const text = fs.readFileSync(sourcePath, "utf8");
const source = ts.createSourceFile(
  sourcePath,
  text,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);
const component = source.statements.find(
  (statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === componentName,
);
if (!component?.body) throw new Error(`Component ${componentName} not found`);
const returnStatement = component.body.statements.at(-1);
if (!returnStatement || !ts.isReturnStatement(returnStatement)) {
  throw new Error("Final return statement not found");
}

let conditional;
function findConditional(node) {
  if (ts.isConditionalExpression(node) && !conditional) conditional = node;
  ts.forEachChild(node, findConditional);
}
findConditional(returnStatement.expression);
if (!conditional) throw new Error("Conditional JSX branch not found");

const directives = source.statements
  .filter(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isStringLiteral(statement.expression),
  )
  .map((statement) => statement.getText(source))
  .join("\n");
const imports = source.statements
  .filter(ts.isImportDeclaration)
  .map((statement) => statement.getText(source))
  .join("\n");
const setup = component.body.statements
  .slice(0, -1)
  .map((statement) => statement.getText(source))
  .join("\n");
const parameterText = component.parameters.map((parameter) => parameter.getText(source)).join(", ");
const modelTypeImport = source.statements
  .filter(ts.isImportDeclaration)
  .find((statement) => statement.importClause?.isTypeOnly)
  ?.getText(source);
const directory = path.dirname(sourcePath);

for (const [name, expression] of [
  [trueViewName, conditional.whenTrue],
  [falseViewName, conditional.whenFalse],
]) {
  const output = [
    directives,
    imports,
    `export function ${name}(${parameterText}) {\n${setup}\nreturn ${expression.getText(source)};\n}`,
  ]
    .filter(Boolean)
    .join("\n\n");
  fs.writeFileSync(path.join(directory, `${name}.tsx`), `${output}\n`, "utf8");
}

const componentPrefix = text
  .slice(component.getStart(source), component.body.getStart(source))
  .trimEnd();
const conditionText = conditional.condition.getText(source);
const wrapper = `${componentPrefix}{\n${setup}\nreturn ${conditionText} ? <${trueViewName} model={model} /> : <${falseViewName} model={model} />;\n}`;
const otherStatements = source.statements
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
const original = [
  directives,
  imports,
  `import { ${trueViewName} } from "./${trueViewName}";`,
  `import { ${falseViewName} } from "./${falseViewName}";`,
  modelTypeImport && !imports.includes(modelTypeImport) ? modelTypeImport : "",
  wrapper,
  otherStatements,
]
  .filter(Boolean)
  .join("\n\n");
fs.writeFileSync(sourcePath, `${original}\n`, "utf8");

console.log(`Split ${componentName} conditional branches into two views.`);
