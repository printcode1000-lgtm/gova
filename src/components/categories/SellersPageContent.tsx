"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useUsersBySpecialty } from "@/features/profile/hooks/use-users-by-specialty";
import { columnBySelection, columnByDoctorAppointment } from "@/features/profile/repositories/specialty-columns.client";
import { useTranslation } from "@/lib/i18n";

interface SellersPageContentProps {
  categoryId: number;
  subcategoryId: number;
  subcategoryName: string;
}

function parseStoreDetails(storeDetailsJson: string) {
  try {
    return JSON.parse(storeDetailsJson);
  } catch {
    return { storeName: '' };
  }
}

export function SellersPageContent({
  categoryId,
  subcategoryId,
  subcategoryName,
}: SellersPageContentProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [offset, setOffset] = React.useState(0);
  const limit = 10;

  // Try doctor-appointment first (for medical specialties), then regular subcategories
  // Special handling for delivery services (categoryId=46) where originalId equals categoryId
  // Also check parent collection member (for My Way subcategories)
  const columnName = columnByDoctorAppointment.get(subcategoryId) || 
                     columnBySelection.get(`${categoryId}:${subcategoryId}`) ||
                     columnBySelection.get(`${categoryId}:${categoryId}`);
  
  const { data: users, isLoading, error } = useUsersBySpecialty(
    columnName || "",
    offset,
    limit
  );

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

  if (!columnName) {
    return (
      <div className="container px-4 py-8 text-center text-sm text-on-surface-variant">
        {locale === "ar" ? "تصنيف غير صالح" : "Invalid category"}
      </div>
    );
  }

  if (isLoading && offset === 0) {
    return (
      <div className="container px-4 py-8 text-center text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container px-4 py-8 text-center text-sm text-error">
        {locale === "ar" ? "حدث خطأ أثناء تحميل البيانات" : "Error loading data"}
      </div>
    );
  }

  return (
    <div className="container px-4 py-8">
      <h1 className="text-2xl font-bold text-on-surface mb-6">
        {locale === "ar" ? `التجار في ${subcategoryName}` : `Sellers in ${subcategoryName}`}
      </h1>

      {isLoading && offset === 0 ? (
        <div className="text-center text-sm text-on-surface-variant">
          {t("profile.loading")}
        </div>
      ) : !users || users.length === 0 ? (
        <p className="text-center text-sm text-on-surface-variant">
          {locale === "ar" ? "لا يوجد تجار حالياً" : "No sellers available"}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {users.map((user) => {
            const storeDetails = parseStoreDetails(user.storeDetailsJson || '{}');
            const storeName = storeDetails.storeName || user.uid;
            const avatarUrl = (user as any).avatarUrl || null;

            return (
              <button
                key={user.uid}
                onClick={() => router.push(`/profile?uid=${user.uid}`)}
                className="flex flex-col items-center rounded-xl bg-surface p-4 shadow-sm"
              >
                <div className="relative h-24 w-24 overflow-hidden rounded-full bg-surface-bright">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={storeName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl text-on-surface-variant">
                      {storeName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="mt-3 text-center text-sm font-medium text-on-surface line-clamp-2">
                  {storeName}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {users && users.length === limit && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
          >
            {isLoading
              ? t("profile.loading")
              : locale === "ar"
              ? "تحميل المزيد"
              : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
