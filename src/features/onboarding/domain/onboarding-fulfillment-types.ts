export type ShippingProvider = 'standard' | 'express' | 'same_day' | 'pickup' | 'international';

export interface ShippingMethod {
  id: string;
  provider: ShippingProvider;
  name: string;
  deliveryDays: { min: number; max: number };
  fee: number;
  freeThreshold: number | null;
  isActive: boolean;
}

export interface ShippingInfo {
  methods: ShippingMethod[];
  defaultMethod: string;
  pickupAvailable: boolean;
  pickupAddress: string;
}

export type ReturnPolicyType = 'no_returns' | 'exchange_only' | 'full_returns' | 'store_credit';

export interface ReturnPolicy {
  policyType: ReturnPolicyType;
  returnPeriod: number;
  exchangePeriod: number;
  policyDescription: string;
  conditions: string[];
  refundMethod: 'original' | 'store_credit' | 'choice';
}
