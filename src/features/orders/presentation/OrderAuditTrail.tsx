"use client";

import type { DbRow } from "./order-types";
import { actionLabel, statusLabel } from "./order-labels";
import { uiAttributes } from "@asol/ui-registry-core";

function auditTitle(entry: DbRow) {
  const nextStatus = entry.new_status;
  if (typeof nextStatus === "string" && nextStatus.trim()) {
    return statusLabel(nextStatus);
  }
  return actionLabel(entry.action);
}

export function OrderAuditTrail({ audit }: { audit: DbRow[] }) {
  return (
    <section {...uiAttributes({ uid: "orders.order-audit-trail.section.2-PPA3LK", id: "orders.order-audit-trail.section.2" })} id="orders.order-audit-trail.section" className="rounded-xl border border-outline-variant bg-surface p-4 shadow-sm">
      <h2 {...uiAttributes({ uid: "orders.order-audit-trail.h2.2-2RP1eA", id: "orders.order-audit-trail.h2.2" })} id="orders.order-audit-trail.h2" className="font-bold">سجل مختصر</h2>
      {audit.length === 0 ? (
        <p {...uiAttributes({ uid: "orders.order-audit-trail.p.2-vp2fPX", id: "orders.order-audit-trail.p.2" })} id="orders.order-audit-trail.p" className="mt-2 text-sm text-muted-foreground">لا يوجد سجل بعد.</p>
      ) : (
        <div {...uiAttributes({ uid: "orders.order-audit-trail.div.2-76CKIl", id: "orders.order-audit-trail.div.2" })} id="orders.order-audit-trail.div" className="mt-3 space-y-2">
          {audit.slice(0, 8).map((entry) => (
            <div key={String(entry.id)} {...uiAttributes({ uid: "orders.order-audit-trail.div.3-IvT7wH", id: "orders.order-audit-trail.div.3" })} className="text-sm">
              <p {...uiAttributes({ uid: "orders.order-audit-trail.p.3-s8PdYP", id: "orders.order-audit-trail.p.3" })} className="font-semibold">{auditTitle(entry)}</p>
              {entry.new_status ? (
                <p {...uiAttributes({ uid: "orders.order-audit-trail.p.4-Z39F0d", id: "orders.order-audit-trail.p.4" })} className="text-xs text-muted-foreground">
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
