"use client";

import { PackageCheck } from "lucide-react";

import { formatMoney, statusLabel } from "../order-labels";
import type { DbRow } from "../order-types";
import {
  type RunAction,
  text,
} from "./OrderDetailsPageContent.navigation-summary";
import { CustomRequestActions } from "./OrderDetailsPageContent.custom-request-actions";
import { uiAttributes } from "@asol/ui-registry-core";

export function CustomRequestRow({
  item,
  isSeller,
  isBuyer,
  currency,
  busyAction,
  runAction,
}: {
  item: DbRow;
  isSeller: boolean;
  isBuyer: boolean;
  currency: string;
  busyAction: string;
  runAction: RunAction;
}) {
  const itemId = String(item.id);
  return (
    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.custom-request-row.div.7-wKX4Vw", id: "orders.order-details.order-details-page-content.custom-request-row.div.7" })} id="orders.order-details.order-details-page-content.custom-request-row.div" className="rounded-xl border border-outline-variant bg-background p-3">
      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.custom-request-row.div.8-I2d6pZ", id: "orders.order-details.order-details-page-content.custom-request-row.div.8" })} id="orders.order-details.order-details-page-content.custom-request-row.div.2" className="flex gap-3">
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.custom-request-row.div.9-OplYQ9", id: "orders.order-details.order-details-page-content.custom-request-row.div.9" })} id="orders.order-details.order-details-page-content.custom-request-row.div.3" className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
          <PackageCheck id="orders.order-details.order-details-page-content.custom-request-row.package-check" className="h-7 w-7 text-primary" />
        </div>
        <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.custom-request-row.div.10-qGCaQ7", id: "orders.order-details.order-details-page-content.custom-request-row.div.10" })} id="orders.order-details.order-details-page-content.custom-request-row.div.4" className="min-w-0 flex-1">
          <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.custom-request-row.div.11-QviM2U", id: "orders.order-details.order-details-page-content.custom-request-row.div.11" })} id="orders.order-details.order-details-page-content.custom-request-row.div.5" className="flex flex-wrap items-start justify-between gap-2">
            <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.custom-request-row.div.12-gGT0ZC", id: "orders.order-details.order-details-page-content.custom-request-row.div.12" })} id="orders.order-details.order-details-page-content.custom-request-row.div.6">
              <h3 {...uiAttributes({ uid: "orders.order-details.order-details-page-content.custom-request-row.h3.2-p2GTb7", id: "orders.order-details.order-details-page-content.custom-request-row.h3.2" })} id="orders.order-details.order-details-page-content.custom-request-row.h3" className="font-semibold">
                {String(item.title ?? "طلب خاص")}
              </h3>
              <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.custom-request-row.p.4-3uE1YJ", id: "orders.order-details.order-details-page-content.custom-request-row.p.4" })} id="orders.order-details.order-details-page-content.custom-request-row.p" className="text-xs text-muted-foreground">
                {text.itemStatus}: {statusLabel(item.status)}
              </p>
              {item.buyer_description ? (
                <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.custom-request-row.p.5-m4anoV", id: "orders.order-details.order-details-page-content.custom-request-row.p.5" })} id="orders.order-details.order-details-page-content.custom-request-row.p.2" className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {String(item.buyer_description)}
                </p>
              ) : null}
            </div>
            <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.custom-request-row.p.6-B8JRSb", id: "orders.order-details.order-details-page-content.custom-request-row.p.6" })} id="orders.order-details.order-details-page-content.custom-request-row.p.3" className="font-bold">
              {formatMoney(item.total_price, currency)}
            </p>
          </div>
          <CustomRequestActions
            item={item}
            itemId={itemId}
            isSeller={isSeller}
            isBuyer={isBuyer}
            busyAction={busyAction}
            runAction={runAction}
          />
        </div>
      </div>
    </div>
  );
}
