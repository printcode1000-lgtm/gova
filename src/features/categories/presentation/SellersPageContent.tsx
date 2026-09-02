"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { SellerCard } from "@/features/seller-card/ui";
import { useUsersBySpecialty } from "@/features/profile/ui";
import { createSellerCardViewModel, sellerCardTitle } from "@/features/seller-card";
import { useTranslation } from "@/shared/i18n";

interface SellersPageContentProps {
  categoryId: number;
  subcategoryId: number;
  subcategoryNameAr: string;
  subcategoryNameEn: string;
  subcategoryImage: string;
}

export function SellersPageContent({
  categoryId,
  subcategoryId,
  subcategoryNameAr,
  subcategoryNameEn,
  subcategoryImage,
}: SellersPageContentProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [offset, setOffset] = React.useState(0);
  const [searchText, setSearchText] = React.useState("");
  const limit = 10;
  const subcategoryName = locale === "ar" ? subcategoryNameAr : subcategoryNameEn;

  const { data: users, isLoading, error } = useUsersBySpecialty(categoryId, subcategoryId, offset, limit);
  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredUsers = normalizedSearchText
    ? users?.filter((user) => sellerCardTitle(user).toLowerCase().includes(normalizedSearchText))
    : users;

  const loadMore = () => setOffset((prev) => prev + limit);

  if (isLoading && offset === 0) {
    return (
      <div id='features-categories-presentation-sellerspagecontent-div-1-a59jcw' className="container px-4 py-8 text-center text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div id='features-categories-presentation-sellerspagecontent-div-2-ebbn3w' className="container px-4 py-8 text-center text-sm text-error">
        {locale === "ar" ? "حدث خطأ أثناء تحميل البيانات" : "Error loading data"}
      </div>
    );
  }

  return (
    <div id='features-categories-presentation-sellerspagecontent-div-3-dbu2zj' className="container px-4 py-8">
      <div id='features-categories-presentation-sellerspagecontent-div-4-khadrz' className="relative mb-6 min-h-28 overflow-hidden rounded-3xl bg-surface-bright p-4">
        <Image id='features-categories-presentation-sellerspagecontent-image-5-vjpufe'
          src={subcategoryImage}
          alt={locale === "ar" ? `البائعون في ${subcategoryName}` : `Sellers in ${subcategoryName}`}
          fill
          className="object-fill opacity-20"
          priority
        />
        <div id='features-categories-presentation-sellerspagecontent-div-6-cn12jg' className="relative z-10 space-y-3">
          <h1 id='features-categories-presentation-sellerspagecontent-heading-7-g62xsa' className="text-2xl font-bold text-on-surface">
            {locale === "ar" ? `البائعون في ${subcategoryName}` : `Sellers in ${subcategoryName}`}
          </h1>
          <div id='features-categories-presentation-sellerspagecontent-div-8-o5wq9o' className="relative">
            <Search id='features-categories-presentation-sellerspagecontent-search-9-xfhewh' className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" aria-hidden />
            <input id='features-categories-presentation-sellerspagecontent-input-10-gmjdf8'
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={locale === "ar" ? "ابحث في البائعين" : "Search sellers"}
              className="asol-input-decorated-start w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary"
            />
          </div>
        </div>
      </div>

      {!filteredUsers || filteredUsers.length === 0 ? (
        <p id='features-categories-presentation-sellerspagecontent-text-11-nq5d40' className="text-center text-sm text-on-surface-variant">
          {normalizedSearchText
            ? locale === "ar" ? "لا توجد نتائج مطابقة" : "No matching results"
            : locale === "ar" ? "لا يوجد بائعون حاليًا" : "No sellers available"}
        </p>
      ) : (
        <div id='features-categories-presentation-sellerspagecontent-div-12-efl9q8' className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredUsers.map((user) => {
            const card = createSellerCardViewModel(user, { badge: locale === "ar" ? "بائع" : "Seller" });
            return (
              <SellerCard
                key={user.uid}
                card={card}
                variant="category-sellers"
                onOpen={() => router.push(card.href)}
              />
            );
          })}
        </div>
      )}

      {users && users.length === limit ? (
        <div id='features-categories-presentation-sellerspagecontent-div-13-gwskmc' className="mt-6 text-center">
          <button id="features-categories-presentation-sellerspagecontent-button-14-ej7tpk"
            type="button"
            onClick={loadMore}
            disabled={isLoading}
            className="rounded-xl bg-primary px-6 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
          >
            {isLoading ? t("profile.loading") : locale === "ar" ? "تحميل المزيد" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
