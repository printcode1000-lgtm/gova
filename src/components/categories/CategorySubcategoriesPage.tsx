"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import * as React from "react";

import { useTranslation } from "@/lib/i18n";
import type { CategoryTree } from "@/features/categories";

interface CategorySubcategoriesPageProps {
  categoryTree: CategoryTree;
}

export function CategorySubcategoriesPage({
  categoryTree,
}: CategorySubcategoriesPageProps) {
  const { locale, isRTL } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isDoctorAppointmentView, setIsDoctorAppointmentView] =
    React.useState(false);
  const [searchText, setSearchText] = React.useState("");

  // Initialize isDoctorAppointmentView from URL
  React.useEffect(() => {
    const view = searchParams.get('view');
    setIsDoctorAppointmentView(view === 'doctor-appointment');
  }, [searchParams]);

  // Handle Doctor Appointment group click
  const handleDoctorGroupClick = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('view', 'doctor-appointment');
    router.push(`${pathname}?${newSearchParams.toString()}`);
    setIsDoctorAppointmentView(true);
  };

  // Handle back button
  const handleBack = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('view');
    router.push(`${pathname}?${newSearchParams.toString()}`);
    setIsDoctorAppointmentView(false);
  };

  const title = locale === "ar" ? categoryTree.category.nameAr : categoryTree.category.nameEn;
  const heroImage = categoryTree.category.image;
  const items = categoryTree.subcategories;
  const doctorAppointmentItems = categoryTree.doctorAppointmentItems || [];

  const visibleItems = isDoctorAppointmentView ? doctorAppointmentItems : items;
  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredItems = normalizedSearchText
    ? visibleItems.filter((item) => {
        const arabicTitle = item.nameAr.toLowerCase();
        const englishTitle = item.nameEn.toLowerCase();
        return (
          arabicTitle.includes(normalizedSearchText) ||
          englishTitle.includes(normalizedSearchText)
        );
      })
    : visibleItems;
  const pageTitle = isDoctorAppointmentView
    ? locale === "ar"
      ? "\u0643\u0634\u0641 \u0637\u0628\u064a"
      : "Doctor Appointment"
    : title;
  const headerImage = isDoctorAppointmentView
    ? "doctors_appointment.webp"
    : heroImage;
  const headerImageBasePath = isDoctorAppointmentView
    ? "/images/subCategories"
    : "/images/mainCategories";

  return (
    <div className="space-y-5 px-4 py-5">
      <section className="gova-section-tonal gova-section-tonal-primary overflow-hidden">
        <div className="relative min-h-28 rounded-2xl bg-surface-bright p-4">
          {headerImage && (
            <Image
              src={`${headerImageBasePath}/${headerImage}`}
              alt={pageTitle}
              fill
              className="object-cover opacity-20"
              priority
            />
          )}
          <div className="relative z-10 space-y-3">
            <div>
              <h1 className="text-2xl font-bold text-on-surface">{pageTitle}</h1>
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
                    ? "\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0627\u0644\u0641\u0631\u0639\u064a\u0629"
                    : "Search subcategories"
                }
                className={`w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary ${
                  isRTL ? "pr-12" : "pl-12"
                }`}
              />
            </div>
          </div>
        </div>
      </section>

      {visibleItems.length === 0 ? (
        <p className="rounded-2xl bg-surface p-8 text-center text-sm text-on-surface-variant">
          {locale === "ar"
            ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0641\u0631\u0639\u064a\u0629"
            : "No subcategories"}
        </p>
      ) : filteredItems.length === 0 ? (
        <p className="rounded-2xl bg-surface p-8 text-center text-sm text-on-surface-variant">
          {locale === "ar"
            ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629"
            : "No matching results"}
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
          {filteredItems.map((item) => {
            const name = locale === "ar" ? item.nameAr : item.nameEn;
            const imageSrc = item.imageUrl;
            const isDoctorGroup = item.isDoctorAppointmentGroup;
            const altText = name || "Subcategory image";

            return (
              <button
                key={item.id}
                type="button"
                className="group flex flex-col gap-2 text-start transition-transform duration-200 active:scale-95"
                onClick={() => {
                  if (isDoctorGroup) handleDoctorGroupClick();
                }}
                aria-label={altText}
              >
                <div className="relative aspect-[4/3.5] overflow-hidden rounded-2xl bg-surface-bright shadow-sm">
                  <Image
                    src={imageSrc}
                    alt={altText}
                    fill
                    className="object-cover transition-opacity group-hover:opacity-90"
                  />
                  <span
                    className={`absolute bottom-2 max-w-[calc(100%-1rem)] truncate rounded-md bg-black/50 px-2 py-1 text-[11px] font-normal leading-3 text-white ${
                      isRTL ? "right-2" : "left-2"
                    }`}
                  >
                    {name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
