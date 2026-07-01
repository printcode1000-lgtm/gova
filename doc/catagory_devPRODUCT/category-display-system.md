# Category Display System

## Purpose

This document describes how main categories and subcategories are loaded, transformed, displayed, navigated, and selected throughout the Gova application. It covers every current runtime consumer of the public category JSON files and the server-side specialty-column generator.

## Canonical data sources

The category UI is driven by two public JSON files:

- `public/catagory/categories.json`
- `public/catagory/subcategories.json`

Client components load these files through `govaApi.getPublicJson(...)`. They do not query the profile database for category titles, images, hierarchy, or ordering.

### Main category record

A record in `categories.json` contains the following relevant fields:

| Field | Meaning |
| --- | --- |
| `id` | Identifier of a normal category or of an item inside a collection. |
| `title_ar`, `title_en` | Arabic and English item titles. |
| `icon` | Icon metadata. It is currently not rendered by the main category cards. |
| `image` | File name under `public/images/mainCategories`. |
| `collection` | `null` for a standalone main category; otherwise the numeric identifier of a collection. |
| `collection_ar`, `collection_en` | Collection titles repeated on collection-member records. |
| `collection_image` | Collection cover image under `public/images/mainCategories`. |
| `order` | Main display order. A missing order is treated as `Infinity` and appears last. |
| `created_at`, `updated_at` | Source metadata; normally not displayed. |

### Subcategory record

A record in `subcategories.json` contains:

| Field | Meaning |
| --- | --- |
| `id` | Internal source record identifier. |
| `category_id` | Parent main-category identifier. |
| `original_id` | Public/selection identifier saved for the subcategory. |
| `title_ar`, `title_en` | Arabic and English titles. |
| `icon` | Icon metadata. |
| `image` | File name under `public/images/subCategories`. |
| `sub_collection` | Optional grouping marker. Medical records with numeric value `0` belong to the Doctor Appointment group. |
| `created_at`, `updated_at` | Source metadata. |

`original_id`, rather than the internal `id`, is used when a regular subcategory is saved in profile specialties or selected by the developer tool.

## Standard main-category transformation

The Home category grid, the Profile specialties editor, and the developer selector use the same conceptual transformation:

1. Sort raw category records by `order`, with missing values last.
2. Treat every record whose `collection` is `null` as a standalone main category.
3. Group every non-null `collection` value into one virtual main category.
4. Build the virtual collection from the first member's `collection_ar`, `collection_en`, and `collection_image`.
5. Use the collection number as the virtual main-category ID.
6. Sort the final standalone-and-collection list by `order` again.

Consequently, Beauty Store is one main option even though its members such as My Way, Oriflame, and Avon are separate records in `categories.json`.

## Special category rules

### Beauty Store and other collections

A collection is not backed by a separate category record. Its displayed main card is synthesized from member records.

When a collection is opened, its members are converted into subcategory-like items:

- `id` and `original_id` are the member category's `id`.
- `category_id` is the collection ID.
- Titles and images come from the member category record.
- Images use `/images/mainCategories/<image>` rather than the subcategory image directory.

The currently important collection ID is `0` for Beauty Store.

### Medical Services and Doctor Appointment

Medical Services has category ID `20`.

Every medical subcategory with numeric `sub_collection === 0` is hidden from the first medical list and represented by one synthetic item:

- Arabic title: `كشف طبي`
- English title: `Doctor Appointment`
- Image: `/images/subCategories/doctors_appointment.webp`
- UI-only synthetic ID: `-1000` in the customer category page and profile editor

The behavior after showing the synthetic item depends on the surface:

- The customer category page opens a second in-page list containing the real `sub_collection === 0` records.
- The Profile specialties dialog opens the real records so their actual `original_id` values can be selected and saved.
- The developer selector deliberately exposes only the synthetic Doctor Appointment option and does not expose the grouped medical children.

Other Medical Services records, whose `sub_collection` is not numeric `0`, remain visible beside Doctor Appointment.

### Delivery Services

Delivery Services has category ID `46`.

In the Profile specialties editor it is a standalone selection. Clicking it toggles the main specialty directly and does not open a subcategory dialog.

## Display surfaces

## 1. Splash top marquee

Implementation: `src/components/splash/TopMarquee.tsx`

- Loads raw `categories.json` records.
- Randomly selects six records and duplicates them to create the marquee loop.
- Uses `title_ar` or `title_en` according to the active locale.
- Uses the raw category image through `MarqueeCard`.
- Does **not** perform collection grouping or `order` sorting.

This means collection members may appear individually in the splash marquee. The marquee should not be treated as the canonical main-category hierarchy.

## 2. Home category grid

Implementation: `src/components/home/CategoriesGrid.tsx`

- Uses the standard main-category transformation described above.
- Renders three columns on the base layout.
- Uses `/images/mainCategories/<image>`.
- Displays the localized title over the image.
- Links every card to:

```text
/categories/<display-id>?collection=<0-or-1>
```

`collection=1` tells the destination that the display ID represents a virtual collection. `collection=0` identifies a normal category.

## 3. Category subcategory page

Route: `src/app/categories/[categoryId]/page.tsx`

UI: `src/components/categories/CategorySubcategoriesPage.tsx`

The route parses the dynamic `categoryId` and the optional `collection` query parameter, then delegates rendering to the client component.

### Normal category

- Finds the category by `categories.id`.
- Filters `subcategories.json` by `subcategory.category_id === categoryId`.
- Uses the main category title and image in the translucent header.
- Uses `/images/subCategories` for cards.

### Collection

A category is treated as a collection when either:

- the route contains `?collection=1`, or
- no category record has that ID but records exist whose `collection` equals the ID.

The page uses collection title/cover fields from the first member, displays collection members as the page items, and uses `/images/mainCategories` for their cards.

### Medical Services

- Doctor Appointment is inserted as the first card.
- Clicking it switches the page to the real medical records with `sub_collection === 0`.
- The header title becomes Doctor Appointment.
- The header image becomes `doctors_appointment.webp` with the same translucent full-background behavior as other headers.
- There is no dedicated back button inside the Doctor Appointment view.

### Search

The search box filters the currently visible list using a case-insensitive substring match against both `title_ar` and `title_en`. In Doctor Appointment mode, it searches only the grouped doctor records.

## 4. Profile specialties editor

Implementation: `src/components/profile/SpecialtiesCard.tsx`

- Uses the standard main-category transformation.
- Limits the user to three selected main specialties.
- Opens a modal for regular categories and collections.
- Uses `original_id` for regular subcategory selections.
- Uses member `id` as `original_id` for virtual collection children.
- Automatically selects a main category when one of its children is selected.
- Removes the main category when its last selected child is removed.
- Removes all child selections when the main category is deselected.
- Handles Delivery Services as a direct main-only toggle.
- Handles Doctor Appointment as a navigation-only group; the synthetic `-1000` value is not saved as a specialty.

The saved structure is:

```json
{
  "main": [1, 3, 0],
  "sub": {
    "0": [23],
    "1": [13, 1],
    "3": [7, 11],
    "12": [5]
  }
}
```

The structure is persisted in `user_profiles.specialties_json`, synchronized to the wide `user_specialties` table, and included in the client session as `session.specialties`.

## 5. Developer category selector

Implementation: `src/components/dev/DeveloperCategorySelector.tsx`

- Displays bilingual Arabic/English labels.
- Uses the standard main-category transformation.
- Changes the subcategory dropdown whenever the main selection changes.
- Shows collection members in the subcategory dropdown.
- Shows Doctor Appointment as one synthetic option and never lists its grouped doctor children.
- Shows raw selected-record metadata in a collapsible details area.
- Enables product-style configuration only after both selections exist.

The full operation of this page is documented in `developer-category-selector.md`.

## 6. Server-side specialty column generation

Implementation: `src/features/profile/repositories/specialty-columns.server.ts`

This file is not a visual surface, but it consumes the same JSON hierarchy to generate columns for the wide `user_specialties` table.

It includes:

- Every record from `subcategories.json`.
- Category records whose `collection === 0`, representing Beauty Store members.
- A synthetic Delivery Services entry with ID `46`.

Column names use a slug of `title_en` plus `_originalId`, for example `womens_clothing_13`. Selected profile values are mapped through the pair `categoryId:originalId`.

## Localization and ordering rules

- Arabic UI uses `title_ar`/`collection_ar`.
- English UI uses `title_en`/`collection_en`.
- The developer selector intentionally displays both languages together.
- Main display ordering uses `order`, with `null` or missing values last.
- Subcategory JSON order is preserved unless a surface explicitly inserts a synthetic item. Doctor Appointment is inserted first.
- Collection-member order follows the source category order after the parent category list has been sorted where applicable.

## Image path rules

| Item type | Base directory |
| --- | --- |
| Main category | `/images/mainCategories` |
| Virtual collection cover | `/images/mainCategories` |
| Collection member displayed as a child | `/images/mainCategories` |
| Regular subcategory | `/images/subCategories` |
| Doctor Appointment | `/images/subCategories/doctors_appointment.webp` |

## Change checklist

When category data or hierarchy behavior changes, verify all of the following:

1. Home grouping and route links.
2. Normal and collection category pages.
3. Medical Services first-level and Doctor Appointment views.
4. Profile specialty selection and the three-main-category limit.
5. Developer selector dropdowns and style-file key generation.
6. Wide specialty column schema/migration requirements.
7. Main-category and subcategory image files.
8. Arabic and English titles.

Changing a JSON record does not automatically migrate database columns. In particular, deleting a JSON item does not automatically remove a column from the wide `user_specialties` table.
