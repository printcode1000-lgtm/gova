import type { OperationType } from '@/core/monitor/types';

export const AUTH_FEATURE = 'auth';

export function authMonitorMeta(
  hook: string,
  component: string,
  queryOrCommand: string,
  operationType: OperationType
) {
  return {
    feature: AUTH_FEATURE,
    page: typeof window !== 'undefined' ? window.location.pathname : '',
    component,
    hook,
    service: 'AuthApiService',
    repository: 'UserRepository',
    table: 'users',
    entity: 'User',
    queryOrCommand,
    operationType,
  };
}
