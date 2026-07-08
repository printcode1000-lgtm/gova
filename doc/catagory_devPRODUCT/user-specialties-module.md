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
│                    Operations Layer (Queries)                │
│  GetUsersBySpecialtyQuery                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  ProfileService.getUsersBySpecialty()                        │
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
- **Method**: `getUsersBySpecialty(columnName, offset, limit)`
- **Description**: Queries the database for users with a specific specialty
- **Features**:
  - Searches in both the specific column and parent collection member column
  - Supports pagination with offset/limit
  - Returns complete user profile data

### Query Operation
- **Location**: `src/features/profile/operations/queries/get-users-by-specialty.query.ts`
- **Class**: `GetUsersBySpecialtyQuery`
- **Description**: Query operation that wraps the repository method

### Service Layer
- **Location**: `src/features/profile/services/profile-service.server.ts`
- **Method**: `getUsersBySpecialty(columnName, offset, limit)`
- **Description**: Business logic layer for specialty-based user queries

### React Hook
- **Location**: `src/features/profile/hooks/use-users-by-specialty.ts`
- **Hook**: `useUsersBySpecialty(columnName, offset, limit)`
- **Description**: Client-side React hook for querying users by specialty
- **Features**:
  - Uses React Query for caching and state management
  - Default limit: 10
  - Loading and error states

### API Endpoint
- **Location**: `src/app/api/profile/users-by-specialty/route.ts`
- **Route**: `GET /api/profile/users-by-specialty`
- **Parameters**:
  - `columnName`: The specialty column to search
  - `offset`: Pagination offset (default: 0)
  - `limit`: Pagination limit (default: 10)

### UI Components
- **Location**: `src/components/categories/SellersPageContent.tsx`
- **Description**: Component for displaying sellers by specialty
- **Features**:
  - Handles both regular subcategories and doctor-appointment specialties
  - Supports pagination with "Load More" button
  - Localization support (Arabic/English)

- **Location**: `src/components/categories/DoctorAppointmentSellersPageContent.tsx`
- **Description**: Component for displaying doctors by medical specialty
- **Features**:
  - Specialized for medical specialties
  - Uses doctor-appointment column mapping

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
  - `columnBySelection`: Maps `categoryId:originalId` to column name
  - `columnByDoctorAppointment`: Maps specialty ID to column name
  - `selectedSpecialtyColumns`: Converts user selection to column names
  - **Feature**: Automatically includes all subcategories when a collection member is selected

- **Location**: `src/features/profile/repositories/specialty-columns.client.ts`
- **Description**: Client-side version of column mapping (without server-only)

## Usage Examples

### Using the React Hook

```typescript
import { useUsersBySpecialty } from "@/features/profile/hooks/use-users-by-specialty";

function MyComponent() {
  const { data: users, isLoading, error } = useUsersBySpecialty(
    "womens_clothing_1", // column name
    0, // offset
    10 // limit
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
    "womens_clothing_1",
    0,
    10
  );
  return users;
}
```

### Using the API Endpoint

```typescript
const response = await fetch(
  '/api/profile/users-by-specialty?columnName=womens_clothing_1&offset=0&limit=10'
);
const users = await response.json();
```

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

### Delivery Services
- Special handling for delivery services (categoryId=46)
- Column: `delivery_services_46`

## Column Name Mapping

Column names are generated using the pattern: `{slug(titleEn)}_{originalId}`

Examples:
- "Women's Clothing" (originalId=1) → `womens_clothing_1`
- "Hijab Fashion" (originalId=13) → `hijab_fashion_13`
- "Obstetrics & Gynaecology" (originalId=300) → `obstetrics_and_gynaecology_300`

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
- Invalid column names return "Invalid category" message
- Empty results show "No sellers/doctors available" message
- Loading states are handled in UI components

## Future Enhancements

Potential improvements for the module:
- Add sorting options (by name, rating, etc.)
- Add filtering options (by location, availability, etc.)
- Add search functionality within results
- Implement caching strategies for better performance
- Add analytics for tracking specialty popularity
