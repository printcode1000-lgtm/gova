import { checkStaticDomIds } from "./check-static-dom-ids";

const errors = checkStaticDomIds(process.cwd());
if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log("Static DOM id contract holds.");
