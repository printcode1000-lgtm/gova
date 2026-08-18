import { publicEnv } from '@/core/config/public-env';

export interface MobilePushCredentialBundle {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface RecipientTokenRecord {
  id: string;
  uid: string;
  platform: 'android' | 'ios' | 'web';
  provider: string;
  token: string;
  locale: 'ar' | 'en';
}

export interface RecipientTokenGrantPayload {
  send: {
    uids: string[];
    dedupeKey: string;
    templateId?: string;
    title?: string;
    body?: string;
    locale?: 'ar' | 'en';
    variables?: Record<string, string | number | boolean | null>;
    variablesByLocale?: Partial<
      Record<'ar' | 'en', Record<string, string | number | boolean | null>>
    >;
    route?: { href: string; label?: string };
    routeByLocale?: Partial<Record<'ar' | 'en', { href: string; label?: string }>>;
    metadata?: Record<string, string | number | boolean | null>;
    priority?: string;
    sound?: string;
    category?: string;
  };
  recipients: Array<{
    uid: string;
    status: 'muted' | 'no_tokens' | 'ready';
    tokens: RecipientTokenRecord[];
  }>;
}

export interface RecipientTokensApiResponse {
  grants: RecipientTokenGrantPayload[];
}

export function resolveMainApiBaseUrl(): string {
  if (publicEnv.apiBaseUrl) return publicEnv.apiBaseUrl.replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${publicEnv.basePath}`.replace(/\/$/, '');
  }
  return '';
}
