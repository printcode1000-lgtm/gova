import type { Actor } from "../domain/types";
export function canViewOrder(actor:Actor, order:{buyer_id:string}){return actor.role==="admin"||(actor.role==="buyer"&&actor.id===order.buyer_id)}
export function canManageSellerOrder(actor:Actor,row:{seller_id:string;service_provider_id?:string|null}){return actor.role==="admin"||(actor.role==="seller"&&actor.id===row.seller_id)||(actor.role==="service_provider"&&actor.id===row.service_provider_id)}
export function canManageShipment(actor:Actor,row:{carrier_id?:string|null}){return actor.role==="admin"||(actor.role==="carrier"&&actor.id===row.carrier_id)}
export function assertPermission(value:boolean){if(!value)throw new Error("Forbidden")}
