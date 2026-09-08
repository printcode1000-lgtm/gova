export interface DevelopmentChunkFailureInput {
  developmentBuild: boolean;
  currentOrigin: string;
  resourceUrl?: string;
  message?: string;
  errorName?: string;
}

function isSameOriginNextChunk(url: string, currentOrigin: string): boolean {
  try {
    const parsed = new URL(url, `${currentOrigin}/`);
    return (
      parsed.origin === new URL(currentOrigin).origin &&
      /\/_next\/static\/chunks\//.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * `next dev` may invalidate browser chunk URLs while Turbopack recompiles or
 * the development server restarts. The browser console still shows the failed
 * request, but it is not a production/runtime system fault and must not be
 * persisted into central telemetry. Production, static and native builds never
 * receive this exemption.
 */
export function isExpectedDevelopmentChunkFailure(
  input: DevelopmentChunkFailureInput,
): boolean {
  if (!input.developmentBuild) return false;

  if (
    input.resourceUrl &&
    isSameOriginNextChunk(input.resourceUrl, input.currentOrigin)
  ) {
    return true;
  }

  const message = input.message ?? '';
  const chunkNamed = input.errorName === 'ChunkLoadError' || message.includes('ChunkLoadError');
  if (!chunkNamed || !message.includes('/_next/static/chunks/')) return false;

  const urlMatch = message.match(/(?:https?:\/\/[^\s'"]+)?\/_next\/static\/chunks\/[^\s'"]+/);
  if (!urlMatch) return false;
  return isSameOriginNextChunk(urlMatch[0], input.currentOrigin);
}
