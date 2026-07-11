import type { NotificationEvent, NotificationLocale, TemplateNotificationInput } from "../domain/entities";

const EVENT_TEMPLATE_MAP: Record<string, string> = {
  "orders.created": "order.created",
  "orders.updated": "order.updated",
  "orders.sellerAccepted": "order.sellerAccepted",
  "orders.sellerRejected": "order.sellerRejected",
  "shipments.updated": "shipment.updated",
  "returns.requested": "return.requested",
  "chat.messageCreated": "message.new",
  "payments.received": "payment.received",
  "offers.received": "offer.received",
  "system.info": "system.info",
};

export class EventNotificationMapper {
  toTemplateInput(event: NotificationEvent, locale: NotificationLocale): TemplateNotificationInput | null {
    const templateId = EVENT_TEMPLATE_MAP[event.name];
    if (!templateId) return null;
    return {
      uid: event.uid,
      templateId,
      dedupeKey: event.dedupeKey,
      locale,
      variables: event.variables,
      metadata: event.metadata,
      route: event.route,
      channels: event.channels,
      targets: event.targets,
      priority: event.priority,
      eventName: event.name,
    };
  }

  listMappings(): Record<string, string> {
    return { ...EVENT_TEMPLATE_MAP };
  }
}
