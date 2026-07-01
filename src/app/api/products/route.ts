import { apiError, apiSuccess } from '@/core/api/api-response';
import type { CreateProductInput, UpdateProductInput } from '@/features/product/entities/product.entity';
import { productService } from '@/features/product/services/product-service.server';

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  const status = message === 'productNotFound' ? 404 : message === 'productForbidden' ? 403 : message === 'invalidProduct' ? 400 : 500;
  return apiError(message, status);
}

export async function GET(request: Request) {
  try {
    return apiSuccess(await productService.get(new URL(request.url).searchParams.get('id') ?? ''));
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try { return apiSuccess(await productService.create(await request.json() as CreateProductInput), 201); }
  catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  try { return apiSuccess(await productService.update(await request.json() as UpdateProductInput)); }
  catch (error) { return errorResponse(error); }
}
