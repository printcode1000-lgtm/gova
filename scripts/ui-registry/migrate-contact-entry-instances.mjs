import { readFileSync, writeFileSync } from "node:fs";

const file = "src/features/profile/presentation/contact-info/AdditionalContactView.tsx";

function replaceExact(before, after, expected = 1) {
  const source = readFileSync(file, "utf8");
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`${file}: expected ${expected} exact match(es), found ${count}`);
  writeFileSync(file, source.split(before).join(after), "utf8");
}

replaceExact(
  'import { uiAttributes } from "@asol/ui-registry-core";',
  'import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";',
);

const cases = [
  {
    key: 'key={phone.id}',
    instance: 'createOpaqueUiInstanceId("contact-phone", phone.id)',
    childBefore: 'ui={{ uid: "profile.contact-info.additional-contact-view.phone-field-pP5K5X", id: "profile.contact-info.additional-contact-view.phone-field" }}',
    childAfter: 'ui={{ uid: "profile.contact-info.additional-contact-view.phone-field-pP5K5X", id: "profile.contact-info.additional-contact-view.phone-field", instance: createOpaqueUiInstanceId("contact-phone", phone.id) }}',
  },
  {
    key: 'key={emailLink.id}',
    instance: 'createOpaqueUiInstanceId("contact-email", emailLink.id)',
    childBefore: 'ui={{ uid: "profile.contact-info.additional-contact-view.input-YsQo6o", id: "profile.contact-info.additional-contact-view.input" }}',
    childAfter: 'ui={{ uid: "profile.contact-info.additional-contact-view.input-YsQo6o", id: "profile.contact-info.additional-contact-view.input", instance: createOpaqueUiInstanceId("contact-email", emailLink.id) }}',
  },
  {
    key: 'key={link.id}',
    instance: 'createOpaqueUiInstanceId("contact-social", link.id)',
    childBefore: 'ui={{ uid: "profile.contact-info.additional-contact-view.input.2-H34dKX", id: "profile.contact-info.additional-contact-view.input.2" }}',
    childAfter: 'ui={{ uid: "profile.contact-info.additional-contact-view.input.2-H34dKX", id: "profile.contact-info.additional-contact-view.input.2", instance: createOpaqueUiInstanceId("contact-social", link.id) }}',
  },
  {
    key: 'key={site.id}',
    instance: 'createOpaqueUiInstanceId("contact-website", site.id)',
    childBefore: 'ui={{ uid: "profile.contact-info.additional-contact-view.input.3-h8RXDE", id: "profile.contact-info.additional-contact-view.input.3" }}',
    childAfter: 'ui={{ uid: "profile.contact-info.additional-contact-view.input.3-h8RXDE", id: "profile.contact-info.additional-contact-view.input.3", instance: createOpaqueUiInstanceId("contact-website", site.id) }}',
  },
];

for (const item of cases) {
  replaceExact(item.key, `${item.key}\n                        instance={${item.instance}}`);
  replaceExact(item.childBefore, item.childAfter);
}

console.log("Contact-entry runtime instances migrated.");
