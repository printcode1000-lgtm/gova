import { OrderDetailsPageContent } from "@/features/orders/ui";

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailsPageContent orderId={orderId} />;
}
