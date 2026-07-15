# Input Validation

Validation runs **before** data crosses layer boundaries where it matters most.

## Client (Hook layer)

- React Hook Form + Zod schemas in hooks
- Blocks invalid payloads before any `asolApi` call

## drizzle-zod

Generate Zod from Drizzle table definitions:

```typescript
import { createInsertSchema } from 'drizzle-zod';
import { users } from '@/core/database/schema';

const baseSchema = createInsertSchema(users, {
  phone: createPhoneField(t),
  password: z.string().min(4, t('auth.validation.passwordMinLength')),
});

return baseSchema.pick({ phone: true, password: true, email: true }).extend({
  confirmPassword: z.string().min(1),
  phoneVerified: z.boolean().refine((val) => val === true),
}).refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'] });
```

## Server

- Server Service and Commands enforce domain rules (e.g. duplicate phone, password hash)
- Business API returns known error codes via `mapServiceError()`

## Rule

**UI validates UX** — **server validates truth**. Never trust client-only validation for security.
