import { OrderDetailsPageContent } from "@/components/orders/OrderDetailsPageContent";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailsPageContent orderId={orderId} />;
}
