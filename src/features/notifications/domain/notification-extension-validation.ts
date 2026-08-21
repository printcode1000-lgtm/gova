import { invalidField } from "./notification-error";
import { assertString } from "./notification-validation-primitives";

export function assertExtensionRegistration(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw invalidField("extension", "must be an object");
  }
  const extension = value as Record<string, unknown>;
  assertString(extension.id, "extension.id", 64);
  for (const hook of ["reconcile", "onRead", "replayQueuedOperation"] as const) {
    const handler = extension[hook];
    if (handler !== undefined && typeof handler !== "function") {
      throw invalidField(`extension.${hook}`, "must be a function when present");
    }
  }
}
