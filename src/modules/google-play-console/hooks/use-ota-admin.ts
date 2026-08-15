"use client";

import * as React from "react";

import { useSession } from "@/features/auth/components/SessionProvider";
import { otaApiService } from "@/features/ota/services/ota-api-service";
import { otaUpdateService } from "@/features/ota/services/ota-update-service";
import type { OtaAdminDashboard, OtaDownloadProgress, OtaReleaseDiff } from "@/features/ota/types/ota.types";
import { NativeCore } from "@asol/native-core";

export function useOtaAdmin() {
  const { session } = useSession();
  const [dashboard, setDashboard] = React.useState<OtaAdminDashboard | null>(null);
  const [diff, setDiff] = React.useState<OtaReleaseDiff | null>(null);
  const [baseReleaseId, setBaseReleaseId] = React.useState("");
  const [progress, setProgress] = React.useState<OtaDownloadProgress | null>(null);
  const [rollout, setRollout] = React.useState(100);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const refresh = React.useCallback(async () => {
    if (!session) return;
    setBusy(true);
    try { setDashboard(await otaApiService.getAdminDashboard(session)); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "releaseConsole.ota.loadFailed"); }
    finally { setBusy(false); }
  }, [session]);
  React.useEffect(() => { void refresh(); }, [refresh]);
  React.useEffect(() => {
    if (dashboard?.current.release) setRollout(dashboard.current.release.rolloutPercentage);
  }, [dashboard?.current.release]);
  React.useEffect(() => {
    if (!session || !baseReleaseId) { setDiff(null); return; }
    void otaApiService.getReleaseDiff(session, baseReleaseId).then(setDiff).catch((cause) => {
      setMessage(cause instanceof Error ? cause.message : "releaseConsole.ota.diffFailed");
    });
  }, [baseReleaseId, session]);
  const changeApproval = async (approved: boolean) => {
    if (!session || !dashboard) return;
    const release = dashboard.current.release;
    if (!release) return;
    setBusy(true);
    try {
      setDashboard(await otaApiService.setReleaseApproval({
        identity: session, releaseId: release.releaseId, version: release.version,
        approved, rolloutPercentage: rollout,
      }));
    } finally { setBusy(false); }
  };
  const download = async () => {
    if (!session) return;
    setProgress(null); setBusy(true);
    try { await otaUpdateService.checkAndDownload(setProgress, session); }
    finally { setBusy(false); }
  };
  const copyManifest = async () => {
    if (dashboard?.current.manifest)
      await NativeCore.writeClipboard({ string: JSON.stringify(dashboard.current.manifest, null, 2) });
  };
  return {
    dashboard, diff, baseReleaseId, setBaseReleaseId, progress, rollout, setRollout,
    busy, message, refresh, changeApproval, download, copyManifest,
  };
}
