import { productsDataSource, profilesDataSource, usersDataSource } from "../../../core";
import "server-only";


export interface SuperAdminUserSearchFilters {
  query: string;
  specialty: string;
  minProducts: number;
  maxProducts: number;
  withProductsOnly: boolean;
  limit: number;
}

export interface SuperAdminUserSearchResult {
  uid: string;
  phone: string;
  email: string;
  storeName: string;
  storeDescription: string;
  productCount: number;
  specialties: string[];
  createdAt: string;
  lastLoginAt: string;
  hasProfile: boolean;
}

export interface SuperAdminImpersonationTarget {
  uid: string;
  phone: string;
  email: string;
  specialties: { main: string[]; sub: Record<string, string[]> };
}

interface UserRow {
  uid: string;
  phone: string;
  email: string | null;
  created_at: string | null;
  last_login_at: string | null;
}

interface ProfileRow {
  uid: string;
  store_name: string | null;
  store_description: string | null;
  primary_phone: string | null;
  primary_phone_normalized: string | null;
}

interface ProductCountRow {
  uid: string;
  product_count: number;
}

type SpecialtyRow = Record<string, unknown> & { uid: string };

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function matchesText(result: SuperAdminUserSearchResult, query: string) {
  if (!query) return true;
  const haystack = [
    result.uid,
    result.phone,
    result.email,
    result.storeName,
    result.storeDescription,
    result.specialties.join(" "),
  ]
    .map(normalizeText)
    .join(" ");
  return haystack.includes(normalizeText(query));
}

function activeSpecialties(row: SpecialtyRow | undefined) {
  if (!row) return [];
  return Object.entries(row)
    .filter(([key, value]) => key !== "uid" && Number(value) === 1)
    .map(([key]) => key)
    .sort();
}

function specialtySelection(row: SpecialtyRow | undefined) {
  return { main: [], sub: { impersonated: activeSpecialties(row) } };
}

export class SuperAdminUserSearchRepository {
  async getImpersonationTarget(uid: string): Promise<SuperAdminImpersonationTarget | null> {
    const rows = (await usersDataSource.execute(
      "SELECT uid, phone, email FROM users WHERE uid = ? AND deleted_at IS NULL LIMIT 1",
      [uid],
    )) as UserRow[];
    const user = rows[0];
    if (!user) return null;

    const specialtyRows = (await profilesDataSource.execute(
      "SELECT * FROM user_specialties WHERE uid = ? LIMIT 1",
      [user.uid],
    )) as SpecialtyRow[];

    return {
      uid: user.uid,
      phone: user.phone,
      email: user.email ?? "",
      specialties: specialtySelection(specialtyRows[0]),
    };
  }

  async search(filters: SuperAdminUserSearchFilters) {
    const [users, profiles, productCounts, specialties] = await Promise.all([
      usersDataSource.execute(
        "SELECT uid, phone, email, created_at, last_login_at FROM users WHERE deleted_at IS NULL",
      ) as Promise<UserRow[]>,
      profilesDataSource.execute(
        "SELECT uid, store_name, store_description, primary_phone, primary_phone_normalized FROM user_profiles",
      ) as Promise<ProfileRow[]>,
      productsDataSource.execute(
        "SELECT uid, COUNT(*) AS product_count FROM products WHERE status <> 'archived' GROUP BY uid",
      ) as Promise<ProductCountRow[]>,
      profilesDataSource.execute("SELECT * FROM user_specialties") as Promise<
        SpecialtyRow[]
      >,
    ]);

    const profilesByUid = new Map(profiles.map((profile) => [profile.uid, profile]));
    const countsByUid = new Map(
      productCounts.map((row) => [row.uid, Number(row.product_count) || 0]),
    );
    const specialtiesByUid = new Map(specialties.map((row) => [row.uid, row]));
    const profileOnlyUids = profiles
      .map((profile) => profile.uid)
      .filter((uid) => !users.some((user) => user.uid === uid));

    const mergedUsers: UserRow[] = [
      ...users,
      ...profileOnlyUids.map((uid) => ({
        uid,
        phone: profilesByUid.get(uid)?.primary_phone ?? "",
        email: null,
        created_at: null,
        last_login_at: null,
      })),
    ];

    return mergedUsers
      .map((user): SuperAdminUserSearchResult => {
        const profile = profilesByUid.get(user.uid);
        const userSpecialties = activeSpecialties(specialtiesByUid.get(user.uid));
        return {
          uid: user.uid,
          phone:
            user.phone ||
            profile?.primary_phone_normalized ||
            profile?.primary_phone ||
            "",
          email: user.email ?? "",
          storeName: profile?.store_name ?? "",
          storeDescription: profile?.store_description ?? "",
          productCount: countsByUid.get(user.uid) ?? 0,
          specialties: userSpecialties,
          createdAt: user.created_at ?? "",
          lastLoginAt: user.last_login_at ?? "",
          hasProfile: Boolean(profile),
        };
      })
      .filter((result) => matchesText(result, filters.query))
      .filter((result) =>
        filters.specialty
          ? result.specialties.some((specialty) =>
              specialty.includes(filters.specialty),
            )
          : true,
      )
      .filter((result) =>
        filters.withProductsOnly ? result.productCount > 0 : true,
      )
      .filter((result) => result.productCount >= filters.minProducts)
      .filter((result) =>
        filters.maxProducts > 0 ? result.productCount <= filters.maxProducts : true,
      )
      .sort((a, b) => b.productCount - a.productCount || a.uid.localeCompare(b.uid))
      .slice(0, filters.limit);
  }
}

export const superAdminUserSearchRepository =
  new SuperAdminUserSearchRepository();
