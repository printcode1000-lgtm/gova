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
    const searchParams = new URL(request.url).searchParams;
    const id = searchParams.get('id');
    if (id) return apiSuccess(await productService.get(id));
    return apiSuccess(await productService.listByOwnerAndCategory(
      searchParams.get('uid') ?? '',
      searchParams.get('mainCategoryId') ?? '',
      searchParams.get('subcategoryId') ?? '',
    ));
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

export async function DELETE(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    await productService.delete(searchParams.get('id') ?? '', searchParams.get('uid') ?? '');
    return apiSuccess({ deleted: true });
  } catch (error) { return errorResponse(error); }
}
