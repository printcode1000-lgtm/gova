import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

import { catalogJsonSchemaSources } from "../src/features/catalog-data/contracts/catalog-v3.contract";

const schemaDirectory = path.join(process.cwd(), "public", "catagory", "schemas");
fs.mkdirSync(schemaDirectory, { recursive: true });

for (const [fileName, schema] of Object.entries(catalogJsonSchemaSources)) {
  const targetPath = path.join(schemaDirectory, fileName);
  fs.writeFileSync(
    targetPath,
    `${JSON.stringify(z.toJSONSchema(schema), null, 2)}\n`,
    "utf8",
  );
}

console.log(`Generated ${Object.keys(catalogJsonSchemaSources).length} Catalog v3 JSON Schemas.`);
