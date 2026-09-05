"use client";

import type { CustomRequestItemDto } from "@asol/orders-core";
import { PackageCheck } from "lucide-react";

import { formatMoney, statusLabel } from "../order-labels";

import {
  type RunAction,
  text,
} from "./OrderDetailsPageContent.navigation-summary";
import { CustomRequestActions } from "./OrderDetailsPageContent.custom-request-actions";

export function CustomRequestRow({
  item,
  isSeller,
  isBuyer,
  currency,
  busyAction,
  runAction,
}: {
  item: CustomRequestItemDto;
  isSeller: boolean;
  isBuyer: boolean;
  currency: string;
  busyAction: string;
  runAction: RunAction;
}) {
  const itemId = String(item.id);
  return (
    <div id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-div-1-nf9zyi' className="rounded-xl border border-outline-variant bg-background p-3">
      <div id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-div-2-evvn1m' className="flex gap-3">
        <div id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-div-3-kqkydn' className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10">
          <PackageCheck id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-packagecheck-4-sioonk' className="h-7 w-7 text-primary" />
        </div>
        <div id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-div-5-80p2bt' className="min-w-0 flex-1">
          <div id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-div-6-0zqrln' className="flex flex-wrap items-start justify-between gap-2">
            <div id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-div-7-hnoqya'>
              <h3 id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-heading-8-0sgyzp' className="font-semibold">
                {String(item.title ?? "طلب خاص")}
              </h3>
              <p id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-text-9-zlf8eb' className="text-xs text-muted-foreground">
                {text.itemStatus}: {statusLabel(item.status)}
              </p>
              {item.buyerDescription ? (
                <p id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-text-10-q7yzcv' className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {String(item.buyerDescription)}
                </p>
              ) : null}
            </div>
            <p id='orders-presentation-order-details-orderdetailspagecontent-custom-request-row-text-11-glmjaq' className="font-bold">
              {formatMoney(item.totalPrice, currency)}
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
