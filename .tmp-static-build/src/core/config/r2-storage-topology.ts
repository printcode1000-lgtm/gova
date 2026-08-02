export interface R2StorageTarget {
  accountId: string;
  endpoint: string;
  bucketName: string;
  publicUrl: string;
  location: string;
  jurisdiction: "default" | "eu" | "fedramp";
}

export const R2_STORAGE_TARGETS = {
  general: {
    accountId: "8486fdbb1c87dc78481f2def0a23e043",
    endpoint:
      "https://8486fdbb1c87dc78481f2def0a23e043.r2.cloudflarestorage.com",
    bucketName: "pic1",
    publicUrl: "https://pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev",
    location: "WEUR",
    jurisdiction: "default",
  },
  products: {
    accountId: "166409f3b449d8f1da0dee6d25ed3e08",
    endpoint:
      "https://166409f3b449d8f1da0dee6d25ed3e08.r2.cloudflarestorage.com",
    bucketName: "gova-storage",
    publicUrl: "https://pub-e1fa9cec1a694b118840c7c2ebc1633b.r2.dev",
    location: "WEUR",
    jurisdiction: "default",
  },
} as const satisfies Record<string, R2StorageTarget>;

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

export function assertR2StorageTarget(
  targetName: keyof typeof R2_STORAGE_TARGETS,
  actual: R2StorageTarget,
): void {
  assertR2StorageTargetFields(targetName, actual);
}

export function assertR2StorageTargetFields(
  targetName: keyof typeof R2_STORAGE_TARGETS,
  actual: Partial<R2StorageTarget>,
): void {
  const expected = R2_STORAGE_TARGETS[targetName];
  const mismatches: string[] = [];

  if (
    actual.accountId !== undefined &&
    actual.accountId.trim() !== expected.accountId
  ) {
    mismatches.push("accountId");
  }
  if (
    actual.endpoint !== undefined &&
    normalizeUrl(actual.endpoint) !== normalizeUrl(expected.endpoint)
  ) {
    mismatches.push("endpoint");
  }
  if (
    actual.bucketName !== undefined &&
    actual.bucketName.trim() !== expected.bucketName
  ) {
    mismatches.push("bucketName");
  }
  if (
    actual.publicUrl !== undefined &&
    normalizeUrl(actual.publicUrl) !== normalizeUrl(expected.publicUrl)
  ) {
    mismatches.push("publicUrl");
  }
  if (
    actual.location !== undefined &&
    actual.location.trim().toUpperCase() !== expected.location
  ) {
    mismatches.push("location");
  }
  if (
    actual.jurisdiction !== undefined &&
    actual.jurisdiction !== expected.jurisdiction
  ) {
    mismatches.push("jurisdiction");
  }

  if (mismatches.length > 0) {
    throw new Error(
      `r2StorageTargetMismatch:${targetName}:${mismatches.join(",")}`,
    );
  }
}
