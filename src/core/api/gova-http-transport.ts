/**
 * The only module in the project allowed to call fetch() directly.
 * All HTTP traffic (GOVA API, platform APIs, public assets) flows through here.
 */

export async function govaHttpFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, init);
}
