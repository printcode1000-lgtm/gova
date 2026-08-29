import { planUidMigration } from "./plan-uid-migration";

/**
 * A DOM usage site that structurally cannot receive an automated
 * `{...uiAttributes({...})}` / `ui={{...}}` registration: it already spreads
 * an unrelated attribute object, and a human must resolve the shape by hand
 * (either move the registration into that spread, or route the caller's own
 * `ui` descriptor through the wrapper's existing `...props` forwarding).
 *
 * Every entry here is a real gap, not a false exemption — `checkUidCoverage`
 * fails if a declared entry no longer matches anything, exactly like
 * `packages/architecture-core/src/checks/ui-registry-coverage.ts`.
 */
export const UID_COVERAGE_EXCEPTIONS: ReadonlyArray<{
  readonly file: string;
  readonly tag: string;
  readonly reason: string;
}> = [
  {
    file: "src/features/onboarding/presentation/form-components.tsx",
    tag: "Input",
    reason:
      "FormInput is a generic field wrapper: it forwards `...props`, including a caller-supplied " +
      "`ui` descriptor, straight into Input. The identity belongs to the caller, not this wrapper.",
  },
  {
    file: "src/features/onboarding/presentation/form-components.tsx",
    tag: "Textarea",
    reason:
      "FormTextarea is a generic field wrapper: it forwards `...props`, including a caller-supplied " +
      "`ui` descriptor, straight into Textarea. The identity belongs to the caller, not this wrapper.",
  },
];

/**
 * Fails the build when a project-owned DOM usage site under `src/` has no
 * canonical uid: a raw intrinsic host tag without a `uiAttributes()`/
 * `uiPageAttributes()` spread, or a known shared UI primitive usage without
 * an explicit `ui` descriptor. This is the mandatory-coverage half of the
 * contract; `ui-attribute-contract.ts` enforces literal, unique, non-primitive-owned
 * uids on whatever *is* registered.
 */
export function checkUidCoverage(root: string): string[] {
  const { edits, skippedSpread } = planUidMigration(root);
  const errors: string[] = [];

  for (const edit of edits) {
    errors.push(
      `${edit.file}:${edit.line} <${edit.tag}> has no ui.uid. Every project-owned DOM usage site ` +
        `must carry a literal uid — run npx tsx scripts/ui-registry/uid-migration/run-apply.ts.`,
    );
  }

  const matchedExceptions = new Set<number>();
  for (const site of skippedSpread) {
    const exceptionIndex = UID_COVERAGE_EXCEPTIONS.findIndex(
      (exception) => exception.file === site.file && exception.tag === site.tag,
    );
    if (exceptionIndex === -1) {
      errors.push(
        `${site.file}:${site.line} <${site.tag}> has no ui.uid and cannot be auto-registered because ` +
          `it already spreads an unrelated attribute object. Register it explicitly, or add a reasoned ` +
          `entry to UID_COVERAGE_EXCEPTIONS in scripts/ui-registry/uid-migration/check-uid-coverage.ts.`,
      );
    } else {
      matchedExceptions.add(exceptionIndex);
    }
  }

  UID_COVERAGE_EXCEPTIONS.forEach((exception, index) => {
    if (!matchedExceptions.has(index)) {
      errors.push(
        `UID_COVERAGE_EXCEPTIONS entry for ${exception.file} <${exception.tag}> matches nothing and must ` +
          `be removed — the usage site is either registered now or no longer exists.`,
      );
    }
  });

  return errors;
}
