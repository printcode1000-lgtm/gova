export function shipmentActionAvailability(status: unknown) {
  const shipmentStatus = String(status ?? "");

  return {
    canReceive: [
      "waiting_for_carrier_pickup",
      "partially_received_by_carrier",
    ].includes(shipmentStatus),
    canReject: [
      "waiting_for_carrier_pickup",
      "partially_received_by_carrier",
    ].includes(shipmentStatus),
    canTransit: [
      "waiting_for_carrier_pickup",
      "fully_received_by_carrier",
      "partially_received_by_carrier",
    ].includes(shipmentStatus),
    canOutForDelivery: [
      "in_transit",
      "arrived_at_distribution_center",
    ].includes(shipmentStatus),
    canDeliver: [
      "in_transit",
      "out_for_delivery",
      "partially_delivered",
    ].includes(shipmentStatus),
  };
}
