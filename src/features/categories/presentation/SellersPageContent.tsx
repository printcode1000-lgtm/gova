"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { SellerCard } from "@/features/seller-card/ui";
import { useUsersBySpecialty } from "@/features/profile/ui";
import { createSellerCardViewModel, sellerCardTitle } from "@/features/seller-card";
import { useTranslation } from "@/shared/i18n";
import { createOpaqueUiInstanceId, uiAttributes } from "@asol/ui-registry-core";

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
      <div {...uiAttributes({ uid: "categories.sellers-page-content.div.9-d23O8g", id: "categories.sellers-page-content.div.9" })} id="categories.sellers-page-content.div" className="container px-4 py-8 text-center text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div {...uiAttributes({ uid: "categories.sellers-page-content.div.10-M0FtZX", id: "categories.sellers-page-content.div.10" })} id="categories.sellers-page-content.div.2" className="container px-4 py-8 text-center text-sm text-error">
        {locale === "ar" ? "حدث خطأ أثناء تحميل البيانات" : "Error loading data"}
      </div>
    );
  }

  return (
    <div {...uiAttributes({ uid: "categories.sellers-page-content.div.11-ESpzc3", id: "categories.sellers-page-content.div.11" })} id="categories.sellers-page-content.div.3" className="container px-4 py-8">
      <div {...uiAttributes({ uid: "categories.sellers-page-content.div.12-5I7xHD", id: "categories.sellers-page-content.div.12" })} id="categories.sellers-page-content.div.4" className="relative mb-6 min-h-28 overflow-hidden rounded-3xl bg-surface-bright p-4">
        <Image id="categories.sellers-page-content.image"
          src={subcategoryImage}
          alt={locale === "ar" ? `البائعون في ${subcategoryName}` : `Sellers in ${subcategoryName}`}
          fill
          className="object-fill opacity-20"
          priority
        />
        <div {...uiAttributes({ uid: "categories.sellers-page-content.div.13-Gce264", id: "categories.sellers-page-content.div.13" })} id="categories.sellers-page-content.div.5" className="relative z-10 space-y-3">
          <h1 {...uiAttributes({ uid: "categories.sellers-page-content.h1.2-l7vxqI", id: "categories.sellers-page-content.h1.2" })} id="categories.sellers-page-content.h1" className="text-2xl font-bold text-on-surface">
            {locale === "ar" ? `البائعون في ${subcategoryName}` : `Sellers in ${subcategoryName}`}
          </h1>
          <div {...uiAttributes({ uid: "categories.sellers-page-content.div.14-51Viz5", id: "categories.sellers-page-content.div.14" })} id="categories.sellers-page-content.div.6" className="relative">
            <Search id="categories.sellers-page-content.search" className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" aria-hidden />
            <input {...uiAttributes({ uid: "categories.sellers-page-content.input.2-AT88fL", id: "categories.sellers-page-content.input.2" })} id="categories.sellers-page-content.input"
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
        <p {...uiAttributes({ uid: "categories.sellers-page-content.p.2-D1QO9j", id: "categories.sellers-page-content.p.2" })} id="categories.sellers-page-content.p" className="text-center text-sm text-on-surface-variant">
          {normalizedSearchText
            ? locale === "ar" ? "لا توجد نتائج مطابقة" : "No matching results"
            : locale === "ar" ? "لا يوجد بائعون حاليًا" : "No sellers available"}
        </p>
      ) : (
        <div {...uiAttributes({ uid: "categories.sellers-page-content.div.15-UEx95f", id: "categories.sellers-page-content.div.15" })} id="categories.sellers-page-content.div.7" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredUsers.map((user) => {
            const card = createSellerCardViewModel(user, { badge: locale === "ar" ? "بائع" : "Seller" });
            return (
              <SellerCard
                key={user.uid}
                card={card}
                variant="category-sellers"
                ui={{
                  uid: "seller-open-gu26VS",
                  id: "seller-open",
                  kind: "item",
                  interaction: { type: "tap" },
                  simulation: { kind: "list-item", id: "seller-open" },
                  instance: createOpaqueUiInstanceId("category-seller", user.uid),
                }}
                onOpen={() => router.push(card.href)}
              />
            );
          })}
        </div>
      )}

      {users && users.length === limit ? (
        <div {...uiAttributes({ uid: "categories.sellers-page-content.div.16-J9WgSO", id: "categories.sellers-page-content.div.16" })} id="categories.sellers-page-content.div.8" className="mt-6 text-center">
          <button {...uiAttributes({ uid: "sellers-load-more-W7FMgN", id: "sellers-load-more", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "sellers-load-more" } })}
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
