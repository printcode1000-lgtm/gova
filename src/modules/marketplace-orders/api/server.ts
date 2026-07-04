import "server-only";
import { createMarketplaceOrdersDb } from "../db/client";
import { MarketplaceOrderService } from "../services/marketplace-order-service";
let service:MarketplaceOrderService|undefined;
export function createTransactionalMarketplaceOrderService(db=createMarketplaceOrdersDb()):MarketplaceOrderService { const base=new MarketplaceOrderService(db);return new Proxy(base,{get(target,property){const value=(target as any)[property];if(typeof value!=="function")return value;return (...args:unknown[])=>db.transaction(async tx=>{const scoped=new MarketplaceOrderService(tx) as any;return scoped[property](...args)})}}) }
export function getMarketplaceOrderService(){return service??=createTransactionalMarketplaceOrderService()}
