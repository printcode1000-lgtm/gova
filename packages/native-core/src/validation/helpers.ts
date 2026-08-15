import { z } from "zod";
import { NativeCoreError } from "../errors/native-core-error";
import { type Result, ok, err } from "../domain/result";

/**
 * Validates untrusted input arguments before touching an adapter.
 * Returns either ok with parsed data or typed err with NativeCoreError.
 */
export function parseInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
  moduleName: string,
): Result<T, NativeCoreError> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((e) => `${e.path.map(String).join(".")}: ${e.message}`)
      .join(", ");
    return err(
      NativeCoreError.invalidArgument(
        moduleName,
        `Validation failed: ${errorDetails}`,
      ),
    );
  }
  return ok(result.data);
}

/**
 * Validates inbound data from native bridges.
 * If schema parsing fails, returns typed NativeCoreError instead of crashing or leaking raw malformed data.
 */
export function parseInbound<T>(
  schema: z.ZodType<T>,
  rawData: unknown,
  moduleName: string,
): Result<T, NativeCoreError> {
  const result = schema.safeParse(rawData);
  if (!result.success) {
    const errorDetails = result.error.issues
      .map((e) => `${e.path.map(String).join(".")}: ${e.message}`)
      .join(", ");
    return err(
      NativeCoreError.internal(
        moduleName,
        `Inbound bridge payload validation failed: ${errorDetails}`,
      ),
    );
  }
  return ok(result.data);
}
