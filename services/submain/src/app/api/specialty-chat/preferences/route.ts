import { assertSubmainEnv, createSubmainRuntime } from '@asol/submain-composition';
import type {
  SpecialtyChatIdentity,
  SpecialtyChatPreferenceChanges,
} from '@/features/specialty-chat/domain/types';

import { businessErrorResponse, corsHeaders, preflight } from '../../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Only the two booleans are accepted, and only when they are booleans.
 *
 * The same narrowing as the application: an unknown key or a non-boolean is
 * dropped rather than refused, so a newer client cannot fail an older server by
 * sending a field it does not know yet.
 */
function preferenceChanges(value: unknown): SpecialtyChatPreferenceChanges {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  return {
    ...(typeof input.specialtyRequestsEnabled === 'boolean'
      ? { specialtyRequestsEnabled: input.specialtyRequestsEnabled }
      : {}),
    ...(typeof input.productConversationsEnabled === 'boolean'
      ? { productConversationsEnabled: input.productConversationsEnabled }
      : {}),
  };
}

/** Absent `changes` reads the preferences; present `changes` writes them. */
export async function POST(request: Request): Promise<Response> {
  try {
    const { messaging } = createSubmainRuntime();
    assertSubmainEnv();

    const body = (await request.json()) as {
      identity: SpecialtyChatIdentity;
      changes?: unknown;
    };
    const result =
      body.changes === undefined
        ? await messaging.specialtyChat.getPreferences(body.identity)
        : await messaging.specialtyChat.setPreferences(
            body.identity,
            preferenceChanges(body.changes),
          );
    return Response.json(result, { status: 200, headers: corsHeaders(request) });
  } catch (error) {
    return businessErrorResponse(request, error);
  }
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
