import { asolApi } from "@/core/api";

import { GOOGLE_PLAY_CONSOLE_API } from "../config";
import type { GooglePlayConsoleSnapshot } from "../domain/types";

let snapshotRequest: Promise<GooglePlayConsoleSnapshot> | null = null;

export const playConsoleApiService = {
  snapshot(headers: Record<string, string>) {
    if (!snapshotRequest) {
      snapshotRequest = asolApi
        .get<GooglePlayConsoleSnapshot>(GOOGLE_PLAY_CONSOLE_API.snapshot, {
          headers,
          cache: "no-store",
        })
        .finally(() => {
          snapshotRequest = null;
        });
    }
    return snapshotRequest;
  },
};
