"use client";

import * as React from "react";
import Link from "next/link";
import { CircleDollarSign, RotateCcw, Truck } from "lucide-react";

import { OrderActionButton } from "../OrderActionButton";
import { profileFulfillmentSectionHref } from "../order-labels";
import {
  type RunAction,
  text,
} from "./OrderDetailsPageContent.navigation-summary";
import { useProfileFulfillmentSettings } from "@/features/profile/ui";
import { useProfileCarrierLabels } from "@/features/profile/ui";
import { uiAttributes , createOpaqueUiInstanceId} from "@asol/ui-registry-core";

export function SellerCarrierLinkPanel({ id,
  orderId,
  sellerOrderId,
  busyAction,
  runAction,
}: {
  orderId: string;
  sellerOrderId: string;
  busyAction: string;
  runAction: RunAction;
} & { id?: string }) {
  const { settings: fulfillmentSettings, isLoading: loadingFulfillment } =
    useProfileFulfillmentSettings();
  const carrierUids = fulfillmentSettings.carrierUids.filter(Boolean);
  const [selectedCarrierUid, setSelectedCarrierUid] = React.useState(
    carrierUids[0] ?? "",
  );
  React.useEffect(() => {
    if (carrierUids.length > 0 && !carrierUids.includes(selectedCarrierUid)) {
      setSelectedCarrierUid(carrierUids[0]);
    }
  }, [carrierUids, selectedCarrierUid]);
  const carrierLabels = useProfileCarrierLabels(carrierUids);
  const labelForUid = (uid: string) =>
    carrierLabels.find((entry) => entry.uid === uid)?.label ?? uid;
  const profileHref = `/profile?mode=edit&tab=fulfillment&returnTo=${encodeURIComponent(
    `/orders/details?orderId=${orderId}&role=seller`,
  )}`;

  if (loadingFulfillment) {
    return (
      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.div-FvZ7NV", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.div" })} id={id} className="mt-3 rounded-lg border border-outline-variant bg-muted/20 p-3 text-sm text-muted-foreground">
        جاري تحميل إعدادات الشحن...
      </div>
    );
  }

  return (
    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.div.2-zk45OL", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.div.2" })} id={id} className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
      <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.p-149Btc", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.p" })} className="leading-6 text-on-surface">{text.noCarrierSellerHint}</p>
      {carrierUids.length > 1 ? (
        <label {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.label-T4YcEQ", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.label" })} className="mt-3 block space-y-1.5">
          <span {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.span-ZD9CZd", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.span" })} className="text-xs font-semibold text-muted-foreground">
            مقدم التوصيل
          </span>
          <select {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.select-r8bZV6", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.select" })}
            value={selectedCarrierUid}
            onChange={(event) => setSelectedCarrierUid(event.target.value)}
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm"
          >
            {carrierUids.map((uid) => (
              <option key={uid} {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.option-EEKE1g", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.option" , instance: createOpaqueUiInstanceId("iter-87b45b0bd5", String(uid))})} value={uid}>
                {labelForUid(uid)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.div.3-9VXSPL", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.div.3" })} className="mt-3 flex flex-wrap gap-2">
        <Link
          href={profileHref}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs font-semibold text-on-surface transition"
        >
          <Truck className="h-4 w-4" />
          {text.linkCarrierInProfile}
        </Link>
        {selectedCarrierUid ? (
          <OrderActionButton
            action="seller_assign_delivery_carrier"
            busyAction={busyAction}
            id={sellerOrderId}
            onClick={() =>
              runAction("seller_assign_delivery_carrier", {
                sellerOrderId,
                carrierUid: selectedCarrierUid,
              })
            }
          />
        ) : null}
      </div>
    </div>
  );
}

export function SellerFulfillmentEditPanel({ id, orderId }: { orderId: string } & { id?: string }) {
  return (
    <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.div.4-IU6D5e", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.div.4" })} id={id} className="mt-3 rounded-lg border border-outline-variant bg-muted/20 p-3 text-sm">
      <p {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.p.2-CyVr47", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.p.2" })} className="leading-6 text-on-surface">{text.sellerFulfillmentHint}</p>
      <div {...uiAttributes({ uid: "orders.order-details.order-details-page-content.seller-fulfillment-panels.div.5-G3BwoG", id: "orders.order-details.order-details-page-content.seller-fulfillment-panels.div.5" })} className="mt-3 flex flex-wrap gap-2">
        <Link
          href={profileFulfillmentSectionHref(orderId, "shipping")}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs font-semibold text-on-surface transition"
        >
          <CircleDollarSign className="h-4 w-4" />
          {text.editShippingPricing}
        </Link>
        <Link
          href={profileFulfillmentSectionHref(orderId, "returns")}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs font-semibold text-on-surface transition"
        >
          <RotateCcw className="h-4 w-4" />
          {text.editReturnPolicy}
        </Link>
      </div>
    </div>
  );
}
