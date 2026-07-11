import assert from "node:assert/strict";
import { NotificationBuilder } from "../application/notification-builder";
import { EventNotificationMapper } from "../application/event-notification-mapper";
import { NotificationCategories, NotificationTargets } from "../domain/enums";

const builder = new NotificationBuilder();

const notification = builder.fromTemplate({
  uid: "usr_test",
  templateId: "order.created",
  dedupeKey: "orders.created:ord_1:buyer",
  locale: "ar",
  variables: {
    orderId: "ord_1",
    orderNumber: "GOVA-1",
  },
});

assert.equal(notification.title, "تم إنشاء الطلب");
assert.equal(notification.body, "تم إنشاء طلبك GOVA-1 بنجاح.");
assert.equal(notification.route?.href, "/orders/ord_1");
assert.equal(notification.category, NotificationCategories.Orders);
assert.ok(notification.targets.includes(NotificationTargets.Badge));

const mapper = new EventNotificationMapper();
const mapped = mapper.toTemplateInput(
  {
    name: "orders.created",
    uid: "usr_test",
    dedupeKey: "orders.created:ord_1:buyer",
    variables: { orderId: "ord_1", orderNumber: "GOVA-1" },
  },
  "ar",
);

assert.equal(mapped?.templateId, "order.created");
assert.equal(mapped?.dedupeKey, "orders.created:ord_1:buyer");

const custom = builder.custom({
  uid: "usr_test",
  dedupeKey: "system:test",
  title: "Custom",
  body: "Body",
  category: NotificationCategories.System,
});

assert.equal(custom.title, "Custom");
assert.equal(custom.source, "custom");

console.log("Notification builder tests passed.");
