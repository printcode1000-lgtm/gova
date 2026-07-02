import "server-only";

import type { IDatabaseClient } from "./database-client.interface";
import { AdvertisementsSQLiteDatabaseClient } from "./advertisements-sqlite-db-client";

// Dedicated advertisements database. A Turso adapter can replace this selector in production.
export const advertisementsDbClient: IDatabaseClient =
  new AdvertisementsSQLiteDatabaseClient();
