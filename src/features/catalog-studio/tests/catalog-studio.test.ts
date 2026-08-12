import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { catalogStudioService } from "../services/catalog-studio.service.server";

async function main() {
const root = process.cwd();
const categoriesPath = path.join(root, "public", "catagory", "core", "categories.json");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

const snapshot = await catalogStudioService.snapshot();
assert.equal(snapshot.validation.valid, true);
assert.equal(snapshot.stats.schemaVersion, 3);
assert.equal(snapshot.stats.dataFiles, 16);
assert.equal(snapshot.stats.schemaFiles, 12);
assert.equal(snapshot.stats.specialtyMappings, 135);
assert.equal(snapshot.stats.specialtyColumns, 131);
assert(snapshot.images.length > 600);
assert(snapshot.relations.some((relation) => relation.kind === "database-column"));
assert(snapshot.files.filter((file) => file.group === "schemas").every((file) => file.readOnly));

const categoriesFile = snapshot.files.find((file) => file.path === "core/categories.json");
assert(categoriesFile);
const beforeContent = fs.readFileSync(categoriesPath, "utf8");
const invalidCategories = JSON.parse(categoriesFile.content) as {
  items: Array<{ display: { order: number } }>;
};
invalidCategories.items[1]!.display.order = invalidCategories.items[0]!.display.order;
const invalidResult = await catalogStudioService.validateDrafts([
  {
    path: categoriesFile.path,
    baseHash: categoriesFile.hash,
    content: JSON.stringify(invalidCategories),
  },
]);
assert.equal(invalidResult.valid, false);
assert.equal(hash(fs.readFileSync(categoriesPath, "utf8")), hash(beforeContent));

await assert.rejects(
  () =>
    catalogStudioService.saveDrafts([
      {
        path: categoriesFile.path,
        baseHash: "stale-revision",
        content: categoriesFile.content,
      },
    ]),
  /catalogStudioConcurrentChange/,
);
assert.equal(hash(fs.readFileSync(categoriesPath, "utf8")), hash(beforeContent));

const schemaFile = snapshot.files.find((file) => file.path === "schemas/category.schema.json");
assert(schemaFile);
await assert.rejects(
  () =>
    catalogStudioService.validateDrafts([
      { path: schemaFile.path, baseHash: schemaFile.hash, content: schemaFile.content },
    ]),
  /catalogStudioFileNotEditable/,
);

const referencedImage = snapshot.images.find((image) => image.references.length > 0);
assert(referencedImage);
await assert.rejects(
  () => catalogStudioService.trashImage(referencedImage.path),
  /catalogStudioImageReferenced/,
);

await assert.rejects(
  () =>
    catalogStudioService.uploadImage({
      root: "mainCategories",
      fileName: "../unsafe.png",
      bytes: new Uint8Array([1, 2, 3]),
      replace: false,
    }),
  /catalogStudioImageNameInvalid/,
);

const pageSource = fs.readFileSync(
  path.join(root, "src", "app", "super-admin", "catalog", "page.tsx"),
  "utf8",
);
const apiSource = fs.readFileSync(
  path.join(root, "src", "app", "api", "dev", "catalog-studio", "route.ts"),
  "utf8",
);
const imageApiSource = fs.readFileSync(
  path.join(root, "src", "app", "api", "dev", "catalog-studio", "images", "route.ts"),
  "utf8",
);
const sidebarSource = fs.readFileSync(
  path.join(root, "src", "components", "layouts", "AppSidebar.tsx"),
  "utf8",
);
const staticBuilderSource = fs.readFileSync(path.join(root, "scripts", "build-static.ts"), "utf8");
const staticBuilderConfigSource = fs.readFileSync(
  path.join(root, "scripts", "build-static", "build-static.runtime-config.ts"),
  "utf8",
);
assert(pageSource.includes("if (!isDevelopment) notFound()"));
assert(apiSource.includes("if (!isDevelopment)"));
assert(apiSource.includes("assertSuperAdminRequest(request)"));
assert(apiSource.includes('message === "sessionTokenInvalid"'));
assert(apiSource.includes("apiError(message, 401)"));
assert(imageApiSource.includes('message === "sessionTokenInvalid"'));
assert(imageApiSource.includes("apiError(message, 401)"));
assert(sidebarSource.includes('href="/super-admin/catalog"'));
assert(sidebarSource.includes("!isNativePlatform()"));
assert(sidebarSource.includes('(min-width: 1024px)'));
assert(staticBuilderConfigSource.includes('"app/super-admin/catalog"'));
assert(staticBuilderSource.includes("auditCatalogStudioExcluded()"));

console.log("Catalog Studio safety, validation and development-only contract passed.");
}

void main();
