import { controlPreflight } from '@/control/operational-route';
import { assertControlSystemLogAccess, persistentSystemLogService, systemLogError } from '@/control/system-logs';

function options(params: URLSearchParams) {
  const origin = params.get('origin'); const level = params.get('level'); const platform = params.get('platform');
  return {
    limit: Number(params.get('limit') ?? 300), cursor: params.get('cursor') ?? undefined, query: params.get('query') ?? undefined,
    since: params.get('since') ?? undefined, until: params.get('until') ?? undefined, appVersion: params.get('appVersion') ?? undefined, nativeVersion: params.get('nativeVersion') ?? undefined,
    ...(origin === 'client' || origin === 'cloud' ? { origin } : {}),
    ...(level === 'normal' || level === 'warning' || level === 'error' ? { level } : {}),
    ...(platform === 'web' || platform === 'android' || platform === 'ios' || platform === 'server' ? { platform } : {}),
    ...(params.get('feature') ? { feature: params.get('feature')! } : {}),
  };
}

export async function GET(request: Request): Promise<Response> {
  try { assertControlSystemLogAccess(request); return Response.json(await persistentSystemLogService.list(options(new URL(request.url).searchParams))); }
  catch (error) { return systemLogError(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    assertControlSystemLogAccess(request);
    const level = new URL(request.url).searchParams.get('level');
    if (level && level !== 'normal' && level !== 'warning' && level !== 'error') return Response.json({ error: 'invalidSystemLogLevel' }, { status: 400 });
    await persistentSystemLogService.clear(level ?? undefined); return Response.json({ ok: true });
  } catch (error) { return systemLogError(error); }
}

export function OPTIONS(request: Request): Response {
  return controlPreflight(request);
}
