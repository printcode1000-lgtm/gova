import ts from 'typescript';

export interface DescriptorLiteralField {
  /** Present only for an ordinary quoted TypeScript StringLiteral. */
  readonly literalValue: string | null;
  /** True when a value exists but is not an ordinary quoted string literal. */
  readonly isComputed: boolean;
  readonly node: ts.Expression;
}

export interface DescriptorLiteral {
  readonly file: string;
  readonly line: number;
  readonly node: ts.ObjectLiteralExpression;
  readonly fields: ReadonlyMap<string, DescriptorLiteralField>;
  readonly hasSpread: boolean;
  readonly declarationKind: 'inline' | 'typed-descriptor' | 'descriptor-map';
}

function readField(object: ts.ObjectLiteralExpression, name: string): DescriptorLiteralField | null {
  const property = object.properties.find((candidate) =>
    ts.isPropertyAssignment(candidate) &&
    ((ts.isIdentifier(candidate.name) && candidate.name.text === name) ||
      (ts.isStringLiteral(candidate.name) && candidate.name.text === name)),
  );
  if (!property || !ts.isPropertyAssignment(property)) return null;
  const value = property.initializer;
  return {
    literalValue: ts.isStringLiteral(value) ? value.text : null,
    isComputed: !ts.isStringLiteral(value),
    node: value,
  };
}

const DESCRIPTOR_FIELD_NAMES = ['uid', 'id', 'kind', 'action', 'part', 'state', 'instance'] as const;

function readDescriptorLiteral(
  file: string,
  sourceFile: ts.SourceFile,
  object: ts.ObjectLiteralExpression,
  declarationKind: DescriptorLiteral['declarationKind'],
): DescriptorLiteral {
  const fields = new Map<string, DescriptorLiteralField>();
  for (const name of DESCRIPTOR_FIELD_NAMES) {
    const field = readField(object, name);
    if (field) fields.set(name, field);
  }
  return {
    file,
    line: sourceFile.getLineAndCharacterOfPosition(object.getStart()).line + 1,
    node: object,
    fields,
    hasSpread: object.properties.some((property) => ts.isSpreadAssignment(property)),
    declarationKind,
  };
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  if (ts.isAsExpression(expression) || ts.isTypeAssertionExpression(expression) || ts.isSatisfiesExpression(expression)) {
    return unwrapExpression(expression.expression);
  }
  if (ts.isParenthesizedExpression(expression)) return unwrapExpression(expression.expression);
  return expression;
}

function typeTextIsUiDescriptor(type: ts.TypeNode | undefined): boolean {
  if (!type) return false;
  const text = type.getText().replace(/\s+/g, '');
  return text === 'UiDescriptor' || text.endsWith('.UiDescriptor');
}

function typeTextIsUiDescriptorRecord(type: ts.TypeNode | undefined): boolean {
  if (!type) return false;
  const text = type.getText().replace(/\s+/g, '');
  return /^Record<[^,]+,(?:[A-Za-z0-9_$.]+\.)?UiDescriptor>$/.test(text) ||
    /^Readonly<Record<[^,]+,(?:[A-Za-z0-9_$.]+\.)?UiDescriptor>>$/.test(text);
}

function satisfiesType(expression: ts.Expression): ts.TypeNode | null {
  let cursor: ts.Expression = expression;
  while (ts.isAsExpression(cursor) || ts.isParenthesizedExpression(cursor)) {
    cursor = ts.isParenthesizedExpression(cursor) ? cursor.expression : cursor.expression;
  }
  return ts.isSatisfiesExpression(cursor) ? cursor.type : null;
}

/**
 * Every source object that owns UiRegistry descriptor metadata.
 *
 * Supported ownership shapes are deliberately explicit:
 * - inline `uiAttributes({ ... })`
 * - inline `ui={{ ... }}`
 * - object property `ui: { ... }`
 * - `const X: UiDescriptor = { ... }`
 * - `const X = { ... } satisfies UiDescriptor`
 * - typed/satisfies `Record<..., UiDescriptor>` maps whose members are descriptors
 *
 * A no-substitution template literal is intentionally *not* a canonical UID
 * literal: only a normal quoted StringLiteral is accepted by `readField`.
 */
export function findDescriptorLiterals(
  file: string,
  _source: string,
  sourceFile: ts.SourceFile,
): DescriptorLiteral[] {
  const literals: DescriptorLiteral[] = [];
  const seen = new Set<ts.ObjectLiteralExpression>();

  function record(expression: ts.Expression | undefined, kind: DescriptorLiteral['declarationKind']): void {
    if (!expression) return;
    const object = unwrapExpression(expression);
    if (!ts.isObjectLiteralExpression(object) || seen.has(object)) return;
    seen.add(object);
    literals.push(readDescriptorLiteral(file, sourceFile, object, kind));
  }

  function recordDescriptorMap(expression: ts.Expression): void {
    const object = unwrapExpression(expression);
    if (!ts.isObjectLiteralExpression(object)) return;
    for (const property of object.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const value = unwrapExpression(property.initializer);
      if (!ts.isObjectLiteralExpression(value)) continue;
      record(value, 'descriptor-map');
    }
  }

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (name === 'uiAttributes' || name === 'uiPageAttributes') record(node.arguments[0], 'inline');
    }

    if (ts.isJsxAttribute(node) && node.name.getText() === 'ui' && node.initializer && ts.isJsxExpression(node.initializer)) {
      record(node.initializer.expression, 'inline');
    }

    if (ts.isPropertyAssignment(node) && node.name.getText() === 'ui') record(node.initializer, 'inline');

    if (ts.isVariableDeclaration(node) && node.initializer) {
      const satisfies = satisfiesType(node.initializer);
      const directDescriptor = typeTextIsUiDescriptor(node.type) || typeTextIsUiDescriptor(satisfies ?? undefined);
      const descriptorMap = typeTextIsUiDescriptorRecord(node.type) || typeTextIsUiDescriptorRecord(satisfies ?? undefined);
      if (directDescriptor) record(node.initializer, 'typed-descriptor');
      if (descriptorMap) recordDescriptorMap(node.initializer);
    }

    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return literals;
}
