"use client";

import * as React from "react";
import { useUsersBySpecialty } from "@/features/profile/hooks/use-users-by-specialty";
import { columnBySelection, columnByDoctorAppointment } from "@/features/profile/repositories/specialty-columns.client";
import { useTranslation } from "@/lib/i18n";

interface SellersPageContentProps {
  categoryId: number;
  subcategoryId: number;
  subcategoryName: string;
}

export function SellersPageContent({
  categoryId,
  subcategoryId,
  subcategoryName,
}: SellersPageContentProps) {
  const { t, locale } = useTranslation();
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

      {!users || users.length === 0 ? (
        <p className="text-center text-sm text-on-surface-variant">
          {locale === "ar" ? "لا يوجد تجار حالياً" : "No sellers available"}
        </p>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.uid} className="rounded-xl bg-surface p-4">
              <p className="font-medium text-on-surface">{user.uid}</p>
            </div>
          ))}
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
