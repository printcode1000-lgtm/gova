"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { SellerCard } from "@asol/seller-card-core/ui";
import { SellerCardFavoriteSlot } from "@/features/favorites/ui";
import { useUsersBySpecialty } from "@/features/profile/ui";
import { createSellerCardViewModel, sellerCardTitle } from "@asol/seller-card-core";
import { useTranslation } from "@/shared/i18n";

interface DoctorAppointmentSellersPageContentProps {
  categoryId: number;
  specialtyId: number;
  specialtyName: string;
  specialtyImage: string;
}

export function DoctorAppointmentSellersPageContent({
  categoryId,
  specialtyId,
  specialtyName,
  specialtyImage,
}: DoctorAppointmentSellersPageContentProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [offset, setOffset] = React.useState(0);
  const [searchText, setSearchText] = React.useState("");
  const limit = 10;

  const { data: users, isLoading, error } = useUsersBySpecialty(categoryId, specialtyId, offset, limit);
  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredUsers = normalizedSearchText
    ? users?.filter((user) => sellerCardTitle(user).toLowerCase().includes(normalizedSearchText))
    : users;

  const loadMore = () => setOffset((prev) => prev + limit);

  if (isLoading && offset === 0) {
    return (
      <div id='features-categories-presentation-doctorappointmentsellerspagecontent-div-1-k9xup1' className="container px-4 py-8 text-center text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div id='features-categories-presentation-doctorappointmentsellerspagecontent-div-2-wmj2gq' className="container px-4 py-8 text-center text-sm text-error">
        {locale === "ar" ? "حدث خطأ أثناء تحميل البيانات" : "Error loading data"}
      </div>
    );
  }

  return (
    <div id='features-categories-presentation-doctorappointmentsellerspagecontent-div-3-pqz25n' className="container px-4 py-8">
      <div id='features-categories-presentation-doctorappointmentsellerspagecontent-div-4-duyzak' className="relative mb-6 min-h-28 overflow-hidden rounded-3xl bg-surface-bright p-4">
        <Image id='features-categories-presentation-doctorappointmentsellerspagecontent-image-5-w4ccxn'
          src={specialtyImage}
          alt={locale === "ar" ? `الأطباء في ${specialtyName}` : `Doctors in ${specialtyName}`}
          fill
          className="object-fill opacity-20"
          priority
        />
        <div id='features-categories-presentation-doctorappointmentsellerspagecontent-div-6-kbn2kd' className="relative z-10 space-y-3">
          <h1 id='features-categories-presentation-doctorappointmentsellerspagecontent-heading-7-pa2kqx' className="text-2xl font-bold text-on-surface">
            {locale === "ar" ? `الأطباء في ${specialtyName}` : `Doctors in ${specialtyName}`}
          </h1>
          <div id='features-categories-presentation-doctorappointmentsellerspagecontent-div-8-gybd8t' className="relative">
            <Search id='features-categories-presentation-doctorappointmentsellerspagecontent-search-9-nytgmw' className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant" aria-hidden />
            <input id='features-categories-presentation-doctorappointmentsellerspagecontent-input-10-4a8bax'
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder={locale === "ar" ? "ابحث في الأطباء" : "Search doctors"}
              className="asol-input-decorated-start w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary"
            />
          </div>
        </div>
      </div>

      {!filteredUsers || filteredUsers.length === 0 ? (
        <p id="features-categories-presentation-doctorappointmentsellerspagecontent-text-11-frnrrf" className="text-center text-sm text-on-surface-variant">
          {normalizedSearchText
            ? locale === "ar" ? "لا توجد نتائج مطابقة" : "No matching results"
            : locale === "ar" ? "لا يوجد أطباء حاليًا" : "No doctors available"}
        </p>
      ) : (
        <div id='features-categories-presentation-doctorappointmentsellerspagecontent-div-12-tzhgek' className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredUsers.map((user) => {
            const card = createSellerCardViewModel(user, { badge: locale === "ar" ? "طبيب" : "Doctor" });
            return (
              <SellerCard
                key={user.uid}
                card={card}
                variant="doctor-sellers"
                favoriteSlot={<SellerCardFavoriteSlot card={card} />}
                onOpen={() => router.push(card.href)}
              />
            );
          })}
        </div>
      )}

      {users && users.length === limit ? (
        <div id='features-categories-presentation-doctorappointmentsellerspagecontent-div-13-mdbhzl' className="mt-6 text-center">
          <button id="features-categories-presentation-doctorappointmentsellerspagecontent-button-14-5ryzwo"
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
