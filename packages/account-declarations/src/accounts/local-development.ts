/**
 * Where each runtime listens during local development.
 *
 * Local development mirrors the production topology exactly: eight processes on
 * eight origins, and the client bridge resolves an owner's origin here the same
 * way it resolves a public one in production. The alternative — one process with
 * a fallback for everything unowned — is what let routing bugs survive until
 * deployment, because the case that broke was the one development never ran.
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
 * The public-origin environment gova's client bridge reads.
 *
 * gova is the only runtime that needs these: it is where the browser loads the
 * application from, and every business call it makes is addressed to an owner.
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
