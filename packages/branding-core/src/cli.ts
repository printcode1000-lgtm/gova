import path from "node:path";

import {
  BRANDING_SOURCE_FILE,
  generateBrandingAssets,
} from "./tooling/generate-branding-assets";

generateBrandingAssets()
  .then(({ rewrittenCount }) => {
    const source = path.relative(process.cwd(), BRANDING_SOURCE_FILE);
    console.log(
      rewrittenCount === 0
        ? `Branding assets already match ${source}; nothing rewritten.`
        : `Branding assets generated from ${source} (${rewrittenCount} file(s) rewritten).`,
    );
  })
  .catch((error) => {
    console.error(
      `Branding generation failed: ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 1;
  });
