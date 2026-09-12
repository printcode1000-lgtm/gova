CREATE UNIQUE INDEX IF NOT EXISTS seller_discounts_coupon_unique_idx
  ON seller_discounts(seller_uid, coupon_code)
  WHERE coupon_code <> '';
