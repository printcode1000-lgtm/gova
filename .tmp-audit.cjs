const {existsSync,readFileSync,readdirSync}=require("node:fs");const path=require("node:path");function auditStaticApiBaseUrl(outDirectory: string): void {
  const chunkDirectory = path.join(outDirectory, "_next", "static", "chunks");
  if (!existsSync(chunkDirectory)) {
    throw new Error(`Static chunks are missing: ${chunkDirectory}`);
  }

  let baked = false;
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }
      if (!entry.name.endsWith(".js")) continue;
      const source = readFileSync(entryPath, "utf8");
      if (/apiBaseUrl:\s*""/.test(source)) {
        throw new Error(
          `Static bundle carries an empty API base URL (${path.relative(outDirectory, entryPath)}). ` +
            "Every request would target the app's own origin and return HTML.",
        );
      }
      if (/apiBaseUrl:\s*"https?:\/\//.test(source)) baked = true;
    }
  };
  walk(chunkDirectory);

  if (!baked) {
    throw new Error(
      "Could not find a baked API base URL in the static bundle. " +
        "If the build output shape changed, update auditStaticApiBaseUrl in scripts/build-static.ts.",
    );
  }
  console.log("Static API base URL audit passed.");
}

;module.exports={auditStaticApiBaseUrl};