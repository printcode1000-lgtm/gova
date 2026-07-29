# Category Display System

## Display Source

All display surfaces depend on `@/features/categories`. Components do not read JSON or form collections or Doctor Appointment themselves.

## Surfaces

- Splash and Home receive `CategoryDisplay[]` from the server page and use the ready `imageUrl`.
- `/categories/[categoryId]` resolves `CategoryTree` before rendering and uses `notFound()` when the category is missing.
- `/categories/[categoryId]/sellers/[subcategoryId]` displays sellers by subcategory specialty.
- `/categories/[categoryId]/doctor-appointment/[specialtyId]` displays doctors by medical specialty.
- `/collections/[collectionId]` resolves `CollectionDisplay` before rendering.
- Search within lists only is Client-side.
- Profile uses `getProfileMainOptions` and `getProfileSubOptions`.
- Developer selector uses catalog and options Typed from the module and does not read the source.

## Images

The public projection returns `imageUrl`. The consumer must not guess whether the image is under `mainCategories` or `subCategories`.

## Medical Services

The first list displays the `virtual:doctor-appointment` node. Clicking it adds `?view=doctor-appointment` and shows the real specialties. The back button removes the parameter. The virtual node is not a saved choice.

Clicking on a medical specialty (e.g., Obstetrics & Gynaecology) navigates to `/categories/[categoryId]/doctor-appointment/[specialtyId]` to display doctors with that specialty.

## Collections

The collection is built inside the module from its members after verifying name and image consistency. The collection link is independent of the category link, and a collection member opens its real category page.

Clicking on a subcategory navigates to `/categories/[categoryId]/sellers/[subcategoryId]` to display sellers with that specialty.

## Delivery Services

On the Home page, clicking Delivery Services must navigate directly to `/categories/46/sellers/1`.

This category has no intermediate subcategory browsing step in the Home flow. The direct route opens the delivery service providers list immediately, using the same sellers page used by normal category subcategories.

## Sellers Display

The sellers pages use the User Specialties Module to query users by specialty:
- Regular subcategories use `columnBySelection` mapping
- Doctor appointment specialties use `columnByDoctorAppointment` mapping
- Supports hierarchical relationships: users who selected a collection member appear in all its subcategories
- Pagination with default limit of 10 users per page

## Static export

`generateStaticParams` takes categories and collections from the module. `scripts/build-static.ts` copies `public/catagory` files as assets only; it does not interpret their content or use them as a secondary source of truth.
