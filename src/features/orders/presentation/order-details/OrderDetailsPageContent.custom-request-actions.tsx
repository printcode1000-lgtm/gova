"use client";

import type { CustomRequestItemDto } from "@asol/orders-core";
import { OrderActionButton } from "../OrderActionButton";
import { canCancelStatus } from "../order-labels";

import {
  type RunAction,
  isPendingSellerResponse,
} from "./OrderDetailsPageContent.navigation-summary";

export function CustomRequestActions({
  item,
  itemId,
  isSeller,
  isBuyer,
  busyAction,
  runAction,
}: {
  item: CustomRequestItemDto;
  itemId: string;
  isSeller: boolean;
  isBuyer: boolean;
  busyAction: string;
  runAction: RunAction;
}) {
  const sendPrice = () => {
    const value = window.prompt("اكتب السعر بالجنيه المصري");
    if (!value) return;
    const amount = Math.round(Number(value) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) return;
    runAction("seller_send_custom_price_offer", {
      customItemId: itemId,
      priceMinor: amount,
    });
  };

  return (
    <div id='orders-presentation-order-details-orderdetailspagecontent-custom-request-actions-div-1-adduyg' className="mt-3 flex flex-wrap gap-2">
      {isSeller && isPendingSellerResponse(item.status) ? (
        <>
          <OrderActionButton elementScope="order-details-page-content-custom-request-actions-custom-request-actions-order-action-button-284a62"
            action="seller_accept_custom_request"
            busyAction={busyAction}
            id={itemId}
            onClick={() =>
              runAction("seller_accept_custom_request", {
                customItemId: itemId,
              })
            }
          />
          <OrderActionButton elementScope="order-details-page-content-custom-request-actions-custom-request-actions-order-action-button-7050b0"
            action="seller_reject_custom_request"
            busyAction={busyAction}
            id={itemId}
            tone="danger"
            onClick={() =>
              runAction("seller_reject_custom_request", {
                customItemId: itemId,
              })
            }
          />
        </>
      ) : null}
      {isSeller && item.status === "waiting_for_pricing" ? (
        <OrderActionButton elementScope="order-details-page-content-custom-request-actions-custom-request-actions-order-action-button-5d3721"
          action="seller_send_custom_price_offer"
          busyAction={busyAction}
          id={itemId}
          onClick={sendPrice}
        />
      ) : null}
      {isBuyer && item.status === "price_offer_sent" ? (
        <>
          <OrderActionButton elementScope="order-details-page-content-custom-request-actions-custom-request-actions-order-action-button-4d96af"
            action="buyer_accept_custom_price"
            busyAction={busyAction}
            id={itemId}
            onClick={() =>
              runAction("buyer_accept_custom_price", { customItemId: itemId })
            }
          />
          <OrderActionButton elementScope="order-details-page-content-custom-request-actions-custom-request-actions-order-action-button-3da56d"
            action="buyer_reject_custom_price"
            busyAction={busyAction}
            id={itemId}
            tone="danger"
            onClick={() =>
              runAction("buyer_reject_custom_price", { customItemId: itemId })
            }
          />
        </>
      ) : null}
      {isBuyer && canCancelStatus(item.status) ? (
        <OrderActionButton elementScope="order-details-page-content-custom-request-actions-custom-request-actions-order-action-button-7cb7ed"
          action="buyer_cancel_custom_request"
          busyAction={busyAction}
          id={itemId}
          tone="danger"
          onClick={() =>
            runAction("buyer_cancel_custom_request", { customItemId: itemId })
          }
        />
      ) : null}
    </div>
  );
}
