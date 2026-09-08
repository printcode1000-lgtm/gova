/**
 * Where each runtime listens under the explicit service-development harness.
 *
 * This is `dev:distributed` and nothing else: the eight-process topology a
 * developer starts when the change under test is in a *service's own* code and
 * has to be exercised before it is deployed.
 *
 * It is not how ordinary `npm run dev` reaches application data. That addresses
 * the deployed accounts by canonical declaration, exactly as Static, Android and
 * iOS do, so the transport a developer exercises is the transport a user gets.
 * These localhost origins are therefore an opt-in override a developer types,
 * never a fallback anything reaches for on its own — and every runtime started
 * here is Turso/R2-only like any other, so "local ports" describes the process
 * addresses and never a local data backend.
 *
 * Pure data. Nothing in this file may import anything.
 */
export const LOCAL_DEVELOPMENT_PORTS = {
  gova: 3001,
  control: 3002,
  notifications: 3003,
  products: 3004,
  orders: 3005,
  profiles: 3006,
  submain: 3007,
  sub2main: 3008,
} as const;

export type LocalDevelopmentAccount = keyof typeof LOCAL_DEVELOPMENT_PORTS;

export const LOCAL_DEVELOPMENT_ACCOUNTS = Object.keys(
  LOCAL_DEVELOPMENT_PORTS,
) as LocalDevelopmentAccount[];

export function localDevelopmentOrigin(account: LocalDevelopmentAccount): string {
  return `http://127.0.0.1:${LOCAL_DEVELOPMENT_PORTS[account]}`;
}

/**
 * The public-origin environment gova's client bridge reads under the harness.
 *
 * gova is the only runtime that needs these: it is where the browser loads the
 * application from, and every business call it makes is addressed to an owner.
 *
 * Only `dev:distributed` sets them. Ordinary Development leaves them unset and
 * resolves the canonical deployed origins instead.
 */
export function localDevelopmentPublicEnv(): Record<string, string> {
  return {
    NEXT_PUBLIC_ASOL_CONTROL_URL: localDevelopmentOrigin('control'),
    NEXT_PUBLIC_ASOL_NOTIFICATIONS_URL: localDevelopmentOrigin('notifications'),
    NEXT_PUBLIC_ASOL_PRODUCTS_URL: localDevelopmentOrigin('products'),
    NEXT_PUBLIC_ASOL_ORDERS_URL: localDevelopmentOrigin('orders'),
    NEXT_PUBLIC_ASOL_PROFILES_URL: localDevelopmentOrigin('profiles'),
    NEXT_PUBLIC_ASOL_SUBMAIN_URL: localDevelopmentOrigin('submain'),
    NEXT_PUBLIC_ASOL_SUB2MAIN_URL: localDevelopmentOrigin('sub2main'),
  };
}
