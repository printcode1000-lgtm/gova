import { ok, err, type Result } from "../domain/result";
import { NativeCoreError, toNativeCoreError } from "../errors/native-core-error";
import { httpAdapter } from "../adapters/http.adapter";
import type { OtaHttpOptions } from "../domain/ota/types";

const MODULE = "Http";

export const httpApi = {
  async httpGetJson<T>(
    options: OtaHttpOptions,
  ): Promise<Result<T, NativeCoreError>> {
    try {
      const data = await httpAdapter.getJson<T>(options);
      return ok(data);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },

  async httpGetBinary(
    options: OtaHttpOptions,
  ): Promise<Result<ArrayBuffer, NativeCoreError>> {
    try {
      const buf = await httpAdapter.getBinary(options);
      return ok(buf);
    } catch (e) {
      return err(toNativeCoreError(MODULE, e));
    }
  },
};
