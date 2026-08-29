/** One row of the generated, deterministic catalog of every canonical source uid. */
export interface UiUidCatalogEntry {
  readonly uid: string;
  readonly id: string;
  readonly kind: "page" | "element";
  readonly sourceFile: string;
  readonly sourceLine: number;
}
