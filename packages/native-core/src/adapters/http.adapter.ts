import { CapacitorHttp } from "@capacitor/core";
import { toNativeCoreError } from "../errors/native-core-error";
import { base64ToBytes } from "../domain/binary/binary";
import type { OtaHttpOptions } from "../domain/ota/types";

const MODULE = "Http";

export const httpAdapter = {
  async getJson<T>(options: OtaHttpOptions): Promise<T> {
    try {
      if (options.signal?.aborted) {
        throw new DOMException("The operation was aborted", "AbortError");
      }
      const response = await CapacitorHttp.get({
        url: options.url,
        headers: { Accept: "application/json", ...(options.headers ?? {}) },
        responseType: "json",
        connectTimeout: options.connectTimeoutMs ?? 15_000,
        readTimeout: options.readTimeoutMs ?? 30_000,
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP request failed with status ${response.status}: ${options.url}`);
      }
      return (typeof response.data === "string" ? JSON.parse(response.data) : response.data) as T;
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },

  async getBinary(options: OtaHttpOptions): Promise<ArrayBuffer> {
    try {
      if (options.signal?.aborted) {
        throw new DOMException("The operation was aborted", "AbortError");
      }
      const response = await CapacitorHttp.get({
        url: options.url,
        headers: { Accept: "application/octet-stream, */*", ...(options.headers ?? {}) },
        responseType: "arraybuffer",
        connectTimeout: options.connectTimeoutMs ?? 15_000,
        readTimeout: options.readTimeoutMs ?? 60_000,
      });
      if (response.status < 200 || response.status >= 300) {
        throw new Error(`HTTP request failed with status ${response.status}: ${options.url}`);
      }
      if (typeof response.data !== "string") {
        throw new Error(`Binary response is not a valid base64 string: ${options.url}`);
      }
      return base64ToBytes(response.data).buffer;
    } catch (error) {
      throw toNativeCoreError(MODULE, error);
    }
  },
};
