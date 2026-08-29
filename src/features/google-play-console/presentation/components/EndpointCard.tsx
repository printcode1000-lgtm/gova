import { AlertTriangle } from "lucide-react";

import type { GooglePlayConsoleEndpointResult } from "../../domain/types";
import { uiAttributes } from "@asol/ui-registry-core";

export function EndpointCard({ id, endpoint, availableText, unavailableText }: {
  endpoint: GooglePlayConsoleEndpointResult;
  availableText: string;
  unavailableText: string;
} & { id?: string }) {
  return (
    <section {...uiAttributes({ uid: "google-play-console.endpoint-card.section-ZSe2Tu", id: "google-play-console.endpoint-card.section" })} id={id} className="rounded-md border bg-surface p-4">
      <div {...uiAttributes({ uid: "google-play-console.endpoint-card.div-l2KMbC", id: "google-play-console.endpoint-card.div" })} className="flex items-center justify-between gap-2">
        <h3 {...uiAttributes({ uid: "google-play-console.endpoint-card.h3-23z1WM", id: "google-play-console.endpoint-card.h3" })} className="font-semibold">{endpoint.label}</h3>
        <span {...uiAttributes({ uid: "google-play-console.endpoint-card.span-FV1m0J", id: "google-play-console.endpoint-card.span" })} className="rounded-sm bg-muted px-2 py-1 text-xs">
          {endpoint.ok ? availableText : unavailableText}
        </span>
      </div>
      {endpoint.ok ? (
        <pre {...uiAttributes({ uid: "google-play-console.endpoint-card.pre-1wQ24I", id: "google-play-console.endpoint-card.pre" })} className="mt-3 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
          {JSON.stringify(endpoint.data, null, 2)}
        </pre>
      ) : (
        <div {...uiAttributes({ uid: "google-play-console.endpoint-card.div.2-FRF2GH", id: "google-play-console.endpoint-card.div.2" })} className="mt-3 flex gap-2 rounded-md bg-error-container p-3 text-sm text-on-error-container">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span {...uiAttributes({ uid: "google-play-console.endpoint-card.span.2-9R5yEY", id: "google-play-console.endpoint-card.span.2" })} className="break-all" dir="ltr">{endpoint.error}</span>
        </div>
      )}
    </section>
  );
}
