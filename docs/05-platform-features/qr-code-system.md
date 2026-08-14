# QR Code System

## Purpose

The shared QR Code module creates printable PNG QR codes for any project
feature. It currently replaces the profile/product share menu's copy-link
button, but it is not coupled to sharing or profile UI.

## Files

- `src/features/qr-code/types.ts` — public input and artifact contracts.
- `src/features/qr-code/qr-code-service.client.ts` — validates input, generates
  PNG bytes with `qrcode`, and delegates user-facing saving to Native Platform.
- `src/features/qr-code/index.ts` — public module surface.
- `src/features/qr-code/tests/qr-code-module.test.ts` — real PNG signature and
  filename-safety verification.

## API

```ts
const artifact = await createQrCodePng({
  value: publicUrl,
  fileName: "store-profile",
});

await saveQrCodePng({
  value: publicUrl,
  fileName: "store-profile",
});
```

The generator defaults to a 1024-pixel PNG, four-module quiet zone, and high
error correction for reliable printing. Values are limited to 4096 characters,
dimensions are bounded, and filenames are sanitized before crossing a platform
boundary.

## Platform behavior

The module never imports Capacitor directly. It calls
`nativePlatform.files.user.saveToDevice`:

- Web creates a user-initiated PNG download.
- Android and iOS stage the PNG in private cache and open the operating-system
  share/save sheet, without broad media or storage permission.

The QR value is processed locally. It is never sent to an external QR service.

## Dependency

`qrcode` is the only QR encoder. `@types/qrcode` supplies its TypeScript
contract. The project's ML Kit dependency scans barcodes and cannot generate
them, so it is not used by this module.
