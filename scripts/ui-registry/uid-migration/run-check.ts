import { checkUidCoverage } from "./check-uid-coverage";

const errors = checkUidCoverage(process.cwd());
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("UI identity coverage contract holds.");
