# `@asol/native-core`

Sealed package consolidating **ALL** native, device, and Capacitor-coupled code for the ASOL application.

## Ownership and Architecture Rules

1. **Strict Sealing**: This package is the sole boundary touching `@capacitor/*`, `@capawesome/*`, `@capgo/*`, `@capacitor-mlkit/*`, Android Java native code, and iOS Swift native code.
2. **Single Public Entrypoint**: Consumers may only import from `@asol/native-core` (`src/index.ts`). Deep imports (`@asol/native-core/*`) are forbidden and rejected at compile and lint time.
3. **Zero Capacitor Type Leakage**: All public APIs use domain-level DTOs and return a uniform `Result<T, NativeCoreError>` type or throw `NativeCoreError`.
4. **Single Responsibility Principle (SRP)**: Each file has exactly one concern. `domain/` contains pure logic, `validation/` contains input/output guards, and `adapters/` interacts with plugins.
5. **Runtime Invariants**:
   - Android notification channels are registered in native `onCreate` prior to WebView bootstrap (`AsolNotificationChannels.ensureCreated`).
   - Channel IDs (`asol_*_v4`) and custom sound naming (`custom_notification`) are frozen.
