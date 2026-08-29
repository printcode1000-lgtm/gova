
import { uiAttributes } from "@asol/ui-registry-core";export function SizeBar({ id, value, maximum, label }: { value: number; maximum: number; label: string } & { id?: string }) {
  const width = maximum > 0 ? Math.min(100, value / maximum * 100) : 0;
  return (
    <div {...uiAttributes({ uid: "google-play-console.size-bar.div-5OjdpW", id: "google-play-console.size-bar.div" })} id={id} className="space-y-1">
      <div {...uiAttributes({ uid: "google-play-console.size-bar.div.2-8LzL6v", id: "google-play-console.size-bar.div.2" })} className="flex justify-between gap-2 text-xs"><span {...uiAttributes({ uid: "google-play-console.size-bar.span-6Q1W7D", id: "google-play-console.size-bar.span" })}>{label}</span><span {...uiAttributes({ uid: "google-play-console.size-bar.span.2-fQd5RK", id: "google-play-console.size-bar.span.2" })}>{value}</span></div>
      <div {...uiAttributes({ uid: "google-play-console.size-bar.div.3-uN2dbk", id: "google-play-console.size-bar.div.3" })} className="h-2 overflow-hidden rounded-sm bg-muted">
        <div {...uiAttributes({ uid: "google-play-console.size-bar.div.4-pg9Uhx", id: "google-play-console.size-bar.div.4" })} className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
