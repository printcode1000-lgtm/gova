"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OrderDetailsPageContent } from "@/features/orders/ui";

function OrderDetailsFromQuery() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId")?.trim();

  if (!orderId) {
    return (
      <main id='app-orders-details-page-main-1-3kxf0n' className="mx-auto w-full max-w-4xl px-4 py-10 text-center">
        <h1 id='app-orders-details-page-heading-2-li2ryd' className="text-xl font-bold">Order not found</h1>
      </main>
    );
  }

  return <OrderDetailsPageContent id='app-orders-details-page-orderdetailspagecontent-3-tpf4rz' orderId={orderId} />;
}

export default function StaticOrderDetailsPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetailsFromQuery />
    </Suspense>
  );
}
