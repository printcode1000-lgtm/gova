'use client';

import { Check } from 'lucide-react';

import { useTranslation } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
}

const REQUIREMENT_KEYS = [
  { key: 'auth.password.minLength', test: (pwd: string) => pwd.length >= 4 },
  {
    key: 'auth.password.hasLetters',
    test: (pwd: string) => /[a-z]/i.test(pwd) || /[\u0600-\u06FF]/.test(pwd),
  },
  { key: 'auth.password.hasNumbers', test: (pwd: string) => /[0-9]/.test(pwd) },
  { key: 'auth.password.hasSymbols', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
] as const;

const STRENGTH_KEYS = [
  'auth.password.weak',
  'auth.password.medium',
  'auth.password.good',
  'auth.password.strong',
] as const satisfies readonly TranslationKey[];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useTranslation();
  const passed = REQUIREMENT_KEYS.map((req) => req.test(password));
  const strength = passed.filter(Boolean).length;
  const strengthLabel = t(STRENGTH_KEYS[Math.max(0, strength - 1)] ?? 'auth.password.weak');
  const barColor =
    strength <= 1 ? 'bg-error' : strength === 2 ? 'bg-warning' : strength === 3 ? 'bg-primary' : 'bg-success';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-on-surface-variant">{t('auth.password.strength')}</span>
        <span className="text-xs font-medium text-on-surface">{strengthLabel}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={cn('h-1.5 flex-1 rounded-full', i < strength ? barColor : 'bg-surface-variant')}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {REQUIREMENT_KEYS.map((req, i) => (
          <li
            key={req.key}
            className={cn(
              'flex items-center gap-1.5 text-xs',
              passed[i] ? 'text-success' : 'text-on-surface-variant',
            )}
          >
            <Check className={cn('h-3.5 w-3.5', passed[i] ? 'opacity-100' : 'opacity-40')} />
            {t(req.key)}
          </li>
        ))}
      </ul>
    </div>
  );
}
