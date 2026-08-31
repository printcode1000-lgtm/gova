export function GET() {
  return Response.json({ status: 'ok' as const });
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
}
