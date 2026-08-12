/** Single responsibility: accept revocation documents without allowing issuedAt replay. */
import type { OtaRevocationDocument } from "./ota-revocation-document";

export interface PersistedOtaRevocationState {
  document: OtaRevocationDocument;
  highestIssuedAt: string;
}

export interface OtaRevocationAcceptance {
  accepted: boolean;
  state: PersistedOtaRevocationState;
}

export function acceptOtaRevocationDocument(
  current: PersistedOtaRevocationState | null,
  candidate: OtaRevocationDocument,
): OtaRevocationAcceptance {
  if (
    current &&
    Date.parse(candidate.issuedAt) < Date.parse(current.highestIssuedAt)
  ) {
    return { accepted: false, state: current };
  }
  return {
    accepted: true,
    state: { document: candidate, highestIssuedAt: candidate.issuedAt },
  };
}

export function isPersistedOtaRevocationState(
  value: unknown,
): value is PersistedOtaRevocationState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<PersistedOtaRevocationState>;
  return (
    typeof state.highestIssuedAt === "string" &&
    Number.isFinite(Date.parse(state.highestIssuedAt)) &&
    Boolean(state.document) &&
    state.document?.issuedAt === state.highestIssuedAt
  );
}
