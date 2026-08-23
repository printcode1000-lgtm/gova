# Native Core (`@asol/native-core`)

`packages/native-core` (`@asol/native-core`) is the **only** bridge between ASOL application code and native device capabilities.

See the complete architecture and maintenance guide:
👉 [Native Core Module Architecture](../../07-mobile-and-release/capacitor/native-core-module.md)

---

## 1. Quick Reference

Pages, components, hooks, and feature services import directly from `@asol/native-core`:

```typescript
import { NativeCore, nativePlatform, clipboard, share, camera } from '@asol/native-core';
```

The **Native Core Contract** check in `npm run architecture:check` and ESLint reject:

| Forbidden                                | Use instead                                  |
| ---------------------------------------- | -------------------------------------------- |
| `@capacitor/*` imports                   | `NativeCore` methods from `@asol/native-core`|
| `navigator.share` / `navigator.canShare` | `NativeCore.share`                           |
| `navigator.geolocation`                  | `NativeCore.getCurrentPosition`              |
| `navigator.clipboard`                    | `NativeCore.readClipboard` / `writeClipboard`|
| `Notification.requestPermission`         | `NativeCore.requestPermissionIfNeeded`       |

---

## 2. Package Architecture

```
packages/native-core/
├── package.json                 # sealed exports ("." only)
├── tsconfig.json
├── android/                     # native Android library module
├── ios/                         # native iOS Swift package
├── scripts/                     # native-facing scripts
└── src/
    ├── index.ts                 # public entrypoint & facades
    ├── api/                     # public API surface
    ├── capabilities/            # capability registry
    ├── domain/                  # pure domain logic & contracts
    ├── adapters/                # isolated Capacitor plugin bridges
    ├── errors/                  # NativeCoreError definitions
    └── validation/              # Zod schemas & input validation
```

---

## 3. Dependency Upgrade Playbook

To upgrade `@capacitor/*` or any native plugin:
1. Update `packages/native-core/package.json`.
2. Run `npm install` at repo root.
3. Update only the relevant adapter in `packages/native-core/src/adapters/`.
4. Run `npm run verify:all`.
