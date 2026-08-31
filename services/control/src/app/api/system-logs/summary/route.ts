import { assertControlSystemLogAccess, persistentSystemLogService, systemLogError } from '@/control/system-logs';
export async function GET(request: Request): Promise<Response> { try { assertControlSystemLogAccess(request); return Response.json(await persistentSystemLogService.summary()); } catch (error) { return systemLogError(error); } }
export async function OPTIONS() { return new Response(null, { status: 204 }); }
