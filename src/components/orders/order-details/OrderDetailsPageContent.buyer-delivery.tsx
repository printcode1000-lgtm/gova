"use client";

import * as React from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { useProfileContacts } from "@/features/profile/hooks/use-profile-contacts";
import { OrderActionButton } from "../OrderActionButton";
import { hasOrderDeliveryAddress, profileAddress } from "../order-labels";
import type { DbRow } from "../order-types";
import { RunAction, text } from "./OrderDetailsPageContent.navigation-summary";

export function BuyerDeliveryAddressPanel({
  order,
  orderId,
  busyAction,
  runAction,
}: {
  order: DbRow;
  orderId: string;
  busyAction: string;
  runAction: RunAction;
}) {
  const { contacts, isLoading } = useProfileContacts();
  const profileLocation = profileAddress({ contacts });
  const hasProfileAddress = Boolean(profileLocation.address.trim());
  const profileHref = `/profile?mode=edit&tab=contact&returnTo=${encodeURIComponent(
    `/orders/details?orderId=${orderId}`,
  )}`;

  if (hasOrderDeliveryAddress(order)) return null;

  if (isLoading) {
    return (
      <div className="mb-4 rounded-lg border border-outline-variant bg-muted/20 p-3 text-sm text-muted-foreground">
        جاري تحميل بيانات التواصل...
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
      <p className="leading-6 text-on-surface">{text.buyerAddressHint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={profileHref}
          className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-xs font-semibold text-on-surface transition hover:border-primary hover:text-primary"
        >
          <MapPin className="h-4 w-4" />
          {text.editBuyerAddressInProfile}
        </Link>
        {hasProfileAddress ? (
          <OrderActionButton
            id="buyer-apply-delivery-address"
            action="buyer_apply_delivery_address"
            busyAction={busyAction}
            onClick={() => runAction("buyer_apply_delivery_address", {})}
          />
        ) : null}
      </div>
    </div>
  );
}
