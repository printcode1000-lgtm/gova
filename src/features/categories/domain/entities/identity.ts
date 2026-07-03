export type CategoryNodeIdentity = 
  | { kind: "category"; id: number }
  | { kind: "collection"; id: number }
  | { kind: "virtual-group"; key: "doctor-appointment" };

export type PersistedCategorySelection = {
  main: { kind: "category" | "collection"; id: number };
  child?: { kind: "subcategory" | "collection-member"; id: number };
};

export function getCanonicalKey(identity: CategoryNodeIdentity): string {
  switch (identity.kind) {
    case "category":
      return `category:${identity.id}`;
    case "collection":
      return `collection:${identity.id}`;
    case "virtual-group":
      return `virtual:${identity.key}`;
  }
}
