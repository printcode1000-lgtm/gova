import { COMPONENT_MARKER_BRIDGE } from "./generated/component-marker-bridge";
import type { UiRegistrySourceLocator } from "./pending-request";

/**
 * JSX component names that render each published component marker.
 *
 * The browser reports what the DOM shows (`data-ui-component="input"`, or the
 * tag name); source shows the component that produced it. `COMPONENT_MARKER_
 * BRIDGE` is the generated bridge between the two — discovered from every
 * shared primitive's own `uiPrimitiveAttributes("<marker>", ...)` call
 * (`npm run ui-registry:component-bridge:generate`), not hand-maintained.
 *
 * Source-site matching itself intentionally does not live here: local tooling
 * uses the canonical TypeScript AST matcher from `@asol/architecture-core`.
 */
const COMPONENTS_BY_MARKER: Readonly<Record<string, readonly string[]>> = COMPONENT_MARKER_BRIDGE;

/** The JSX components a locator may legally resolve to. */
export function componentsForLocator(locator: UiRegistrySourceLocator): readonly string[] {
  return COMPONENTS_BY_MARKER[locator.component] ?? [];
}

/**
 * Renders only source-static descriptor metadata. `instance` is runtime state:
 * an observed row/copy must never be frozen as a literal into the source site.
 */
export function renderUiDescriptorProp(descriptor: Record<string, unknown>): string {
  if (descriptor.instance !== undefined) {
    throw new Error(
      "UiRegistry pending source writes cannot persist runtime instance values; add a safe runtime instance expression at the repeated source site instead.",
    );
  }

  const order = ["uid", "id", "kind", "action", "part", "state", "interaction", "simulation"];
  const fields = order
    .filter((key) => descriptor[key] !== undefined)
    .map((key) => {
      const value = descriptor[key];
      if (key === "simulation" && value && typeof value === "object") {
        const simulation = value as { kind: string; id: string };
        return `simulation: { kind: ${JSON.stringify(simulation.kind)}, id: ${JSON.stringify(simulation.id)} }`;
      }
      if (key === "interaction" && value && typeof value === "object") {
        const interaction = value as { type: string; valueContract?: string };
        return interaction.valueContract
          ? `interaction: { type: ${JSON.stringify(interaction.type)}, valueContract: ${JSON.stringify(interaction.valueContract)} }`
          : `interaction: { type: ${JSON.stringify(interaction.type)} }`;
      }
      return `${key}: ${JSON.stringify(value)}`;
    });
  return ` ui={{ ${fields.join(", ")} }}`;
}
