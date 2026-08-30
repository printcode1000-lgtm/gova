"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OrderDetailsPageContent } from "@/features/orders/ui";

function OrderDetailsFromQuery() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId")?.trim();

  if (!orderId) {
    return (
      <main id="orders.details.page.main" className="mx-auto w-full max-w-4xl px-4 py-10 text-center">
        <h1 id="orders.details.page.h1" className="text-xl font-bold">Order not found</h1>
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
