export const notificationTestDelayOptions = [0, 5, 10, 30] as const;
export const notificationTestBatchSizeOptions = [1, 5] as const;

export const TEST_RESULT_STATUS_LABELS: Record<string, string> = {
  saved: "محفوظ",
  missing: "مفقود",
  failed: "فشل",
  sent: "أُرسل",
  partial: "جزئي",
  queued: "في الانتظار",
  no_tokens: "بدون رموز",
  muted: "مكتوم",
};

export const NOTIFICATION_PERMISSION_LABELS: Record<string, string> = {
  granted: "مسموح",
  denied: "مرفوض",
  default: "افتراضي",
  prompt: "بانتظار الطلب",
};

export function formatTestResultStatus(
  code: string,
  index?: number,
  total?: number,
): string {
  const label = TEST_RESULT_STATUS_LABELS[code] ?? code;
  if (index != null && total != null) {
    return `${label} ${index}/${total}`;
  }
  return label;
}

export function formatStoredTestResultStatus(status: string): string {
  const match = status.match(/^([a-z_]+)(?:\s+(\d+)\/(\d+))?$/i);
  if (!match) return status;
  const [, code, index, total] = match;
  return formatTestResultStatus(
    code,
    index ? Number(index) : undefined,
    total ? Number(total) : undefined,
  );
}

export function createRequestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
