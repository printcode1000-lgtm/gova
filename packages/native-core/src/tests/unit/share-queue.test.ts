import assert from "node:assert/strict";
import { ShareQueueManager } from "../../domain/share/share-queue";

const queue = new ShareQueueManager(5);

// 1. Enqueue items
const item1 = queue.enqueue({ id: "item_1", kind: "text", text: "First", createdAt: Date.now() });
const item2 = queue.enqueue({ id: "item_2", kind: "text", text: "Second", createdAt: Date.now() });

assert.ok(item1 !== null);
assert.ok(item2 !== null);
assert.equal(queue.getPending().length, 2);

// 2. Oldest-first order
const pending = queue.getPending();
assert.equal(pending[0].id, "item_1");
assert.equal(pending[1].id, "item_2");

// 3. Deliver-once: consuming item
assert.equal(queue.consume(item1!.id), true);
assert.equal(queue.getPending().length, 1);
assert.equal(queue.consume(item1!.id), false, "Cannot consume twice");

// 4. Bounded capacity eviction (max 5)
queue.clear();
for (let i = 1; i <= 6; i++) {
  queue.enqueue({ id: `item_${i}`, kind: "text", text: `Item ${i}`, createdAt: Date.now() });
}
const items = queue.getPending();
assert.equal(items.length, 5, "Queue depth must not exceed max length");
assert.equal(items[0].id, "item_2", "Oldest item 1 must be evicted");

// 5. Listener notification
let received: any = null;
const unsub = queue.subscribe((item) => {
  received = item;
});

const newItem = queue.enqueue({ id: "item_live", kind: "text", text: "Live item", createdAt: Date.now() });
assert.equal(received?.text, "Live item");

unsub();
queue.enqueue({ id: "item_after", kind: "text", text: "After unsub", createdAt: Date.now() });
assert.equal(received?.text, "Live item", "Listener must not fire after unsub");

console.log("✓ All share queue unit tests passed.");
