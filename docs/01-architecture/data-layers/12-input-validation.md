# Input Validation

Validation runs **before** data crosses layer boundaries where it matters most.

## Client (Hook layer)

- React Hook Form + Zod schemas in hooks
- Blocks invalid payloads before any `asolApi` call

## Schema-derived validation

Drizzle table definitions live inside `@asol/data-core`'s sealed `core/`
internals. No package door exports them, so a schema cannot be derived from a
table outside the package — `drizzle-zod` is not used anywhere in the
repository today.

Write the Zod schema explicitly next to the layer that validates, and let
`typecheck` catch drift against the repository's entity types:

```typescript
const credentialsSchema = z
  .object({
    phone: createPhoneField(t),
    password: z.string().min(4, t('auth.validation.passwordMinLength')),
    confirmPassword: z.string().min(1),
    phoneVerified: z.boolean().refine((val) => val === true),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'] });
```

If schema-derived validation is ever needed, add a narrow door that exports the
one table it needs — never reopen a door onto the whole schema. See
`docs/01-architecture/module-isolation-rules.md`.

## Server

- Server Service and Commands enforce domain rules (e.g. duplicate phone, password hash)
- Business API returns known error codes via `mapServiceError()`
- Expected rejections (wrong password, duplicate identity, etc.) return `400` with a
  known code but are **not** persisted to system logs — see
  `src/core/api/expected-business-error-codes.ts` and
  [super-admin-live-logs.md](../../06-super-admin-and-operations/super-admin-live-logs.md)

## Rule

**UI validates UX** — **server validates truth**. Never trust client-only validation for security.
