import fs from "node:fs";

const file = "packages/storage-image-manager-core/src/components/StorageImageManager.tsx";
let source = fs.readFileSync(file, "utf8");

const uids = [
  "packages.storage-image-manager-core.storage-image-manager.div-ZoWO0X",
  "packages.storage-image-manager-core.storage-image-manager.img-XF8uIf",
  "packages.storage-image-manager-core.storage-image-manager.div.2-T7PTRJ",
  "packages.storage-image-manager-core.storage-image-manager.p-N3F9AJ",
  "packages.storage-image-manager-core.storage-image-manager.button-Xn9Pwm",
  "packages.storage-image-manager-core.storage-image-manager.div.3-LUq5Iv",
  "packages.storage-image-manager-core.storage-image-manager.span-kLC3n7",
  "packages.storage-image-manager-core.storage-image-manager.span.2-D4hFcL",
  "packages.storage-image-manager-core.storage-image-manager.button.2-V5uZ9I",
  "packages.storage-image-manager-core.storage-image-manager.input-MPqO1Y",
];

for (const uid of uids) {
  const uidNeedle = `uid: "${uid}"`;
  const uidIndex = source.indexOf(uidNeedle);
  if (uidIndex < 0) throw new Error(`Missing expected descriptor ${uid}`);
  const callStart = source.lastIndexOf("uiAttributes({", uidIndex);
  const callEnd = source.indexOf("})}", uidIndex);
  if (callStart < 0 || callEnd < 0) throw new Error(`Cannot locate uiAttributes call for ${uid}`);
  const current = source.slice(callStart, callEnd + 2);
  if (current.includes("instance:")) continue;
  const replacement = current.replace(/\s*}\)$/, ", instance: slotUiInstance })");
  if (replacement === current) throw new Error(`Could not append instance for ${uid}`);
  source = source.slice(0, callStart) + replacement + source.slice(callEnd + 2);
}

for (const uid of uids) {
  const uidIndex = source.indexOf(`uid: "${uid}"`);
  const callStart = source.lastIndexOf("uiAttributes({", uidIndex);
  const callEnd = source.indexOf("})}", uidIndex);
  const current = source.slice(callStart, callEnd + 2);
  if (!current.includes("instance: slotUiInstance")) {
    throw new Error(`Stage 121 failed to scope ${uid}`);
  }
}

fs.writeFileSync(file, source);
console.log(`Scoped ${uids.length} StorageImageSlot descriptors with slotUiInstance`);
