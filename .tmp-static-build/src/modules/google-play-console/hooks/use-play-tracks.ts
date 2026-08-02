"use client";

import * as React from "react";

import type { GooglePlayPromoteInput, GooglePlayTrackMutationInput } from "../domain/store-assets-types";
import { storeAssetsApiService } from "../services/store-assets-api-service";
import { useAuthHeaders } from "./use-auth-headers";

export function usePlayTracks() {
  const headers = useAuthHeaders();
  const [snapshot, setSnapshot] = React.useState<Awaited<ReturnType<typeof storeAssetsApiService.snapshot>> | null>(null);
  const [busy, setBusy] = React.useState(false);
  const refresh = React.useCallback(async () => {
    if (headers) setSnapshot(await storeAssetsApiService.snapshot(headers));
  }, [headers]);
  React.useEffect(() => { void refresh(); }, [refresh]);
  const mutate = async (operation: Promise<Awaited<ReturnType<typeof storeAssetsApiService.updateTrack>>>) => {
    setBusy(true);
    try { setSnapshot((await operation).snapshot); } finally { setBusy(false); }
  };
  const update = (input: GooglePlayTrackMutationInput) => headers && mutate(
    storeAssetsApiService.updateTrack(input, headers),
  );
  const promote = (input: GooglePlayPromoteInput) => headers && mutate(storeAssetsApiService.promote(input, headers));
  const uploadMapping = (form: FormData) => headers && mutate(storeAssetsApiService.uploadMapping(form, headers));
  return { snapshot, busy, refresh, update, promote, uploadMapping };
}
