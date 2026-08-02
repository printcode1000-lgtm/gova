import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "public", "catagory.db");
const outputDir = path.join(process.cwd(), "public", "catagory");
const pharmacyOutputDir = path.join(outputDir, "pharmacy");

const pharmacyTables = new Set([
  "active_ingredient_forms",
  "active_ingredient_strengths",
  "active_ingredients",
  "forms",
  "pharmacy_categories",
  "pharmacy_subcategories",
  "strengths",
]);

function ensureDirectory(directory: string) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
    console.log(`Created directory: ${directory}`);
  }
}

function quoteSqliteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function outputPathForTable(tableName: string) {
  const targetDir = pharmacyTables.has(tableName) ? pharmacyOutputDir : outputDir;
  ensureDirectory(targetDir);
  return path.join(targetDir, `${tableName}.json`);
}

ensureDirectory(outputDir);

const db = new Database(dbPath, { readonly: true });

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
  .all() as { name: string }[];

console.log(`Found ${tables.length} tables`);

for (const { name: tableName } of tables) {
  const rows = db.prepare(`SELECT * FROM ${quoteSqliteIdentifier(tableName)}`).all();
  const outputPath = outputPathForTable(tableName);
  fs.writeFileSync(outputPath, JSON.stringify(rows, null, 2), "utf-8");

  const relativeOutputPath = path.relative(process.cwd(), outputPath);
  console.log(
    `Exported ${rows.length} rows from '${tableName}' to ${relativeOutputPath}`,
  );
}

db.close();

console.log("\nExport completed successfully");
