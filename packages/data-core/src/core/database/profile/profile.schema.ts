/** Neutral Turso row shapes. Runtime persistence uses parameterized libSQL statements; no ORM schema is loaded. */
export interface UserProfileRow {
}
export interface ProfileContactPointRow {
  id: string;
  uid: string | null;
  type: string;
  platform: string;
  label: string;
  value: string;
  normalizedValue: string;
  isPrimary: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
export interface ProfileLocationRow {
  id: string;
  uid: string | null;
  label: string;
  address: string;
  governorate: string;
  city: string;
  area: string;
  latitude: string;
  longitude: string;
  isPrimary: boolean;
  isPublic: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
export interface ProfileImageRow {
  id: string;
  uid: string | null;
  imageKey: string;
  imageType: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
export interface ProfileDeliveryCarrierRow {
  sellerUid: string;
  carrierUid: string;
  isDefault: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}
export interface ProfileTrendingItemRow {
  id: string;
  uid: string | null;
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
export interface ProfileWorkingHourRow {
  id: string;
  uid: string | null;
  dayOfWeek: number;
  periodIndex: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
export interface SellerDiscountRow {
  id: string;
  sellerUid: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: number;
  combinable: boolean | null;
  startsAt: string;
  endsAt: string;
  couponCode: string;
  valueType: string;
  value: number;
  maxDiscountMinor: number;
  minSubtotalMinor: number;
  minQuantity: number;
  buyQuantity: number;
  getQuantity: number;
  usageLimitTotal: number;
  usageLimitPerBuyer: number;
  firstOrderOnly: boolean | null;
  followersOnly: boolean | null;
  appOnly: boolean;
  productIdsJson: string;
  categoryIdsJson: string;
  excludedProductIdsJson: string;
  bundleProductIdsJson: string;
  giftProductId: string;
  metadataJson: string;
  createdAt: string;
  updatedAt: string;
}
