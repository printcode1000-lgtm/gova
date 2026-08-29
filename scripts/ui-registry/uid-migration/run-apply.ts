import { applyUidMigrationToRepo } from "./apply-uid-migration";

const result = applyUidMigrationToRepo(process.cwd());
console.log(
  `UiRegistry uid migration: ${result.editedFiles} file(s) edited, ` +
    `${result.hostAssigned} host uid(s), ${result.primitiveAssigned} primitive uid(s) assigned, ` +
    `${result.skipped} usage site(s) skipped (pre-existing JSX spread — needs manual registration).`,
);
