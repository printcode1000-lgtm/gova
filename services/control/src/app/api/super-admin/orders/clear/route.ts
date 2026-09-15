import { deleteAllMarketplaceOrders } from '@asol/data-core/marketplace-orders';
import { runControlSuperAdminRoute } from '@/control/super-admin-route';

export async function DELETE(request: Request) {
  return runControlSuperAdminRoute(request, async () => {
    await deleteAllMarketplaceOrders();
    return { ok: true };
  });
}
