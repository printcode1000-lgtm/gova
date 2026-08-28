"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import * as React from "react";

import {
  categoryGridClassName,
  categoryTileClassName,
  categoryTileImageClassName,
  categoryTileTitleClassName,
} from "@/features/categories/presentation/category-grid-styles";
import { useTranslation } from "@/shared/i18n";
import type { CategoryTree } from "@/features/categories";
import { uiAttributes } from "@asol/ui-registry-core";

interface CategorySubcategoriesPageProps {
  categoryTree: CategoryTree;
}

export function CategorySubcategoriesPage({
  categoryTree,
}: CategorySubcategoriesPageProps) {
  const { locale } = useTranslation();
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
    <div id="categories.category-subcategories-page.div" className="space-y-5 px-4 py-5">
      <div id="categories.category-subcategories-page.div.2" className="relative min-h-28 rounded-3xl bg-surface-bright space-y-3 p-4 overflow-hidden">
        {headerImage && (
          <Image id="categories.category-subcategories-page.image"
            src={`${headerImageBasePath}/${headerImage}`}
            alt={pageTitle}
            fill
            className="object-cover opacity-20"
            priority
          />
        )}
        <div id="categories.category-subcategories-page.div.3" className="relative z-10">
          <h1 id="categories.category-subcategories-page.h1" className="text-2xl font-bold text-on-surface">{pageTitle}</h1>
        </div>
        <div id="categories.category-subcategories-page.div.4" className="relative">
          <Search id="categories.category-subcategories-page.search"
            className="absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-on-surface-variant"
            aria-hidden
          />
          <input id="categories.category-subcategories-page.input"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={
              locale === "ar"
                ? "\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0627\u0644\u0641\u0631\u0639\u064a\u0629"
                : "Search subcategories"
            }
            className="asol-input-decorated-start w-full rounded-2xl border border-outline-variant bg-surface px-4 py-3 text-sm text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary"
          />
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <p id="categories.category-subcategories-page.p" className="rounded-2xl bg-surface p-8 text-center text-sm text-on-surface-variant">
          {locale === "ar"
            ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0641\u0631\u0639\u064a\u0629"
            : "No subcategories"}
        </p>
      ) : filteredItems.length === 0 ? (
        <p id="categories.category-subcategories-page.p.2" className="rounded-2xl bg-surface p-8 text-center text-sm text-on-surface-variant">
          {locale === "ar"
            ? "\u0644\u0627 \u062a\u0648\u062c\u062f \u0646\u062a\u0627\u0626\u062c \u0645\u0637\u0627\u0628\u0642\u0629"
            : "No matching results"}
        </p>
      ) : (
        <div id="categories.category-subcategories-page.div.5" className="asol-section-tonal asol-section-tonal-primary">
          <div id="categories.category-subcategories-page.div.6" className={categoryGridClassName}>
            {filteredItems.map((item) => {
              const name = locale === "ar" ? item.nameAr : item.nameEn;
              const imageSrc = item.imageUrl;
              const isDoctorGroup = item.isDoctorAppointmentGroup;
              const altText = name || "Subcategory image";

              return (
                <button key={item.id}
                  {...uiAttributes({ uid: "category-item-N5DI5e", id: "category-item", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "category-item" } })}
                  type="button"
                  className={categoryTileClassName}
                  onClick={() => {
                    if (isDoctorGroup) {
                      handleDoctorGroupClick();
                    } else if (isDoctorAppointmentView) {
                      router.push(`/categories/${categoryTree.category.id}/doctor-appointment/${item.originalId}`);
                    } else {
                      router.push(`/categories/${categoryTree.category.id}/sellers/${item.originalId}`);
                    }
                  }}
                  aria-label={altText}
                >
                  <div className={categoryTileImageClassName}>
                    <Image
                      src={imageSrc}
                      alt={altText}
                      fill
                      sizes="(max-width: 640px) 33vw, 220px"
                      className="object-cover"
                    />
                  </div>
                  <span className={categoryTileTitleClassName}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
