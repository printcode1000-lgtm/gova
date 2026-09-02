import { AlertTriangle } from "lucide-react";

import type { GooglePlayConsoleEndpointResult } from "../../domain/types";

export function EndpointCard({ id, endpoint, availableText, unavailableText }: {
  endpoint: GooglePlayConsoleEndpointResult;
  availableText: string;
  unavailableText: string;
} & { id?: string }) {
  return (
    <section id={id} className="rounded-md border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{endpoint.label}</h3>
        <span className="rounded-sm bg-muted px-2 py-1 text-xs">
          {endpoint.ok ? availableText : unavailableText}
        </span>
      </div>
      {endpoint.ok ? (
        <pre className="mt-3 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs" dir="ltr">
          {JSON.stringify(endpoint.data, null, 2)}
        </pre>
      ) : (
        <div className="mt-3 flex gap-2 rounded-md bg-error-container p-3 text-sm text-on-error-container">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="break-all" dir="ltr">{endpoint.error}</span>
        </div>
      )}
    </section>
  );
}
