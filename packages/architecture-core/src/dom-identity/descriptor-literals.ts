import ts from 'typescript';

export interface DescriptorLiteralField {
  /** Present only for an ordinary quoted TypeScript StringLiteral. */
  readonly literalValue: string | null;
  /** True when a value exists but is not an ordinary quoted string literal. */
  readonly isComputed: boolean;
  readonly node: ts.Expression;
}

export interface StaticInteractionMetadata {
  readonly type: string;
  readonly valueContract: string | null;
}

export interface StaticSimulationMetadata {
  readonly kind: string;
  readonly id: string;
}

export interface DescriptorLiteral {
  readonly file: string;
  readonly line: number;
  readonly node: ts.ObjectLiteralExpression;
  readonly fields: ReadonlyMap<string, DescriptorLiteralField>;
  readonly hasSpread: boolean;
  readonly declarationKind: 'inline' | 'typed-descriptor' | 'descriptor-map';
  readonly interaction: StaticInteractionMetadata | null;
  readonly interactionComputed: boolean;
  readonly simulation: StaticSimulationMetadata | null;
  readonly simulationComputed: boolean;
}

function namedProperty(object: ts.ObjectLiteralExpression, name: string): ts.PropertyAssignment | null {
  const property = object.properties.find((candidate) =>
    ts.isPropertyAssignment(candidate) &&
    ((ts.isIdentifier(candidate.name) && candidate.name.text === name) ||
      (ts.isStringLiteral(candidate.name) && candidate.name.text === name)),
  );
  return property && ts.isPropertyAssignment(property) ? property : null;
}

function readField(object: ts.ObjectLiteralExpression, name: string): DescriptorLiteralField | null {
  const property = namedProperty(object, name);
  if (!property) return null;
  const value = property.initializer;
  return {
    literalValue: ts.isStringLiteral(value) ? value.text : null,
    isComputed: !ts.isStringLiteral(value),
    node: value,
  };
}

function stringProperty(object: ts.ObjectLiteralExpression, name: string): string | null {
  const property = namedProperty(object, name);
  return property && ts.isStringLiteral(property.initializer) ? property.initializer.text : null;
}

function readInteraction(object: ts.ObjectLiteralExpression): {
  value: StaticInteractionMetadata | null;
  computed: boolean;
} {
  const property = namedProperty(object, 'interaction');
  if (!property) return { value: null, computed: false };
  if (!ts.isObjectLiteralExpression(property.initializer)) return { value: null, computed: true };
  const type = stringProperty(property.initializer, 'type');
  if (!type) return { value: null, computed: true };
  const valueContractProperty = namedProperty(property.initializer, 'valueContract');
  const valueContract = valueContractProperty
    ? ts.isStringLiteral(valueContractProperty.initializer)
      ? valueContractProperty.initializer.text
      : null
    : null;
  if (valueContractProperty && valueContract === null) return { value: null, computed: true };
  return { value: { type, valueContract }, computed: false };
}

function readSimulation(object: ts.ObjectLiteralExpression): {
  value: StaticSimulationMetadata | null;
  computed: boolean;
} {
  const property = namedProperty(object, 'simulation');
  if (!property) return { value: null, computed: false };
  if (!ts.isObjectLiteralExpression(property.initializer)) return { value: null, computed: true };
  const kind = stringProperty(property.initializer, 'kind');
  const id = stringProperty(property.initializer, 'id');
  return kind && id
    ? { value: { kind, id }, computed: false }
    : { value: null, computed: true };
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
  const interaction = readInteraction(object);
  const simulation = readSimulation(object);
  return {
    file,
    line: sourceFile.getLineAndCharacterOfPosition(object.getStart()).line + 1,
    node: object,
    fields,
    hasSpread: object.properties.some((property) => ts.isSpreadAssignment(property)),
    declarationKind,
    interaction: interaction.value,
    interactionComputed: interaction.computed,
    simulation: simulation.value,
    simulationComputed: simulation.computed,
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
 * Every source object that owns UiRegistry descriptor metadata. Only ordinary
 * quoted strings count as canonical literals; template literals, identifiers,
 * concatenations and other expressions remain computed and fail closed in the
 * architecture guard.
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
