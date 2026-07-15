"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { OrderDetailsPageContent } from "@/components/orders/OrderDetailsPageContent";

function OrderDetailsFromQuery() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId")?.trim();

  if (!orderId) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 text-center">
        <h1 className="text-xl font-bold">Order not found</h1>
      </main>
    );
  }

  return <OrderDetailsPageContent orderId={orderId} />;
}

export default function StaticOrderDetailsPage() {
  return (
    <Suspense fallback={null}>
      <OrderDetailsFromQuery />
    </Suspense>
  );
}
