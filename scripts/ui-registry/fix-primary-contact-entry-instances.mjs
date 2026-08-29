import fs from 'node:fs';

const path = 'src/features/profile/presentation/contact-info/PrimaryContactView.tsx';
let source = fs.readFileSync(path, 'utf8');

function replaceOnce(from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, got ${count}`);
  source = source.replace(from, to);
}

replaceOnce(
  'import { uiAttributes } from "@asol/ui-registry-core";',
  'import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";',
  'ui registry import',
);

replaceOnce(
  '                      <ContactEntryCard\n                        key={phone.id}\n',
  '                      <ContactEntryCard\n                        key={phone.id}\n                        instance={createOpaqueUiInstanceId("profile-contact-phone", phone.id)}\n',
  'phone card instance',
);
replaceOnce(
  '<PhoneField ui={{ uid: "profile.contact-info.primary-contact-view.phone-field.2-0UyUJd", id: "profile.contact-info.primary-contact-view.phone-field.2" }}',
  '<PhoneField ui={{ uid: "profile.contact-info.primary-contact-view.phone-field.2-0UyUJd", id: "profile.contact-info.primary-contact-view.phone-field.2", instance: createOpaqueUiInstanceId("profile-contact-phone", phone.id) }}',
  'phone field instance',
);

replaceOnce(
  '                    <ContactEntryCard\n                      key={emailLink.id}\n',
  '                    <ContactEntryCard\n                      key={emailLink.id}\n                      instance={createOpaqueUiInstanceId("profile-contact-email", emailLink.id)}\n',
  'email card instance',
);
replaceOnce(
  '<Input ui={{ uid: "profile.contact-info.primary-contact-view.input-SRkyk5", id: "profile.contact-info.primary-contact-view.input" }}',
  '<Input ui={{ uid: "profile.contact-info.primary-contact-view.input-SRkyk5", id: "profile.contact-info.primary-contact-view.input", instance: createOpaqueUiInstanceId("profile-contact-email", emailLink.id) }}',
  'email field instance',
);

replaceOnce(
  '                          <ContactEntryCard\n                            key={link.id}\n',
  '                          <ContactEntryCard\n                            key={link.id}\n                            instance={createOpaqueUiInstanceId("profile-contact-social", link.id)}\n',
  'social card instance',
);
replaceOnce(
  '<Input ui={{ uid: "profile.contact-info.primary-contact-view.input.3-3MRiGl", id: "profile.contact-info.primary-contact-view.input.3" }}',
  '<Input ui={{ uid: "profile.contact-info.primary-contact-view.input.3-3MRiGl", id: "profile.contact-info.primary-contact-view.input.3", instance: createOpaqueUiInstanceId("profile-contact-social", link.id) }}',
  'social field instance',
);

replaceOnce(
  '                    <ContactEntryCard\n                      key={site.id}\n',
  '                    <ContactEntryCard\n                      key={site.id}\n                      instance={createOpaqueUiInstanceId("profile-contact-website", site.id)}\n',
  'website card instance',
);
replaceOnce(
  '<Input ui={{ uid: "profile.contact-info.primary-contact-view.input.4-n4YYrj", id: "profile.contact-info.primary-contact-view.input.4" }}',
  '<Input ui={{ uid: "profile.contact-info.primary-contact-view.input.4-n4YYrj", id: "profile.contact-info.primary-contact-view.input.4", instance: createOpaqueUiInstanceId("profile-contact-website", site.id) }}',
  'website field instance',
);

fs.writeFileSync(path, source);
console.log('Scoped all PrimaryContactView ContactEntryCard callers and repeated fields.');
