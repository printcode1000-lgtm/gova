import {
  PHARMACY_FIXED_PRODUCT_PREFIX,
  type PharmacyFixedProductIdentity,
} from "../entities/pharmacy-profile-catalog.types";

export function encodePharmacyFixedProductId(
  uid: string,
  fixedProductId: number,
): string {
  return `${PHARMACY_FIXED_PRODUCT_PREFIX}-${Buffer.from(uid, "utf8").toString("base64url")}-${fixedProductId}`;
}

export function parsePharmacyFixedProductId(
  id: string,
): PharmacyFixedProductIdentity | null {
  const prefix = `${PHARMACY_FIXED_PRODUCT_PREFIX}-`;
  if (!id.startsWith(prefix)) return null;
  const rest = id.slice(prefix.length);
  const lastDash = rest.lastIndexOf("-");
  if (lastDash <= 0) return null;
  const uidToken = rest.slice(0, lastDash);
  const fixedProductId = Number(rest.slice(lastDash + 1));
  if (!Number.isInteger(fixedProductId) || fixedProductId <= 0) return null;
  try {
    return {
      uid: Buffer.from(uidToken, "base64url").toString("utf8"),
      fixedProductId,
    };
  } catch {
    return null;
  }
}

export function isPharmacyFixedProductId(id: string): boolean {
  return parsePharmacyFixedProductId(id) !== null;
}
