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
      <div id={id} className="mt-3 rounded-lg border border-outline-variant bg-muted/20 p-3 text-sm text-muted-foreground">
        جاري تحميل إعدادات الشحن...
      </div>
    );
  }

  return (
    <div id={id} className="mt-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
      <p id="orders-presentation-order-details-orderdetailspagecontent-seller-fulfillment-panels-text-3-wsyf5x" className="leading-6 text-on-surface">{text.noCarrierSellerHint}</p>
      {carrierUids.length > 1 ? (
        <label id="orders-presentation-order-details-orderdetailspagecontent-seller-fulfillment-panels-label-4-zkd700" className="mt-3 block space-y-1.5">
          <span id="orders-presentation-order-details-orderdetailspagecontent-seller-fulfillment-panels-text-5-4zzinz" className="text-xs font-semibold text-muted-foreground">
            مقدم التوصيل
          </span>
          <select id="orders-presentation-order-details-orderdetailspagecontent-seller-fulfillment-panels-select-6-lsey4y"
            value={selectedCarrierUid}
            onChange={(event) => setSelectedCarrierUid(event.target.value)}
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm"
          >
            {carrierUids.map((uid) => (
              <option key={uid} value={uid}>
                {labelForUid(uid)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div id="orders-presentation-order-details-orderdetailspagecontent-seller-fulfillment-panels-div-7-3p3ts7" className="mt-3 flex flex-wrap gap-2">
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
    <div id={id} className="mt-3 rounded-lg border border-outline-variant bg-muted/20 p-3 text-sm">
      <p id="orders-presentation-order-details-orderdetailspagecontent-seller-fulfillment-panels-text-10-zve67q" className="leading-6 text-on-surface">{text.sellerFulfillmentHint}</p>
      <div id="orders-presentation-order-details-orderdetailspagecontent-seller-fulfillment-panels-div-11-49zvix" className="mt-3 flex flex-wrap gap-2">
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
