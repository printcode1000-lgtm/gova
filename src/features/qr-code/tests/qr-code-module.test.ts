import assert from "node:assert/strict";

import { createQrCodePng } from "../application/qr-code-service.client";

async function main() {
  const artifact = await createQrCodePng({
    value: "https://example.com/s/profile?uid=test",
    fileName: "متجر تجريبي / profile.png",
    width: 320,
  });
  assert.equal(artifact.mimeType, "image/png");
  assert.equal(artifact.fileName.endsWith(".png"), true);
  assert.equal(artifact.fileName.includes("/"), false);
  const signature = new Uint8Array(await artifact.blob.arrayBuffer()).slice(0, 8);
  assert.deepEqual([...signature], [137, 80, 78, 71, 13, 10, 26, 10]);
  console.log("QR code module tests passed.");
}

void main();
