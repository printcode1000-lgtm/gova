import {
  POST as createProduct,
  PUT as updateProduct,
  DELETE as deleteProduct,
} from '@/app/api/products/route';
import { preflight, withCors } from '../../lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request): Promise<Response> {
  return withCors(request, await createProduct(request));
}

export async function PUT(request: Request): Promise<Response> {
  return withCors(request, await updateProduct(request));
}

export async function DELETE(request: Request): Promise<Response> {
  return withCors(request, await deleteProduct(request));
}

export function OPTIONS(request: Request): Response {
  return preflight(request);
}
