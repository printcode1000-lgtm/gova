"use client";

import * as React from "react";

import type { GooglePlayPromoteInput, GooglePlayTrackMutationInput } from "../../domain/store-assets-types";
import { storeAssetsApiService } from "../../application/services/store-assets-api-service";
import { useAuthHeaders } from "./use-auth-headers";

export function usePlayTracks() {
  const headers = useAuthHeaders();
  const [snapshot, setSnapshot] = React.useState<Awaited<ReturnType<typeof storeAssetsApiService.snapshot>> | null>(null);
  const [busy, setBusy] = React.useState(false);
  const refresh = React.useCallback(async () => {
    if (headers) setSnapshot(await storeAssetsApiService.snapshot(headers));
  }, [headers]);
  React.useEffect(() => { void refresh(); }, [refresh]);
  const update = async (input: GooglePlayTrackMutationInput) => {
    if (!headers) return false;
    setBusy(true);
    try {
      setSnapshot((await storeAssetsApiService.updateTrack(input, headers)).snapshot);
      return true;
    } finally {
      setBusy(false);
    }
  };
  const promote = async (input: GooglePlayPromoteInput) => {
    if (!headers) return false;
    setBusy(true);
    try {
      setSnapshot((await storeAssetsApiService.promote(input, headers)).snapshot);
      return true;
    } finally {
      setBusy(false);
    }
  };
  const uploadMapping = async (form: FormData) => {
    if (!headers) return false;
    setBusy(true);
    try {
      setSnapshot((await storeAssetsApiService.uploadMapping(form, headers)).snapshot);
      return true;
    } finally {
      setBusy(false);
    }
  };
  return { snapshot, busy, refresh, update, promote, uploadMapping };
}
