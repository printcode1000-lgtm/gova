import type { OtaReleaseDiff, OtaReleaseSummary } from "@asol/ota-core";

import { DeltaTable } from "./DeltaTable";
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

export function OtaReleaseChanges({ diff, history, currentId, baseId, onBaseChange, emptyText }: {
  diff: OtaReleaseDiff | null;
  history: OtaReleaseSummary[];
  currentId: string;
  baseId: string;
  onBaseChange: (value: string) => void;
  emptyText: string;
}) {
  const candidates = history.filter((item) => item.releaseId !== currentId);
  const rows = (diff?.files ?? []).map((file) => ({
    id: file.path,
    state: file.kind === "modified" ? (file.sizeDelta >= 0 ? "grown" : "shrunk") : file.kind,
    leftCompressedBytes: file.previousSize ?? 0,
    rightCompressedBytes: file.currentSize ?? 0,
    compressedDeltaBytes: file.sizeDelta,
    compressedDeltaPercent: file.previousSize ? file.sizeDelta / file.previousSize * 100 : null,
    leftUncompressedBytes: file.previousSize ?? 0,
    rightUncompressedBytes: file.currentSize ?? 0,
  })) as Parameters<typeof DeltaTable>[0]["rows"];
  return (
    <section {...uiAttributes({ uid: "google-play-console.ota-release-changes.section.2-It01QW", id: "google-play-console.ota-release-changes.section.2" })} id="google-play-console.ota-release-changes.section" className="space-y-3 rounded-md border bg-surface p-4">
      <select {...uiAttributes({ uid: "google-play-console.ota-release-changes.select.2-yYW3XM", id: "google-play-console.ota-release-changes.select.2" })} id="google-play-console.ota-release-changes.select" className="h-10 w-full rounded-md border bg-background px-3" value={baseId}
        onChange={(event) => onBaseChange(event.target.value)} dir="ltr">
        <option {...uiAttributes({ uid: "google-play-console.ota-release-changes.option-N6rI12", id: "google-play-console.ota-release-changes.option" })} value="">{emptyText}</option>
        {candidates.map((item) => <option key={item.releaseId} {...uiAttributes({ uid: "google-play-console.ota-release-changes.option.2-dyLXq6", id: "google-play-console.ota-release-changes.option.2" , instance: createOpaqueUiInstanceId("iter-8b2a151769", String(item.releaseId))})} value={item.releaseId}>
          {item.version} / {item.releaseId}</option>)}
      </select>
      <DeltaTable id="google-play-console.ota-release-changes.delta-table" rows={rows} emptyText={emptyText} />
    </section>
  );
}
