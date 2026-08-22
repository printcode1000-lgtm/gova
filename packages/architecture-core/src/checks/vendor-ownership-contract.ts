import { OWNED_VENDOR_MODULES, ownersOfVendor } from '../registry/capability-registry';
import { addViolation, extractImports, rel } from './architecture-types';

/**
 * Vendor SDKs listed in the capability registry may only be imported by their
 * owning package(s). Application code, scripts, services, and other packages
 * are rejected.
 *
 * Adapter subfolders inside an owning package are allowed; the ownership check
 * is package-folder scoped, matching the registry.
 */
export function checkVendorOwnershipContract(filePath: string, content: string): void {
  const fileRel = rel(filePath);

  // Rule text and registry tables quote vendor names.
  if (fileRel.startsWith('packages/architecture-core/src/')) return;
  if (fileRel.startsWith('docs/')) return;
  // Unit/integration harnesses may construct in-memory drivers; production code may not.
  if (/\.test\.(ts|tsx|js|mjs|cjs)$/.test(fileRel) || fileRel.includes('/tests/')) return;

  const packageFolder = fileRel.startsWith('packages/')
    ? fileRel.split('/')[1]
    : null;

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
