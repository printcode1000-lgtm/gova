# Developer Category Selector

## Overview

The developer category selector is an internal development-only page used to inspect category relationships, configure product-page components for a main/subcategory pair, and preview those components in multiple modes.

Route:

```text
/dev/category-selector
```

Primary implementation files:

- `src/app/dev/category-selector/page.tsx`
- `src/components/dev/DeveloperCategorySelector.tsx`
- `src/app/api/dev/product-style/route.ts`
- `src/core/api/gova-api-routes.ts`
- `src/components/product-preview/*`
- `public/product/style/*.json`

## Access control

The route checks `isDevelopment`. Outside the development environment it calls Next.js `notFound()`, so the page returns a not-found result rather than merely hiding its content.

The page is also linked from the floating `GOVA DEV` menu in `src/components/dev/DeveloperBadge.tsx`. The badge itself is only loaded/rendered in development.

This is environment-based developer access. It is not a user-account role or database permission.

## Data loading

On mount, the client loads these files in parallel through `govaApi`:

- `/catagory/categories.json`
- `/catagory/subcategories.json`

Until both requests complete, the page displays a loading state. A failed request displays an error message and prevents selector initialization.

## Main category dropdown

The dropdown is built as follows:

1. Records with `collection === null` become normal main options.
2. Records with the same non-null `collection` value become one virtual collection option.
3. The virtual collection uses its collection ID and the first member's collection titles.
4. The final options are sorted by `order`; a missing order is placed last.
5. Labels display Arabic and English together.

Changing the main category clears the current subcategory and hides the product configuration table until a new subcategory is selected.

## Subcategory dropdown

### Normal category

The dropdown contains records from `subcategories.json` whose `category_id` matches the selected main category. The option value is `original_id`.

### Collection

The dropdown contains records from `categories.json` whose `collection` matches the selected virtual collection. The option value is the member category's `id`.

For Beauty Store, this is where My Way, Oriflame, Avon, and any other collection members appear.

### Medical Services

For category ID `20`:

- Records with `sub_collection === 0` are not listed individually.
- If at least one such record exists, one synthetic `doctor-appointment` option is inserted first.
- Its labels are `كشف طبي` and `Doctor Appointment`.
- Medical items outside that group remain available after the synthetic option.

## Selected-record details

The collapsible details container shows every available key/value pair for the selected main and subcategory records.

### Normal selections

The raw JSON record is displayed, including fields such as `id`, `category_id`, `original_id`, `sub_collection`, titles, image metadata, and timestamps.

### Virtual collection main selection

Because no single raw record represents the collection, the page creates a diagnostic record containing:

- Collection ID and titles.
- Collection image and order.
- `is_collection: true`.
- Member IDs and member count.

### Doctor Appointment selection

The page creates a diagnostic record containing the synthetic ID, medical parent ID, `sub_collection: 0`, titles, image, `is_virtual_group: true`, grouped `original_id` values, and grouped item count.

These diagnostic records are display-only and are not written back to the category JSON files.

## Product component configuration table

The table appears only when both a main category and a subcategory have been selected.

Its columns are:

- **Visibility**: enables or disables the complete component.
- **Component**: component name.
- **Controls**: enables component-specific fields or behavior.
- **Order**: positive integer used to sort the preview.

The table and its descendants use `data-voice-input="off"`. The global voice-input scanner respects ancestor opt-out markers, so microphone buttons are not injected into table fields.

## Configurable components

| Component key    | Controls                                                                   | Default order |
| ---------------- | -------------------------------------------------------------------------- | ------------- |
| `images`         | Visibility and maximum image count                                         | 1             |
| `rating`         | Stars only or stars with comments                                          | 2             |
| `price`          | Current price, before-discount price, needs-car value                      | 3             |
| `order`          | Cart, favorite, contact                                                    | 4             |
| `mainData`       | Name, brand, manufacturer, availability, description                       | 5             |
| `specifications` | Color, dimensions, condition, size, weight, year                           | 6             |
| `vehicleSpecs`   | Brand, body type, fuel, transmission                                       | 7             |
| `propertySpecs`  | Area, rooms, bathrooms, property type, address, location, finishing        | 8             |
| `pharmacySpecs`  | Arabic name, English name, medicine form, concentration, active ingredient | 9             |

The initial UI enables the general components and disables specialized vehicle, property, and pharmacy components until explicitly enabled. Existing JSON settings override all defaults after loading.

Order is dynamic. The preview filters out invisible components and sorts the remaining components numerically in ascending order. If two components have the same order, their declaration order in `DeveloperCategorySelector.tsx` is retained by the stable JavaScript sort used by supported runtimes.

## Per-selection persistence

New configuration is stored in the public repository directory:

```text
public/product/style
```

Files previously created under the legacy `product/style` directory are not
moved or deleted automatically. The current selector reads and writes the new
public location only.

Each main/subcategory pair has a separate JSON file:

```text
<mainCategoryId>__<subcategoryId>.json
```

Examples:

```text
1__13.json
0__23.json
20__doctor-appointment.json
```

Because the directory is under `public`, every saved settings file can also be
read by any application page as a static asset, for example:

```text
/product/style/1__13.json
```

Client code should use `govaApi.getPublicJson(...)` to preserve the project's
HTTP gateway convention.

## Public style index

The public index is available at:

```text
/product/style/index.json
```

Its source file is `public/product/style/index.json`. It is rebuilt atomically
after every successful settings-file save by scanning the public style
directory. Therefore, the index reflects the files that actually exist in the
public location and does not include legacy files left under `product/style`.

Example:

```json
{
  "generatedAt": "2026-07-01T12:00:00.000Z",
  "files": [
    {
      "mainCategoryId": "1",
      "subcategoryId": "13",
      "file": "1__13.json",
      "path": "/product/style/1__13.json"
    }
  ]
}
```

Entries are sorted by file name. Temporary files and `index.json` itself are
excluded.

Only alphanumeric characters and hyphens are accepted in either selection ID. This prevents path traversal and keeps file names portable.

## Storage API

Canonical API route constant:

```text
GOVA_API_ROUTES.dev.productStyle
```

Resolved endpoint:

```text
/api/dev/product-style
```

The endpoint is development-only and returns HTTP 404 outside development.

### GET

Request:

```text
GET /api/dev/product-style?mainCategoryId=1&subcategoryId=13
```

Existing file response:

```json
{
  "exists": true,
  "settings": {
    "mainCategoryId": "1",
    "subcategoryId": "13",
    "components": {}
  }
}
```

If no file exists, the endpoint returns `exists: false` and `settings: null`. Invalid JSON or an invalid schema produces an error response rather than silently using corrupted settings.

### PUT

`PUT /api/dev/product-style` validates the complete submitted settings object, creates `public/product/style` if necessary, writes formatted JSON to a temporary file, atomically renames the temporary file to the final pair-specific path, and then atomically rebuilds the public index.

The atomic rename avoids exposing a partially written JSON file.

## Automatic load and save lifecycle

1. Selecting a complete main/subcategory pair sets the style state to loading.
2. The client requests the pair-specific JSON file with `cache: "no-store"`.
3. Existing settings populate every table control; a missing file applies defaults.
4. Controls remain disabled until loading completes.
5. Any settings change starts a 350 ms debounce timer.
6. When the timer completes, the full settings object is sent with PUT.
7. The UI reports loading, saving, saved, idle, or error status.
8. Returning to the same pair reloads its complete saved state.

The loading guard is important: it prevents default values from overwriting an existing file before that file has been read.

## JSON structure

A settings file has this shape:

```json
{
  "mainCategoryId": "1",
  "subcategoryId": "13",
  "components": {
    "images": { "visible": true, "count": 4, "order": 1 },
    "rating": { "visible": true, "type": "stars-comments", "order": 2 },
    "price": {
      "visible": true,
      "current": true,
      "beforeDiscount": true,
      "needsCar": true,
      "order": 3
    },
    "order": {
      "visible": true,
      "cart": true,
      "favorite": true,
      "contact": true,
      "order": 4
    },
    "mainData": {
      "visible": true,
      "name": true,
      "brand": true,
      "manufacturer": true,
      "available": true,
      "description": true,
      "order": 5
    },
    "specifications": {
      "visible": true,
      "color": true,
      "dimensions": true,
      "condition": true,
      "size": true,
      "weight": true,
      "year": true,
      "order": 6
    },
    "vehicleSpecs": {
      "visible": false,
      "brand": true,
      "bodyType": true,
      "fuel": true,
      "transmission": true,
      "order": 7
    },
    "propertySpecs": {
      "visible": false,
      "area": true,
      "rooms": true,
      "bathrooms": true,
      "type": true,
      "address": true,
      "location": true,
      "finishing": true,
      "order": 8
    },
    "pharmacySpecs": {
      "visible": false,
      "nameAr": true,
      "nameEn": true,
      "form": true,
      "concentration": true,
      "activeIngredient": true,
      "order": 9
    }
  }
}
```

The server validator accepts certain missing newer component blocks/order fields for backward compatibility, while newly saved files contain the current complete structure.

## Preview modes

Three buttons appear directly below the table:

- **View** (`view`) is selected by default. It displays demonstration values as read-only content.
- **Edit** (`edit`) displays demonstration values in editable controls.
- **New** (`new`) displays empty editable controls.

Changing mode remounts the preview subtree. This intentionally resets temporary demonstration input and gives each mode a clean state.

Preview values are not persisted to the JSON file or any database. Only component visibility, controls, count/type options, and order are persisted.

## Reusable product preview components

Every preview component is implemented independently under `src/components/product-preview` and exported through its `index.ts` barrel:

- `ProductImages`
- `ProductRating`
- `ProductPrice`
- `ProductActions`
- `ProductMainData`
- `ProductSpecifications`
- `VehicleSpecifications`
- `PropertySpecifications`
- `PharmacySpecifications`

Shared presentation primitives and mode types are in `shared.tsx` and `types.ts`. Components accept a `mode` plus only the control flags relevant to that component, so they can be imported and rendered outside the developer page.

## Image preview behavior

- View mode renders demonstration image placeholders.
- Edit and New modes expose a local `accept="image/*"` multi-file picker.
- Selection is limited to the configured maximum image count.
- Selected files are represented by browser object URLs and shown immediately.
- Individual selected images can be removed.
- Object URLs are revoked during cleanup to prevent memory leaks.
- Files are never uploaded and are not saved when the mode or page changes.

## Important boundaries

- The page does not edit `categories.json` or `subcategories.json`.
- Product style JSON controls presentation configuration only.
- Preview form values and selected image files are temporary.
- Product style files are public static assets, not database records.
- Deleting a category JSON record does not delete its product style file.
- Renaming or changing an ID can orphan an old pair-specific style file.
- The page is not an authorization surface for production users.

## Verification checklist

After changing the selector or component schema, verify:

1. The route returns not found outside development.
2. Normal categories, collections, Beauty Store, Medical Services, and Doctor Appointment populate correctly.
3. The table remains hidden until both dropdowns are selected.
4. Existing pair settings load without briefly overwriting the file.
5. Every changed table value survives switching away and returning.
6. Invisible components do not appear in the preview.
7. Component order updates immediately.
8. View fields are read-only, Edit fields contain samples, and New fields are empty.
9. The image count limit and object URL cleanup work.
10. `npm run typecheck` and `npm run architecture:check` pass.
