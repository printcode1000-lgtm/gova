import { applyUidMigration } from "@asol/architecture-core";

const result = applyUidMigration(process.cwd());
console.log(
  `UiRegistry uid migration: ${result.editedFiles} file(s) edited, ` +
    `${result.intrinsicAssigned} intrinsic uid(s), ${result.primitiveAssigned} primitive uid(s) assigned, ` +
    `${result.skipped} usage site(s) skipped (pre-existing JSX spread — needs manual registration).`,
);
