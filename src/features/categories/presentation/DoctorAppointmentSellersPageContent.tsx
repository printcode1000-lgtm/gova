"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { SellerCard } from "@/features/seller-card/ui";
import { useUsersBySpecialty } from "@/features/profile/ui";
import { createSellerCardViewModel, sellerCardTitle } from "@/features/seller-card";
import { useTranslation } from "@/shared/i18n";
import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";

interface DoctorAppointmentSellersPageContentProps {
  categoryId: number;
  specialtyId: number;
  specialtyName: string;
  specialtyImage: string;
}


const DOCTOR_OPEN_UI: UiDescriptor = { uid: "doctor-open-bV5IRx", id: "doctor-open", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "doctor-open" } };
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

  const {
    data: users,
    isLoading,
    error,
  } = useUsersBySpecialty(categoryId, specialtyId, offset, limit);

  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredUsers = normalizedSearchText
    ? users?.filter((user) =>
        sellerCardTitle(user).toLowerCase().includes(normalizedSearchText),
      )
    : users;

  const loadMore = () => {
    setOffset((prev) => prev + limit);
  };

  if (isLoading && offset === 0) {
    return (
      <div {...uiAttributes({ uid: "categories.doctor-appointment-sellers-page-content.div.9-9ZgZhf", id: "categories.doctor-appointment-sellers-page-content.div.9" })} id="categories.doctor-appointment-sellers-page-content.div" className="container px-4 py-8 text-center text-sm text-on-surface-variant">
        {t("profile.loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div {...uiAttributes({ uid: "categories.doctor-appointment-sellers-page-content.div.10-HNl9aO", id: "categories.doctor-appointment-sellers-page-content.div.10" })} id="categories.doctor-appointment-sellers-page-content.div.2" className="container px-4 py-8 text-center text-sm text-error">
        {locale === "ar" ? "حدث خطأ أثناء تحميل البيانات" : "Error loading data"}
      </div>
    );
  }

  return (
    <div {...uiAttributes({ uid: "categories.doctor-appointment-sellers-page-content.div.11-8EsV8f", id: "categories.doctor-appointment-sellers-page-content.div.11" })} id="categories.doctor-appointment-sellers-page-content.div.3" className="container px-4 py-8">
      <div {...uiAttributes({ uid: "categories.doctor-appointment-sellers-page-content.div.12-L2HYvE", id: "categories.doctor-appointment-sellers-page-content.div.12" })} id="categories.doctor-appointment-sellers-page-content.div.4" className="relative mb-6 min-h-28 overflow-hidden rounded-3xl bg-surface-bright p-4">
        <Image id="categories.doctor-appointment-sellers-page-content.image"
          src={specialtyImage}
          alt={
            locale === "ar"
              ? `الأطباء في ${specialtyName}`
              : `Doctors in ${specialtyName}`
          }
          fill
          className="object-fill opacity-20"
          priority
        />
        <div {...uiAttributes({ uid: "categories.doctor-appointment-sellers-page-content.div.13-1n6ahU", id: "categories.doctor-appointment-sellers-page-content.div.13" })} id="categories.doctor-appointment-sellers-page-content.div.5" className="relative z-10 space-y-3">
          <h1 {...uiAttributes({ uid: "categories.doctor-appointment-sellers-page-content.h1.2-Y7W7H9", id: "categories.doctor-appointment-sellers-page-content.h1.2" })} id="categories.doctor-appointment-sellers-page-content.h1" className="text-2xl font-bold text-on-surface">
            {locale === "ar"
              ? `الأطباء في ${specialtyName}`
              : `Doctors in ${specialtyName}`}
          </h1>
          <div {...uiAttributes({ uid: "categories.doctor-appointment-sellers-page-content.div.14-C5AX1Z", id: "categories.doctor-appointment-sellers-page-content.div.14" })} id="categories.doctor-appointment-sellers-page-content.div.6" className="relative">
            <Search id="categories.doctor-appointment-sellers-page-content.search"
              className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant"
              aria-hidden
            />
            <input {...uiAttributes({ uid: "categories.doctor-appointment-sellers-page-content.input.2-OW65bV", id: "categories.doctor-appointment-sellers-page-content.input.2" })} id="categories.doctor-appointment-sellers-page-content.input"
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
        <p {...uiAttributes({ uid: "doctor-empty-PkeW6Q", id: "doctor-empty", kind: "region", simulation: { kind: "state", id: "doctor-empty" } })} className="text-center text-sm text-on-surface-variant">
          {normalizedSearchText
            ? locale === "ar"
              ? "لا توجد نتائج مطابقة"
              : "No matching results"
            : locale === "ar"
              ? "لا يوجد أطباء حاليًا"
              : "No doctors available"}
        </p>
      ) : (
        <div {...uiAttributes({ uid: "categories.doctor-appointment-sellers-page-content.div.15-zfU0VS", id: "categories.doctor-appointment-sellers-page-content.div.15" })} id="categories.doctor-appointment-sellers-page-content.div.7" className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredUsers.map((user) => {
            const card = createSellerCardViewModel(user, {
              badge: locale === "ar" ? "طبيب" : "Doctor",
            });
            return (
              <SellerCard
                key={user.uid}
                card={card}
                variant="doctor-sellers"
                ui={DOCTOR_OPEN_UI}
                onOpen={() => router.push(card.href)}
              />
            );
          })}
        </div>
      )}

      {users && users.length === limit ? (
        <div {...uiAttributes({ uid: "categories.doctor-appointment-sellers-page-content.div.16-i35XYV", id: "categories.doctor-appointment-sellers-page-content.div.16" })} id="categories.doctor-appointment-sellers-page-content.div.8" className="mt-6 text-center">
          <button {...uiAttributes({ uid: "doctor-load-more-4AV97U", id: "doctor-load-more", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "doctor-load-more" } })}
            type="button"
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
      ) : null}
    </div>
  );
}
