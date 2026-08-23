import {
  OWNED_VENDOR_MODULES,
  ownersOfVendor,
  rootVendorOwnerFolder,
} from '../registry/capability-registry';
import { addViolation, extractImports, rel } from './architecture-types';

function isTestFile(fileRel: string): boolean {
  const normalized = fileRel.replace(/\\/g, '/');
  return (
    /\.test\.(ts|tsx|js|mjs|cjs)$/.test(normalized) ||
    normalized.includes('/tests/') ||
    normalized.includes('/__tests__/')
  );
}

/**
 * Vendor SDKs listed in the capability registry may only be imported by their
 * owning package(s). Application code, scripts, services, and other packages
 * are rejected.
 *
 * Tests may import an owned vendor only when the test file itself lives under
 * an owning package. A foreign package's tests constructing `better-sqlite3`
 * (or any other owned SDK) is a bypass of the same ownership rule.
 *
 * Root files listed in `ROOT_VENDOR_OWNED_FILES` are treated as belonging to
 * their declared owner folder (e.g. `capacitor.config.ts` → native-core).
 */
export function checkVendorOwnershipContract(filePath: string, content: string): void {
  const fileRel = rel(filePath).replace(/\\/g, '/');

  // Rule text and registry tables quote vendor names.
  if (fileRel.startsWith('packages/architecture-core/src/')) return;
  if (fileRel.startsWith('docs/')) return;

  const packageFolder = fileRel.startsWith('packages/')
    ? fileRel.split('/')[1]
    : rootVendorOwnerFolder(fileRel) ?? null;

  for (const specifier of extractImports(content)) {
    const owned = OWNED_VENDOR_MODULES.find(
      (vendor) => specifier === vendor || specifier.startsWith(`${vendor}/`),
    );
    if (!owned) continue;

    const owners = ownersOfVendor(owned);
    if (owners.length === 0) {
      addViolation(
        'Vendor Ownership',
        filePath,
        `Vendor module "${specifier}" has no registered owner.`,
        'Register an owning package in the capability registry.',
      );
      continue;
    }

    if (packageFolder && owners.some((owner) => owner.folder === packageFolder)) {
      continue;
    }

    if (isTestFile(fileRel)) {
      addViolation(
        'Vendor Ownership',
        filePath,
        `Vendor module "${specifier}" imported from a non-owner test (${owners
          .map((owner) => owner.name)
          .join(', ')}).`,
        `Keep vendor construction inside the owning package's tests, or inject a port/fake.`,
      );
      continue;
    }

    addViolation(
      'Vendor Ownership',
      filePath,
      `Vendor module "${specifier}" imported outside its owning package (${owners
        .map((owner) => owner.name)
        .join(', ')}).`,
      `Import through the owning package's public door, never the vendor SDK directly.`,
    );
  }
}
