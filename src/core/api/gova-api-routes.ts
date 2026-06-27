/**
 * Canonical GOVA Business API routes.
 * Feature services reference these — never hardcode paths in UI or hooks.
 */
export const GOVA_API_ROUTES = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    profile: '/api/auth/profile',
  },
  profile: {
    contacts: '/api/profile/contacts',
  },
} as const;
