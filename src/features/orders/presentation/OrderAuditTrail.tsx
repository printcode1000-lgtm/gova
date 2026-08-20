"use client";

import type { DbRow } from "./order-types";
import { actionLabel, statusLabel } from "./order-labels";

function auditTitle(entry: DbRow) {
  const nextStatus = entry.new_status;
  if (typeof nextStatus === "string" && nextStatus.trim()) {
    return statusLabel(nextStatus);
  }
  return actionLabel(entry.action);
}

export function OrderAuditTrail({ audit }: { audit: DbRow[] }) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 className="font-bold">سجل مختصر</h2>
      {audit.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">لا يوجد سجل بعد.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {audit.slice(0, 8).map((entry) => (
            <div key={String(entry.id)} className="text-sm">
              <p className="font-semibold">{auditTitle(entry)}</p>
              {entry.new_status ? (
                <p className="text-xs text-muted-foreground">
                  {actionLabel(entry.action)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
