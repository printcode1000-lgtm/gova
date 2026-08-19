import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = path.join(
  root,
  "packages",
  "data-core",
  "src",
  "browser",
  "workers",
  "asol-push-sw.js",
);
const destination = path.join(root, "public", "asol-push-sw.js");

mkdirSync(path.dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log("Data Access public artifacts synchronized.");
