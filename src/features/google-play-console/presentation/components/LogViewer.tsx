
import { uiAttributes } from "@asol/ui-registry-core";export function LogViewer({ text, emptyText }: { text: string; emptyText: string }) {
  return (
    <pre {...uiAttributes({ uid: "google-play-console.log-viewer.pre-6eNSNc", id: "google-play-console.log-viewer.pre" })} className="min-h-80 max-h-[32rem] overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
      {text || emptyText}
    </pre>
  );
}
