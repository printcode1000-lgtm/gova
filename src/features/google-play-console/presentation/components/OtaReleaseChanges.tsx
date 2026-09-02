import type { OtaReleaseDiff, OtaReleaseSummary } from "@asol/ota-core";

import { DeltaTable } from "./DeltaTable";

export function OtaReleaseChanges({
  diff,
  history,
  currentId,
  baseId,
  onBaseChange,
  emptyText,
}: {
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
    compressedDeltaPercent: file.previousSize ? (file.sizeDelta / file.previousSize) * 100 : null,
    leftUncompressedBytes: file.previousSize ?? 0,
    rightUncompressedBytes: file.currentSize ?? 0,
  })) as Parameters<typeof DeltaTable>[0]["rows"];
  return (
    <section
      id='google-play-console-presentation-components-otareleasechanges-section-1-teukkd'
      className="space-y-3 rounded-md border bg-surface p-4"
    >
      <select
        id='google-play-console-presentation-components-otareleasechanges-select-2-ytzb3z'
        className="h-10 w-full rounded-md border bg-background px-3"
        value={baseId}
        onChange={(event) => onBaseChange(event.target.value)}
        dir="ltr"
      >
        <option id="google-play-console-presentation-components-otareleasechanges-option-3-t0kfid" value="">{emptyText}</option>
        {candidates.map((item) => (
          <option key={item.releaseId} value={item.releaseId}>
            {item.version} / {item.releaseId}
          </option>
        ))}
      </select>
      <DeltaTable id='google-play-console-presentation-components-otareleasechanges-deltatable-4-0phkom' rows={rows} emptyText={emptyText} />
    </section>
  );
}
