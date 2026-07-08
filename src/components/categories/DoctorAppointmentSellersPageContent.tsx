"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useUsersBySpecialty } from "@/features/profile/hooks/use-users-by-specialty";
import { useTranslation } from "@/lib/i18n";

interface DoctorAppointmentSellersPageContentProps {
  categoryId: number;
  specialtyId: number;
  specialtyName: string;
  specialtyImage: string;
}

function parseStoreDetails(storeDetailsJson: string) {
  try {
    return JSON.parse(storeDetailsJson);
  } catch {
    return { storeName: '' };
  }
}

export function DoctorAppointmentSellersPageContent({
  categoryId,
  specialtyId,
  specialtyName,
  specialtyImage,
}: DoctorAppointmentSellersPageContentProps) {
  const { t, locale, isRTL } = useTranslation();
  const router = useRouter();
  const [offset, setOffset] = React.useState(0);
  const [searchText, setSearchText] = React.useState("");
  const limit = 10;

  const { data: users, isLoading, error } = useUsersBySpecialty(
    categoryId,
    specialtyId,
    offset,
    limit
  );

  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredUsers = normalizedSearchText
    ? users?.filter((user) => {
        const storeDetails = parseStoreDetails(user.storeDetailsJson || '{}');
        const storeName = storeDetails.storeName || user.uid;
        return storeName.toLowerCase().includes(normalizedSearchText);
      })
    : users;

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

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
      <div className="relative min-h-28 rounded-3xl bg-surface-bright space-y-3 p-4 overflow-hidden mb-6">
        <Image
          src={specialtyImage}
          alt={locale === "ar" ? `الأطباء في ${specialtyName}` : `Doctors in ${specialtyName}`}
          fill
          className="object-fill opacity-20"
          priority
        />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-on-surface">
            {locale === "ar" ? `الأطباء في ${specialtyName}` : `Doctors in ${specialtyName}`}
          </h1>
        </div>
        <div className="relative">
          <Search
            className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant ${
              isRTL ? "right-4" : "left-4"
            }`}
            aria-hidden
          />
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={
              locale === "ar"
                ? "ابحث في الأطباء"
                : "Search doctors"
            }
            className={`w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary ${
              isRTL ? "pr-12" : "pl-12"
            }`}
          />
        </div>
      </div>

      {isLoading && offset === 0 ? (
        <div className="text-center text-sm text-on-surface-variant">
          {t("profile.loading")}
        </div>
      ) : !filteredUsers || filteredUsers.length === 0 ? (
        <p className="text-center text-sm text-on-surface-variant">
          {normalizedSearchText
            ? locale === "ar"
              ? "لا توجد نتائج مطابقة"
              : "No matching results"
            : locale === "ar"
            ? "لا يوجد أطباء حالياً"
            : "No doctors available"}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredUsers.map((user) => {
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
