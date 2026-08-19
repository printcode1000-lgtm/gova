/**
 * The only module in the project allowed to call fetch() directly.
 * All HTTP traffic (ASOL API, platform APIs, public assets) flows through here.
 */

export async function asolHttpFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, init);
}
