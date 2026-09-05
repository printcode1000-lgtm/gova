import { jsonContractResponse } from '@asol/api-contract-core/server';

export function GET() {
  return jsonContractResponse({ status: 'ok' as const });
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}
