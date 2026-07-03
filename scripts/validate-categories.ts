import { validationEngine } from "../src/features/categories/infrastructure/validation.engine";

const result = validationEngine.validate();
console.log(JSON.stringify(result.stats, null, 2));
for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
for (const error of result.errors) console.error(`ERROR: ${error}`);
if (!result.valid) process.exit(1);
console.log("Category data is valid.");
