import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Only the pure modules are imported. `../index` pulls in AsolMap.tsx, which imports
 * MapLibre's stylesheet — Node cannot load a .css module, and adding a bundler here
 * would test the bundler rather than the package. The public surface is therefore
 * asserted against the barrel's source, which is what the `exports` seal actually
 * governs.
 */
import { circleToPolygon, collection, markerAt } from "../geometry";
import { createOpenStreetMapProvider, createRasterTileProvider } from "../providers";
import { defaultTheme } from "../theme";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const workspaceRoot = path.resolve(packageRoot, "..", "..");
const barrel = readFileSync(path.join(packageRoot, "src", "index.ts"), "utf8");

function runGeometryTest() {
  const marker = markerAt(31.2357, 30.0444, "cairo");
  assert.equal(marker.type, "Feature");
  assert.equal(marker.properties.id, "cairo");
  assert.deepEqual(marker.geometry.coordinates, [31.2357, 30.0444]);

  // markerAt takes longitude first; a swapped call would silently place the pin in
  // the sea, so the order is asserted rather than assumed.
  assert.ok(marker.geometry.coordinates[0] > marker.geometry.coordinates[1]);

  const circle = circleToPolygon({ id: "zone", latitude: 30, longitude: 31, radiusMeters: 1000 }, 8);
  assert.equal(circle.geometry.type, "Polygon");
  assert.equal(circle.geometry.coordinates[0].length, 9);
  assert.deepEqual(circle.geometry.coordinates[0][0], circle.geometry.coordinates[0][8]);

  assert.deepEqual(collection([]), { type: "FeatureCollection", features: [] });
  console.log("✅ map-core geometry test passed");
}

function runProviderTest() {
  const provider = createRasterTileProvider({
    tiles: ["https://example.test/{z}/{x}/{y}.png"],
    attribution: "© Example",
  });
  const light = provider.getStyle("light") as { layers: Array<{ id: string; paint?: Record<string, unknown> }> };
  const dark = provider.getStyle("dark") as { layers: Array<{ id: string; paint?: Record<string, unknown> }> };

  assert.equal(provider.attribution, "© Example");
  assert.equal(light.layers[1].id, "asol-base-map");
  assert.notEqual(
    light.layers[0].paint?.["background-color"],
    dark.layers[0].paint?.["background-color"],
  );

  const osm = createOpenStreetMapProvider();
  assert.equal(osm.id, "openstreetmap");
  // The tile licence requires attribution; an empty string would ship a violation.
  assert.ok(osm.attribution.length > 0);
  console.log("✅ map-core provider test passed");
}

function runThemeTest() {
  // Every colour the layers coalesce onto must exist: an undefined marker colour
  // makes MapLibre reject the layer and no marker is ever drawn.
  for (const [key, value] of Object.entries(defaultTheme)) {
    assert.equal(typeof value, "string", `${key} must be a string`);
    assert.ok(value.length > 0, `${key} must not be empty`);
  }
  console.log("✅ map-core theme test passed");
}

/** Names the barrel actually re-exports, ignoring anything a comment mentions. */
function exportedNames(): Set<string> {
  const names = new Set<string>();
  for (const match of barrel.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const entry of match[1].split(",")) {
      const name = entry.trim().split(/\s+as\s+/).pop()?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

function runPublicSurfaceTest() {
  const exported = exportedNames();
  for (const name of [
    "AsolMap",
    "markerAt",
    "circleToPolygon",
    "createClusterIndex",
    "createNativePlatformGpsProvider",
    "MapLocationPermissionError",
    "createOpenStreetMapProvider",
    "createRasterTileProvider",
  ]) {
    assert.ok(exported.has(name), `index.ts must export ${name}`);
  }

  // The browser GPS adapters reach navigator.geolocation directly and would bypass
  // the permission flow; they must stay behind the door.
  assert.equal(exported.has("createBrowserGpsProvider"), false);
  assert.equal(exported.has("createAdaptiveGpsProvider"), false);
  console.log("✅ map-core public surface test passed");
}

function runSealTest() {
  const manifest = JSON.parse(
    readFileSync(path.join(packageRoot, "package.json"), "utf8"),
  ) as { name: string; exports: Record<string, unknown> };

  assert.equal(manifest.name, "@asol/map-core");
  assert.deepEqual(Object.keys(manifest.exports), ["."]);
  console.log("✅ map-core seal test passed");
}

function runWorkerArtifactTest() {
  // MapLibre resolves its worker relative to the emitted chunk, which 404s under
  // Next. Without these served copies every GeoJSON layer renders nothing at all
  // while the map still looks healthy, so their presence is a test, not a comment.
  for (const name of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
    assert.ok(
      existsSync(path.join(workspaceRoot, "public", name)),
      `public/${name} is missing; run npm run maplibre:sync`,
    );
  }

  const component = readFileSync(path.join(packageRoot, "src", "AsolMap.tsx"), "utf8");
  assert.ok(component.includes('setWorkerUrl("/maplibre-gl-worker.mjs")'));
  console.log("✅ map-core worker artifact test passed");
}

function runNoAppImportsTest() {
  // Rule 1: the package never reaches back into the application.
  const sources = [
    "AsolMap.tsx",
    "AsolMapControls.tsx",
    "AddressBalloon.tsx",
    "native-platform-gps.ts",
    "providers.ts",
    "theme.ts",
    "types.ts",
    "geometry.ts",
    "clustering.ts",
    "gps.ts",
    "index.ts",
    path.join("parts", "AsolMap.map-types.tsx"),
  ];

  for (const file of sources) {
    const content = readFileSync(path.join(packageRoot, "src", file), "utf8");
    assert.equal(
      /from ["']@\/[^"']+["']/.test(content),
      false,
      `${file} imports from the application alias "@/"`,
    );
  }
  console.log("✅ map-core isolation test passed");
}

function runAddressContractTest() {
  const types = readFileSync(path.join(packageRoot, "src", "types.ts"), "utf8");

  // The package exports data and never persists it, so there is no save control.
  assert.equal(types.includes("'save'"), false);
  assert.equal(types.includes("onSave"), false);
  assert.ok(types.includes("onLocationCommitted"));
  assert.ok(types.includes("AddressPromptConfig"));

  const balloon = readFileSync(path.join(packageRoot, "src", "AddressBalloon.tsx"), "utf8");
  assert.ok(balloon.includes("onConfirm"));
  console.log("✅ map-core address contract test passed");
}

runGeometryTest();
runProviderTest();
runThemeTest();
runPublicSurfaceTest();
runSealTest();
runWorkerArtifactTest();
runNoAppImportsTest();
runAddressContractTest();

console.log("map-core geometry, providers, theme, seal, worker, isolation and address tests passed.");
