/**
 * Every logical Turso database this repository owns, and the desired schema of each.
 *
 * There are exactly twenty-one: the four standalone databases and the seventeen
 * shards. `NON_SHARD_DATABASE_LABELS` plus `DATABASE_SHARD_NAMES` is checked
 * against the keys below at module load, so adding a shard without writing its
 * manifest fails mechanically instead of silently provisioning nothing — the
 * failure mode that made a missing table a production discovery.
 *
 * Loading a manifest opens no file and starts no database engine. That is the
 * point of the manifests existing at all: release-time schema is calculable from
 * source, so a build can validate it with no cloud credentials and no `.db` file.
 */
import { DATABASE_SHARD_NAMES, type DatabaseShardName } from '../../core/database/database-shards';
import type { DatabaseSchema } from '../core/types';
import { usersDesiredSchema } from './users';
import { productDesiredSchema } from './product';
import { advertisementsDesiredSchema } from './advertisements';
import { notificationsDesiredSchema } from './notifications';
import { profileCoreDesiredSchema } from './profile-core';
import { profileContactDesiredSchema } from './profile-contact';
import { profileMediaDesiredSchema } from './profile-media';
import { profileSocialDesiredSchema } from './profile-social';
import { profileCatalogDesiredSchema } from './profile-catalog';
import { profilePromotionsDesiredSchema } from './profile-promotions';
import { profileFulfillmentDesiredSchema } from './profile-fulfillment';
import { systemOpsDesiredSchema } from './system-ops';
import { ordersCoreDesiredSchema } from './orders-core';
import { ordersItemsDesiredSchema } from './orders-items';
import { ordersFulfillmentDesiredSchema } from './orders-fulfillment';
import { ordersDeliveryPlansDesiredSchema } from './orders-delivery-plans';
import { ordersShippingQuotesDesiredSchema } from './orders-shipping-quotes';
import { ordersPaymentsDesiredSchema } from './orders-payments';
import { ordersRefundsDesiredSchema } from './orders-refunds';
import { ordersAfterSalesDesiredSchema } from './orders-after-sales';
import { ordersDisputesAuditDesiredSchema } from './orders-disputes-audit';

/** The four databases that are not profile/order shards. */
export const NON_SHARD_DATABASE_LABELS = [
  'users',
  'product',
  'advertisements',
  'notifications',
] as const;

export type NonShardDatabaseLabel = (typeof NON_SHARD_DATABASE_LABELS)[number];

export type LogicalDatabaseLabel = NonShardDatabaseLabel | DatabaseShardName;

export const DESIRED_SCHEMAS: Record<LogicalDatabaseLabel, DatabaseSchema> = {
  'users': usersDesiredSchema,
  'product': productDesiredSchema,
  'advertisements': advertisementsDesiredSchema,
  'notifications': notificationsDesiredSchema,
  'profile-core': profileCoreDesiredSchema,
  'profile-contact': profileContactDesiredSchema,
  'profile-media': profileMediaDesiredSchema,
  'profile-social': profileSocialDesiredSchema,
  'profile-catalog': profileCatalogDesiredSchema,
  'profile-promotions': profilePromotionsDesiredSchema,
  'profile-fulfillment': profileFulfillmentDesiredSchema,
  'system-ops': systemOpsDesiredSchema,
  'orders-core': ordersCoreDesiredSchema,
  'orders-items': ordersItemsDesiredSchema,
  'orders-fulfillment': ordersFulfillmentDesiredSchema,
  'orders-delivery-plans': ordersDeliveryPlansDesiredSchema,
  'orders-shipping-quotes': ordersShippingQuotesDesiredSchema,
  'orders-payments': ordersPaymentsDesiredSchema,
  'orders-refunds': ordersRefundsDesiredSchema,
  'orders-after-sales': ordersAfterSalesDesiredSchema,
  'orders-disputes-audit': ordersDisputesAuditDesiredSchema,
};

export const LOGICAL_DATABASE_LABELS = Object.keys(DESIRED_SCHEMAS) as LogicalDatabaseLabel[];

/**
 * Shard coverage is verified here rather than in a test.
 *
 * A test proves the tree was correct when it ran; this refuses to load a build in
 * which a declared shard has no schema to provision, which is the only moment the
 * mistake is still cheap.
 */
{
  const declared = new Set<string>(LOGICAL_DATABASE_LABELS);
  const missing = [...NON_SHARD_DATABASE_LABELS, ...DATABASE_SHARD_NAMES].filter(
    (label) => !declared.has(label),
  );
  if (missing.length > 0) {
    throw new Error(
      `Desired-schema manifest missing for logical database(s): ${missing.join(', ')}`,
    );
  }
  const expected = new Set<string>([...NON_SHARD_DATABASE_LABELS, ...DATABASE_SHARD_NAMES]);
  const unexpected = LOGICAL_DATABASE_LABELS.filter((label) => !expected.has(label));
  if (unexpected.length > 0) {
    throw new Error(
      `Desired-schema manifest declares unknown logical database(s): ${unexpected.join(', ')}`,
    );
  }
}

export function isLogicalDatabaseLabel(value: string): value is LogicalDatabaseLabel {
  return Object.prototype.hasOwnProperty.call(DESIRED_SCHEMAS, value);
}

/** The desired schema for one logical database. Throws on an unknown label. */
export function readDesiredSchema(databaseLabel: string): DatabaseSchema {
  if (!isLogicalDatabaseLabel(databaseLabel)) {
    throw new Error(
      `No desired-schema manifest for database "${databaseLabel}". ` +
        `Known databases: ${LOGICAL_DATABASE_LABELS.join(', ')}.`,
    );
  }
  return DESIRED_SCHEMAS[databaseLabel];
}

/** Every table the manifests declare, mapped to the one database that owns it. */
export function desiredTableOwnership(): Map<string, LogicalDatabaseLabel> {
  const owners = new Map<string, LogicalDatabaseLabel>();
  for (const label of LOGICAL_DATABASE_LABELS) {
    for (const tableName of Object.keys(DESIRED_SCHEMAS[label].tables)) {
      const existing = owners.get(tableName);
      if (existing && existing !== label) {
        throw new Error(
          `Table "${tableName}" is declared by both "${existing}" and "${label}".`,
        );
      }
      owners.set(tableName, label);
    }
  }
  return owners;
}
