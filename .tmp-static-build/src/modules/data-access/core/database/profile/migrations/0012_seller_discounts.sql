CREATE TABLE IF NOT EXISTS seller_discounts (
  id text PRIMARY KEY NOT NULL,
  seller_uid text NOT NULL REFERENCES user_profiles(uid) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  priority integer NOT NULL DEFAULT 100,
  combinable integer NOT NULL DEFAULT 0,
  starts_at text NOT NULL DEFAULT '',
  ends_at text NOT NULL DEFAULT '',
  coupon_code text NOT NULL DEFAULT '',
  value_type text NOT NULL DEFAULT 'percentage',
  value integer NOT NULL DEFAULT 0,
  max_discount_minor integer NOT NULL DEFAULT 0,
  min_subtotal_minor integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  buy_quantity integer NOT NULL DEFAULT 0,
  get_quantity integer NOT NULL DEFAULT 0,
  usage_limit_total integer NOT NULL DEFAULT 0,
  usage_limit_per_buyer integer NOT NULL DEFAULT 0,
  first_order_only integer NOT NULL DEFAULT 0,
  followers_only integer NOT NULL DEFAULT 0,
  app_only integer NOT NULL DEFAULT 0,
  product_ids_json text NOT NULL DEFAULT '[]',
  category_ids_json text NOT NULL DEFAULT '[]',
  excluded_product_ids_json text NOT NULL DEFAULT '[]',
  bundle_product_ids_json text NOT NULL DEFAULT '[]',
  gift_product_id text NOT NULL DEFAULT '',
  metadata_json text NOT NULL DEFAULT '{}',
  created_at text NOT NULL,
  updated_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS seller_discounts_seller_status_idx
  ON seller_discounts(seller_uid, status);

CREATE INDEX IF NOT EXISTS seller_discounts_coupon_idx
  ON seller_discounts(seller_uid, coupon_code);

CREATE TABLE IF NOT EXISTS seller_discount_usages (
  id text PRIMARY KEY NOT NULL,
  discount_id text NOT NULL REFERENCES seller_discounts(id) ON DELETE CASCADE,
  seller_uid text NOT NULL,
  buyer_uid text NOT NULL DEFAULT '',
  order_id text NOT NULL DEFAULT '',
  discount_minor integer NOT NULL DEFAULT 0,
  created_at text NOT NULL
);

CREATE INDEX IF NOT EXISTS seller_discount_usages_discount_idx
  ON seller_discount_usages(discount_id);

CREATE INDEX IF NOT EXISTS seller_discount_usages_buyer_idx
  ON seller_discount_usages(discount_id, buyer_uid);
