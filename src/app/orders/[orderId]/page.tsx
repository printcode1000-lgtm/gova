import { OrderDetailsPageContent } from "@/features/orders/ui";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailsPageContent id="orders.order-id.page.order-details-page-content" orderId={orderId} />;
}
