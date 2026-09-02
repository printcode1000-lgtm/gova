import { AlertTriangle } from "lucide-react";

import type { GooglePlayConsoleEndpointResult } from "../../domain/types";

export function EndpointCard({ id, endpoint, availableText, unavailableText }: {
  endpoint: GooglePlayConsoleEndpointResult;
  availableText: string;
  unavailableText: string;
} & { id?: string }) {
  return (
    <section id={id} className="rounded-md border bg-surface p-4">
      <div id="google-play-console-presentation-components-endpointcard-div-2-aaucyi" className="flex items-center justify-between gap-2">
        <h3 id="google-play-console-presentation-components-endpointcard-heading-3-wmqzzo" className="font-semibold">{endpoint.label}</h3>
        <span id="google-play-console-presentation-components-endpointcard-text-4-wlvjry" className="rounded-sm bg-muted px-2 py-1 text-xs">
          {endpoint.ok ? availableText : unavailableText}
        </span>
      </div>
      {endpoint.ok ? (
        <pre id="google-play-console-presentation-components-endpointcard-pre-5-if3gkd" className="mt-3 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
          {JSON.stringify(endpoint.data, null, 2)}
        </pre>
      ) : (
        <div id="google-play-console-presentation-components-endpointcard-div-6-1ua2x1" className="mt-3 flex gap-2 rounded-md bg-error-container p-3 text-sm text-on-error-container">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span id="google-play-console-presentation-components-endpointcard-text-7-byu7c6" className="break-all" dir="ltr">{endpoint.error}</span>
        </div>
      )}
    </section>
  );
}
