import { planUidMigration } from "./plan-uid-migration";

const { edits, importsNeeded, skippedSpread } = planUidMigration(process.cwd());
console.log("edits:", edits.length);
console.log("host:", edits.filter((e) => e.kind === "host").length);
console.log("primitive:", edits.filter((e) => e.kind === "primitive").length);
console.log("importsNeeded:", importsNeeded.size);
console.log("skippedSpread:", skippedSpread.length);
console.log(JSON.stringify(edits.slice(0, 5), null, 2));
console.log(JSON.stringify(skippedSpread.slice(0, 10), null, 2));
