import { COMPONENT_MARKER_BRIDGE } from "./generated/component-marker-bridge";
import type { UiRegistrySourceLocator } from "./pending-request";

/**
 * JSX component names that render each published component marker.
 *
 * The browser reports what the DOM shows (`data-ui-component="input"`, or the
 * tag name); source shows the component that produced it. `COMPONENT_MARKER_
 * BRIDGE` is the generated bridge between the two — discovered from every
 * shared primitive's own `uiPrimitiveAttributes("<marker>", ...)` call
 * (`npm run ui-registry:component-bridge:generate`), not hand-maintained, so
 * a new shared primitive is found automatically instead of silently missed.
 */
const COMPONENTS_BY_MARKER: Readonly<Record<string, readonly string[]>> = COMPONENT_MARKER_BRIDGE;

export interface UiRegistrySourceMatch {
  /** Character offset of the `<` that opens the tag. */
  readonly index: number;
  readonly line: number;
  readonly component: string;
}

/** The JSX components a locator may legally resolve to. */
export function componentsForLocator(locator: UiRegistrySourceLocator): readonly string[] {
  return COMPONENTS_BY_MARKER[locator.component] ?? [];
}

function openingTag(source: string, start: number): string {
  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
    else if (character === ">" && depth === 0) return source.slice(start, index);
  }
  return source.slice(start, start + 800);
}

/**
 * Every still-unregistered usage site in one file that the locator could mean.
 *
 * A match must satisfy both halves of the locator: the component the marker
 * maps to, and the element's own author-written `id` when it published one. A
 * locator with no anchor matches every unregistered instance of that component
 * in the file, which is exactly why the caller must refuse anything other than
 * a single match repository-wide.
 */
export function findUiRegistrySourceMatches(
  source: string,
  locator: UiRegistrySourceLocator,
): UiRegistrySourceMatch[] {
  const matches: UiRegistrySourceMatch[] = [];
  for (const component of componentsForLocator(locator)) {
    for (const found of source.matchAll(new RegExp(`<${component}(?=[\\s/>])`, "g"))) {
      const index = found.index!;
      const tag = openingTag(source, index);
      if (/\sui=\{/.test(tag)) continue;
      if (locator.anchor !== null && !tag.includes(`id="${locator.anchor}"`)) continue;
      matches.push({
        index,
        line: source.slice(0, index).split("\n").length,
        component,
      });
    }
  }
  return matches.sort((left, right) => left.index - right.index);
}

/** Renders the descriptor literal that a resolved request inserts into source. */
export function renderUiDescriptorProp(descriptor: Record<string, unknown>): string {
  const order = ["uid", "id", "kind", "action", "part", "state", "interaction", "simulation", "instance"];
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
