"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OrderDetailsPageContent } from "@/features/orders/ui";
import { uiAttributes } from "@asol/ui-registry-core";

function OrderDetailsFromQuery() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId")?.trim();

  if (!orderId) {
    return (
      <main {...uiAttributes({ uid: "orders.details.page.main.2-W9iy9K", id: "orders.details.page.main.2" })} id="orders.details.page.main" className="mx-auto w-full max-w-4xl px-4 py-10 text-center">
        <h1 {...uiAttributes({ uid: "orders.details.page.h1.2-hW9dT4", id: "orders.details.page.h1.2" })} id="orders.details.page.h1" className="text-xl font-bold">Order not found</h1>
      </main>
    );
  }

  return <OrderDetailsPageContent id="orders.details.page.order-details-page-content" orderId={orderId} />;
}

export default function StaticOrderDetailsPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetailsFromQuery />
    </Suspense>
  );
}
