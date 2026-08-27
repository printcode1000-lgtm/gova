import { applyStaticDomIdsToRepo } from "./apply-to-repo";
import { applyIdForwardingToRepo } from "./apply-id-forwarding";

const root = process.cwd();
const result = applyStaticDomIdsToRepo(root);
console.log(
  `Static DOM ids: assigned ${result.assigned} literal id(s) across ${result.editedFiles} file(s).`,
);
const forwarded = applyIdForwardingToRepo(root);
if (forwarded > 0) {
  console.log(`Forwarded id on ${forwarded} repeating component export(s).`);
}
