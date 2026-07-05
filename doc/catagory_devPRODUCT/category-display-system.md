# Category Display System

## Display Source

All display surfaces depend on `@/features/categories`. Components do not read JSON or form collections or Doctor Appointment themselves.

## Surfaces

- Splash and Home receive `CategoryDisplay[]` from the server page and use the ready `imageUrl`.
- `/categories/[categoryId]` resolves `CategoryTree` before rendering and uses `notFound()` when the category is missing.
- `/collections/[collectionId]` resolves `CollectionDisplay` before rendering.
- Search within lists only is Client-side.
- Profile uses `getProfileMainOptions` and `getProfileSubOptions`.
- Developer selector uses catalog and options Typed from the module and does not read the source.

## Images

The public projection returns `imageUrl`. The consumer must not guess whether the image is under `mainCategories` or `subCategories`.

## Medical Services

The first list displays the `virtual:doctor-appointment` node. Clicking it adds `?view=doctor-appointment` and shows the real specialties. The back button removes the parameter. The virtual node is not a saved choice.

## Collections

The collection is built inside the module from its members after verifying name and image consistency. The collection link is independent of the category link, and a collection member opens its real category page.

## Static export

`generateStaticParams` takes categories and collections from the module. `scripts/build-static.ts` copies `public/catagory` files as assets only; it does not interpret their content or use them as a secondary source of truth.
