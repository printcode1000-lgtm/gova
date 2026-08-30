'use client';

import { Check } from 'lucide-react';

import { useTranslation } from '@/shared/i18n';
import type { TranslationKey } from '@/shared/i18n';
import { cn } from '@/shared/utils';
import { uiAttributes , createUiPositionInstanceId, createOpaqueUiInstanceId} from "@asol/ui-registry-core";

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
    <div {...uiAttributes({ uid: "auth.password-strength.div.4-7T0RIU", id: "auth.password-strength.div.4" })} id="auth.password-strength.div" className="space-y-2">
      <div {...uiAttributes({ uid: "auth.password-strength.div.5-F1RbB4", id: "auth.password-strength.div.5" })} id="auth.password-strength.div.2" className="flex items-center justify-between">
        <span {...uiAttributes({ uid: "auth.password-strength.span.3-zAV2C8", id: "auth.password-strength.span.3" })} id="auth.password-strength.span" className="text-xs text-on-surface-variant">{t('auth.password.strength')}</span>
        <span {...uiAttributes({ uid: "auth.password-strength.span.4-MwlSo4", id: "auth.password-strength.span.4" })} id="auth.password-strength.span.2" className="text-xs font-medium text-on-surface">{strengthLabel}</span>
      </div>
      <div {...uiAttributes({ uid: "auth.password-strength.div.6-Y0O332", id: "auth.password-strength.div.6" })} id="auth.password-strength.div.3" className="flex gap-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i} {...uiAttributes({ uid: "auth.password-strength.div.7-5K4AId", id: "auth.password-strength.div.7" , instance: createUiPositionInstanceId("iter-e04432813d", i)})}
            className={cn('h-1.5 flex-1 rounded-full', i < strength ? barColor : 'bg-surface-variant')}
          />
        ))}
      </div>
      <ul {...uiAttributes({ uid: "auth.password-strength.ul.2-u7RmN7", id: "auth.password-strength.ul.2" })} id="auth.password-strength.ul" className="space-y-1">
        {REQUIREMENT_KEYS.map((req, i) => (
          <li
            key={req.key} {...uiAttributes({ uid: "auth.password-strength.li-n1PzaL", id: "auth.password-strength.li" , instance: createOpaqueUiInstanceId("iter-f9b1b4b66b", String(req.key))})}
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
