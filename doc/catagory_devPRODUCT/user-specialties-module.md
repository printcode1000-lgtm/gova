# User Specialties Module

## Overview

The User Specialties Module provides a flexible, architecture-compliant system for querying users based on their specialties. It enables filtering users by specific categories, subcategories, or medical specialties, with support for pagination and hierarchical category relationships.

## Architecture

The module follows the project's standard layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Layer (React Hooks)                   │
│  useUsersBySpecialty()                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│               Client Service Layer (GovaApiClient)           │
│  ProfileApiService.getUsersBySpecialty()                     │
└─────────────────────────────────────────────────────────────┘
                              ↓  HTTP GET
┌─────────────────────────────────────────────────────────────┐
│                    Business API Layer                         │
│  GET /api/profile/users-by-specialty                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ProfileService.getUsersBySpecialty()                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   Query / Command Layer                       │
│  GetUsersBySpecialtyQuery                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                  Repository Layer                             │
│  ProfileRepository.getUsersBySpecialty()                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                             │
│  user_specialties table (Drizzle ORM)                        │
└─────────────────────────────────────────────────────────────┘
```

## Files and Components

### Database Schema
- **Location**: `src/core/database/profile/user-specialties.schema.ts`
- **Description**: Drizzle ORM schema definition for the `user_specialties` table
- **Columns**: Boolean columns for each specialty (e.g., `womens_clothing_1`, `hijab_fashion_13`, etc.)

### Repository Layer
- **Location**: `src/features/profile/repositories/profile-repository.ts`
- **Method**: `getUsersBySpecialty(categoryId, subcategoryId, offset, limit)`
- **Description**: Resolves the correct specialty column internally using `columnByDoctorAppointment` or `columnBySelection` maps, then queries the database
- **Features**:
  - Resolves `categoryId + subcategoryId` → column name automatically (callers never pass raw column names)
  - Searches in both the specific column and parent collection member column
  - Supports pagination with offset/limit
  - Returns complete user profile data (`UserProfileRow[]`)

### Query Operation
- **Location**: `src/features/profile/operations/queries/get-users-by-specialty.query.ts`
- **Class**: `GetUsersBySpecialtyQuery`
- **Method**: `execute(categoryId, subcategoryId, offset, limit)`
- **Description**: Query operation that wraps the repository method. Imports `UserProfileRow` type from the repository interface (not from the database-client layer directly).

### Service Layer
- **Location**: `src/features/profile/services/profile-service.server.ts`
- **Method**: `getUsersBySpecialty(categoryId, subcategoryId, offset, limit)`
- **Description**: Business logic layer that delegates to `GetUsersBySpecialtyQuery`

### Client Service
- **Location**: `src/features/profile/services/profile-api-service.ts`
- **Method**: `getUsersBySpecialty(categoryId, subcategoryId, offset, limit)`
- **Description**: Client-side service that calls the API endpoint via `GovaApiClient`

### React Hook
- **Location**: `src/features/profile/hooks/use-users-by-specialty.ts`
- **Hook**: `useUsersBySpecialty(categoryId, subcategoryId, offset?, limit?)`
- **Description**: Client-side React hook for querying users by specialty
- **Features**:
  - Uses React Query for caching and state management
  - Default offset: 0, default limit: 10
  - `enabled` only when both `categoryId` and `subcategoryId` are truthy
  - Loading and error states

### API Endpoint
- **Location**: `src/app/api/profile/users-by-specialty/route.ts`
- **Route**: `GET /api/profile/users-by-specialty`
- **Parameters**:
  - `categoryId`: The main category ID (number)
  - `subcategoryId`: The subcategory / specialty ID (number)
  - `offset`: Pagination offset (default: 0)
  - `limit`: Pagination limit (default: 10)
- **Response**: `UserProfileRow[]` with an extra computed field `avatarUrl` (resolved from `avatarImageKey` via `imageStorageOrchestrator`, or `null` if no avatar)

### UI Components
- **Location**: `src/components/categories/SellersPageContent.tsx`
- **Description**: Component for displaying sellers by specialty
- **Features**:
  - Receives `categoryId`, `subcategoryId`, `subcategoryName` as props
  - Calls `useUsersBySpecialty(categoryId, subcategoryId, offset, limit)`
  - Handles both regular subcategories and doctor-appointment specialties
  - Supports pagination with "Load More" button
  - Localization support (Arabic/English)

- **Location**: `src/components/categories/DoctorAppointmentSellersPageContent.tsx`
- **Description**: Component for displaying doctors by medical specialty
- **Features**:
  - Specialized for medical specialties
  - Calls `useUsersBySpecialty` with doctor-appointment category and specialty IDs

### Pages
- **Location**: `src/app/categories/[categoryId]/sellers/[subcategoryId]/page.tsx`
- **Route**: `/categories/[categoryId]/sellers/[subcategoryId]`
- **Description**: Page for displaying sellers by subcategory

- **Location**: `src/app/categories/[categoryId]/doctor-appointment/[specialtyId]/page.tsx`
- **Route**: `/categories/[categoryId]/doctor-appointment/[specialtyId]`
- **Description**: Page for displaying doctors by medical specialty

### Helper Functions
- **Location**: `src/features/profile/repositories/specialty-columns.server.ts`
- **Functions**:
  - `columnBySelection`: Map of `"categoryId:subcategoryId"` → column name
  - `columnByDoctorAppointment`: Map of doctor specialty ID → column name
  - `selectedSpecialtyColumns`: Converts user selection to column names
  - **Feature**: Automatically includes all subcategories when a collection member is selected

- **Location**: `src/features/profile/repositories/specialty-columns.client.ts`
- **Description**: Client-side version of column mapping (without server-only)

## Usage Examples

### Using the React Hook

```typescript
import { useUsersBySpecialty } from "@/features/profile/hooks/use-users-by-specialty";

function SellersPageContent({ categoryId, subcategoryId }: { categoryId: number; subcategoryId: number }) {
  const { data: users, isLoading, error } = useUsersBySpecialty(
    categoryId,   // e.g. 1 (Women's Clothing category)
    subcategoryId // e.g. 13 (Hijab Fashion subcategory)
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading users</div>;

  return (
    <div>
      {users?.map((user) => (
        <div key={user.uid}>{user.uid}</div>
      ))}
    </div>
  );
}
```

### Using the Service Layer (Server-Side)

```typescript
import { profileService } from "@/features/profile/services/profile-service.bootstrap.server";

async function getSellers() {
  const users = await profileService.getUsersBySpecialty(
    1,   // categoryId  (Women's Clothing)
    13,  // subcategoryId (Hijab Fashion)
    0,   // offset
    10   // limit
  );
  return users;
}
```

### Using the API Endpoint

```typescript
// Regular subcategory
const response = await fetch(
  '/api/profile/users-by-specialty?categoryId=1&subcategoryId=13&offset=0&limit=10'
);
const users = await response.json();
// Each user object includes an extra `avatarUrl` field (string | null)

// Doctor appointment specialty
const response2 = await fetch(
  '/api/profile/users-by-specialty?categoryId=20&subcategoryId=300&offset=0&limit=10'
);
```

## Specialties Selection Limit (SpecialtiesCard)

The `SpecialtiesCard` component (`src/components/profile/SpecialtiesCard.tsx`) enforces the following rules when a user edits their profile:

| User Role | Main Categories Limit |
|---|---|
| Regular user | **Max 3** main specialties |
| Super Admin | **Unlimited** |

- Exceeding the limit shows a toast: `"لا يمكن اختيار أكثر من 3 تخصصات رئيسية"` / `"Cannot select more than 3 main categories"`.
- The `unlimited` prop is passed as `true` by `ProfilePageContent` when `isSuperAdmin(session)` returns `true`.
- No limit is applied to subcategories under an already-selected main specialty.

## Category Hierarchy Support

The module supports hierarchical category relationships:

### Collection Members (e.g., My Way, Oriflame, Avon)
- When a user selects a collection member (e.g., "My Way"), all its subcategories are automatically included
- Example: Selecting "My Way" includes:
  - Men's Perfumes
  - Women's Perfumes
  - Cosmetics
  - Household Cleaners
  - Canned Food
- When searching in a subcategory (e.g., "Household Cleaners"), users who selected the parent collection member are also found

### Medical Specialties (Doctor Appointment)
- Special handling for medical services (categoryId=20)
- Separate route: `/categories/[categoryId]/doctor-appointment/[specialtyId]`
- Examples: Obstetrics & Gynaecology (300), Radiology (338), etc.
- The repository resolves these via the `columnByDoctorAppointment` map first

### Delivery Services
- Special handling for delivery services (categoryId=46)
- Column: `delivery_services_46`
- Does not open a subcategory dialog in `SpecialtiesCard`

## Column Name Mapping

Column names are generated using the pattern: `{slug(titleEn)}_{originalId}`

Examples:
- "Women's Clothing" (originalId=1) → `womens_clothing_1`
- "Hijab Fashion" (originalId=13) → `hijab_fashion_13`
- "Obstetrics & Gynaecology" (originalId=300) → `obstetrics_and_gynaecology_300`

**The column resolution is internal to the Repository layer.** Callers (service, query, hook, API) always pass `categoryId` and `subcategoryId` — never raw column names.

## Navigation Flow

1. **Home Page**: User clicks on a category
2. **Category Page**: User sees subcategories
3. **Subcategory Click**: Navigation to sellers page
   - Regular subcategory: `/categories/[categoryId]/sellers/[subcategoryId]`
   - Doctor appointment: `/categories/[categoryId]/doctor-appointment/[specialtyId]`
4. **Sellers Page**: Displays users with the selected specialty

## Important Notes

### Data Consistency
- When users save their specialties, the system automatically includes all relevant columns
- For collection members, all subcategory columns are saved
- **Users must re-save their specialties** after code changes to apply updates to existing data

### Type Propagation
- `UserProfileRow` is exported from `profile-repository.interface.ts` and re-exported from `profile-service.interface.ts`
- The Query and Client Service layers import the type from their own adjacent interfaces — not from `@/core/database/...` — to avoid architecture violations

### Pagination
- Default limit: 10 users per page
- Offset-based pagination for infinite scroll
- "Load More" button in UI components

### Flexibility
- The module is designed to be flexible and reusable across the application
- Can be used from any component via the React hook
- Can be used server-side via the service layer
- Can be accessed via API endpoint for external clients

### Error Handling
- Invalid `categoryId`/`subcategoryId` combinations that resolve to no column return an empty array `[]`
- Empty results show "No sellers/doctors available" message
- Loading states are handled in UI components

## Future Enhancements

Potential improvements for the module:
- Add sorting options (by name, rating, etc.)
- Add filtering options (by location, availability, etc.)
- Add search functionality within results
- Implement caching strategies for better performance
- Add analytics for tracking specialty popularity
