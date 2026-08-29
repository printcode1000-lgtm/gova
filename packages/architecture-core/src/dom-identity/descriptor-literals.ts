/**
 * AST-exact reading of one `UiDescriptor` object literal, wherever it
 * appears: `uiAttributes({...})`, `ui={{...}}`, `ui: {...}` inside a typed
 * `Record<string, UiDescriptor>`, or a spread merge like `{ ...ui, state }`.
 * This replaces every regex balanced-brace scan the contract used to run —
 * multiline formatting, trailing commas, nested objects, and comments that
 * happen to contain the string `uid:` can no longer confuse it, because it
 * reads the real `ts.ObjectLiteralExpression` structure instead of source
 * text.
 */
import ts from 'typescript';

export interface DescriptorLiteralField {
  /** Present only when the property value is a plain string literal. */
  readonly literalValue: string | null;
  /** True when a value is present but is not a string literal (computed). */
  readonly isComputed: boolean;
  readonly node: ts.Expression;
}

export interface DescriptorLiteral {
  readonly file: string;
  readonly line: number;
  readonly node: ts.ObjectLiteralExpression;
  readonly fields: ReadonlyMap<string, DescriptorLiteralField>;
  readonly hasSpread: boolean;
}

function readField(object: ts.ObjectLiteralExpression, name: string): DescriptorLiteralField | null {
  const property = object.properties.find(
    (candidate) =>
      ts.isPropertyAssignment(candidate) &&
      ((ts.isIdentifier(candidate.name) && candidate.name.text === name) ||
        (ts.isStringLiteral(candidate.name) && candidate.name.text === name)),
  );
  if (!property || !ts.isPropertyAssignment(property)) return null;
  const value = property.initializer;
  const isLiteral = ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value);
  return {
    literalValue: isLiteral ? value.text : null,
    isComputed: !isLiteral,
    node: value,
  };
}

const DESCRIPTOR_FIELD_NAMES = ['uid', 'id', 'kind', 'action', 'part', 'state', 'instance'] as const;

function readDescriptorLiteral(
  file: string,
  sourceFile: ts.SourceFile,
  object: ts.ObjectLiteralExpression,
): DescriptorLiteral {
  const fields = new Map<string, DescriptorLiteralField>();
  for (const name of DESCRIPTOR_FIELD_NAMES) {
    const field = readField(object, name);
    if (field) fields.set(name, field);
  }
  const hasSpread = object.properties.some((property) => ts.isSpreadAssignment(property));
  return {
    file,
    line: sourceFile.getLineAndCharacterOfPosition(object.getStart()).line + 1,
    node: object,
    fields,
    hasSpread,
  };
}

/**
 * Every object literal in the file that declares a UI identity: the sole
 * argument of a `uiAttributes(...)` / `uiPageAttributes(...)` call, the value
 * of a `ui={{...}}` JSX attribute, and members of a
 * `... satisfies Record<string, UiDescriptor>` map. A literal that merely
 * forwards another descriptor (`{ ...ui, state }`, `simulation: { kind, id }`)
 * is still returned — callers decide what "declares an identity" means for
 * their own check — but `hasSpread` and the *absence* of an `id`/`uid` field
 * both tell that story precisely, without a regex heuristic.
 */
export function findDescriptorLiterals(file: string, source: string, sourceFile: ts.SourceFile): DescriptorLiteral[] {
  const literals: DescriptorLiteral[] = [];
  const seen = new Set<ts.ObjectLiteralExpression>();

  function record(object: ts.Expression | undefined): void {
    if (!object || !ts.isObjectLiteralExpression(object) || seen.has(object)) return;
    seen.add(object);
    literals.push(readDescriptorLiteral(file, sourceFile, object));
  }

  function visit(node: ts.Node): void {
    // uiAttributes({...}) / uiPageAttributes({...}) / uiComponentAttributes(name, {...})
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === 'uiAttributes' || name === 'uiPageAttributes') {
        record(node.arguments[0]);
      }
    }
    // ui={{...}}
    if (ts.isJsxAttribute(node) && node.name.getText() === 'ui' && node.initializer) {
      if (ts.isJsxExpression(node.initializer) && node.initializer.expression) {
        record(node.initializer.expression);
      }
    }
    // `ui: {...}` member inside an object/record literal (descriptor maps).
    if (ts.isPropertyAssignment(node) && node.name.getText() === 'ui') {
      record(node.initializer);
    }
    // Members of `const X = { a: {...}, b: {...} } as const satisfies Record<string, UiDescriptor>`.
    if (
      ts.isVariableDeclaration(node) &&
      node.initializer &&
      isRecordUiDescriptorSatisfies(node)
    ) {
      const literal = unwrapAsConst(node.initializer);
      if (literal && ts.isObjectLiteralExpression(literal)) {
        for (const property of literal.properties) {
          if (ts.isPropertyAssignment(property) && ts.isObjectLiteralExpression(property.initializer)) {
            // Skip descriptor *fields* that happen to be objects (simulation/interaction).
            if (property.name.getText() === 'simulation' || property.name.getText() === 'interaction') continue;
            record(property.initializer);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  void source;
  return literals;
}

function unwrapAsConst(expression: ts.Expression): ts.Expression {
  if (ts.isAsExpression(expression)) return unwrapAsConst(expression.expression);
  if (ts.isSatisfiesExpression(expression)) return unwrapAsConst(expression.expression);
  return expression;
}

function isRecordUiDescriptorSatisfies(declaration: ts.VariableDeclaration): boolean {
  let node: ts.Node = declaration.initializer!;
  while (ts.isAsExpression(node)) node = node.expression;
  const parent = declaration.initializer;
  if (!parent) return false;
  // `expr as const satisfies Record<string, UiDescriptor>` parses as
  // `SatisfiesExpression(AsExpression(expr, const), Record<...>)`.
  let cursor: ts.Expression = declaration.initializer;
  while (ts.isSatisfiesExpression(cursor) || ts.isAsExpression(cursor)) {
    if (ts.isSatisfiesExpression(cursor)) {
      const type = cursor.type;
      if (
        ts.isTypeReferenceNode(type) &&
        type.typeName.getText() === 'Record' &&
        type.typeArguments?.[1]?.getText() === 'UiDescriptor'
      ) {
        return true;
      }
    }
    cursor = ts.isSatisfiesExpression(cursor) ? cursor.expression : (cursor as ts.AsExpression).expression;
  }
  return false;
}
