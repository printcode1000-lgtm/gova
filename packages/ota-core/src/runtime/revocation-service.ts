/** Single responsibility: fetch and authenticate the compact OTA revocation list. */
import { otaPublicEnv } from '../ports';
import {
  asolDbGet,
  asolDbSet,
  ASOL_DB_STORES,
} from "@asol/data-core/browser";

import { otaApiService } from "./api-service";
import {
  verifyOtaRevocationDocument,
  type OtaRevocationDocument,
} from "../domain/release/revocation-document";
import {
  acceptOtaRevocationDocument,
  isPersistedOtaRevocationState,
  type PersistedOtaRevocationState,
} from "../domain/release/revocation-state";

const CACHE_MS = 30_000;
const REVOCATION_STATE_KEY = "asol-ota-revocations-v1";
let activeRequest: Promise<OtaRevocationDocument | null> | null = null;
let cachedAt = 0;
let cachedDocument: OtaRevocationDocument | null = null;

async function readPersistedState(): Promise<PersistedOtaRevocationState | null> {
  try {
    const value = await asolDbGet<unknown>(
      ASOL_DB_STORES.APP_SETTINGS,
      REVOCATION_STATE_KEY,
    );
    if (!isPersistedOtaRevocationState(value)) return null;
    const verified = await verifyOtaRevocationDocument(
      value.document,
      otaPublicEnv().otaPublicKey,
    );
    return verified ? value : null;
  } catch {
    return null;
  }
}

export function otaRevocationsUrl(manifestUrl: string): string {
  const url = new URL(manifestUrl);
  url.pathname = url.pathname.replace(/\/manifest\.json$/, "/revocations.json");
  return url.toString();
}

export const otaRevocationService = {
  async getPersistedDocument(): Promise<OtaRevocationDocument | null> {
    return (await readPersistedState())?.document ?? null;
  },

  async getDocument(signal?: AbortSignal): Promise<OtaRevocationDocument | null> {
    if (!otaPublicEnv().otaManifestUrl || !otaPublicEnv().otaPublicKey) return null;
    if (Date.now() - cachedAt < CACHE_MS) return cachedDocument;
    if (activeRequest) return activeRequest;
    activeRequest = (async () => {
      const persisted = await readPersistedState();
      try {
        const value = await otaApiService.getRevocationDocument(
          otaRevocationsUrl(otaPublicEnv().otaManifestUrl),
          signal,
        );
        const verified = await verifyOtaRevocationDocument(
          value,
          otaPublicEnv().otaPublicKey,
        );
        if (!verified) return cachedDocument ?? persisted?.document ?? null;
        const decision = acceptOtaRevocationDocument(persisted, verified);
        if (!decision.accepted) {
          console.warn(
            `[AsolOTA] Rejected stale revocation document: issuedAt=${verified.issuedAt}, ` +
              `highestIssuedAt=${decision.state.highestIssuedAt}`,
          );
          cachedDocument = decision.state.document;
          cachedAt = Date.now();
          return cachedDocument;
        }
        await asolDbSet(
          ASOL_DB_STORES.APP_SETTINGS,
          REVOCATION_STATE_KEY,
          decision.state,
        );
        cachedDocument = decision.state.document;
        cachedAt = Date.now();
        return cachedDocument;
      } catch {
        return cachedDocument ?? persisted?.document ?? null;
      }
    })().finally(() => { activeRequest = null; });
    return activeRequest;
  },

  async isVersionRevoked(version: string, signal?: AbortSignal): Promise<boolean> {
    const document = await this.getDocument(signal);
    return document?.revokedVersions.includes(version) ?? false;
  },
};
