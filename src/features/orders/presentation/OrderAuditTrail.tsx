"use client";

import type { AuditTrailDto } from "@asol/orders-core";
import { actionLabel, statusLabel } from "./order-labels";

function auditTitle(entry: AuditTrailDto) {
  const nextStatus = entry.newStatus;
  if (typeof nextStatus === "string" && nextStatus.trim()) {
    return statusLabel(nextStatus);
  }
  return actionLabel(entry.action);
}

export function OrderAuditTrail({ audit }: { audit: AuditTrailDto[] }) {
  return (
    <section id='features-orders-presentation-orderaudittrail-section-1-wphwjn' className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 id='features-orders-presentation-orderaudittrail-heading-2-yw9wkk' className="font-bold">سجل مختصر</h2>
      {audit.length === 0 ? (
        <p id='features-orders-presentation-orderaudittrail-text-3-v0yk9p' className="mt-2 text-sm text-muted-foreground">لا يوجد سجل بعد.</p>
      ) : (
        <div id='features-orders-presentation-orderaudittrail-div-4-psy7in' className="mt-3 space-y-2">
          {audit.slice(0, 8).map((entry) => (
            <div key={String(entry.id)} className="text-sm">
              <p className="font-semibold">{auditTitle(entry)}</p>
              {entry.newStatus ? (
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
