export type ProductMode = "view" | "edit" | "new";

export type ProductComponentConfig = Record<
  string,
  boolean | number | string
> & {
  visible: boolean;
  order: number;
};

export type ProductStyleComponents = Record<string, ProductComponentConfig>;
