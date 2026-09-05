import type { Actor } from "../domain/types";
export function canViewOrder(actor:Actor, order:{buyerId:string}){return actor.role==="admin"||(actor.role==="buyer"&&actor.id===order.buyerId)}
export function canManageSellerOrder(actor:Actor,row:{sellerId:string;serviceProviderId?:string|null}){return actor.role==="admin"||(actor.role==="seller"&&actor.id===row.sellerId)||(actor.role==="service_provider"&&actor.id===row.serviceProviderId)}
export function canManageShipment(actor:Actor,row:{carrierId?:string|null}){return actor.role==="admin"||(actor.role==="carrier"&&actor.id===row.carrierId)}
export function assertPermission(value:boolean){if(!value)throw new Error("Forbidden")}
