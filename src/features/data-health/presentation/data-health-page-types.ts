import type {
  DataHealthAuditEntry,
  DataHealthHistoryEntry,
  DataHealthQuarantineEntry,
} from "@asol/data-health-core";

export const PAGE_SIZE = 50;

export interface HistoryResponse {
  runs: DataHealthHistoryEntry[];
  audit: DataHealthAuditEntry[];
  quarantine: DataHealthQuarantineEntry[];
}
