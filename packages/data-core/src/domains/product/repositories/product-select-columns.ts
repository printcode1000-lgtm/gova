import { PRODUCT_COLUMNS } from "@asol/product-core/server";

const PRODUCT_COLUMN_FALLBACKS: Partial<Record<(typeof PRODUCT_COLUMNS)[number], string>> = {
  main_available: "1",
  price_needs_car: "0",
  pharmacy_prescription_required: "0",
  rating_enabled: "1",
  rating_target_enabled: "1",
  images_json: "'[]'",
  status: "'active'",
};

function quotedIdentifier(column: string): string {
  return `\`${column}\``;
}

function fallbackExpression(column: (typeof PRODUCT_COLUMNS)[number]): string {
  return `${PRODUCT_COLUMN_FALLBACKS[column] ?? "''"} AS ${quotedIdentifier(column)}`;
}

export function productSelectColumns(existingColumns: ReadonlySet<string>): string {
  return PRODUCT_COLUMNS.map((column) =>
    existingColumns.has(column) ? quotedIdentifier(column) : fallbackExpression(column),
  ).join(", ");
}

export function productTableColumnNames(rows: readonly unknown[]): Set<string> {
  return new Set(
    rows.flatMap((row) => {
      if (!row || typeof row !== "object" || !("name" in row)) return [];
      const name = (row as { name?: unknown }).name;
      return typeof name === "string" ? [name] : [];
    }),
  );
}
