import { StorageInventoryPart2 } from "./storage-inventory-repository-parts/storage-inventory.repository.part-02";

export type {
  StorageInventory,
  StorageReference,
} from "./storage-inventory-repository-parts/storage-inventory.repository.part-02";

export class StorageInventoryRepository extends StorageInventoryPart2 {}

export const storageInventoryRepository = new StorageInventoryRepository();
