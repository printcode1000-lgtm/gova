/**
 * Public server door for `@/features/sharing/server`.
 * Server-only share metadata loaders — never import from the application door.
 */
export {
  loadPublicProductShareRecord,
  loadPublicProfileShareRecord,
  productShareMetadata,
  profileShareMetadata,
} from './share-metadata.server';
