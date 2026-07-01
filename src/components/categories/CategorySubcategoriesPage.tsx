"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { govaApi } from "@/core/api";
import { useTranslation } from "@/lib/i18n";

const MEDICAL_SERVICES_CATEGORY_ID = 20;
const DOCTOR_APPOINTMENT_GROUP_ID = -1000;

interface Category {
  id: number;
  title_ar: string;
  title_en: string;
  icon: string;
  image: string;
  created_at: string;
  updated_at: string;
  collection: number | null;
  collection_ar: string | null;
  collection_en: string | null;
  collection_image: string | null;
  order: number | null;
}

interface Subcategory {
  id: number;
  category_id: number;
  original_id: number;
  title_ar: string;
  title_en: string;
  icon: string;
  image: string;
  created_at: string;
  updated_at: string;
  sub_collection: number | null;
  isDoctorAppointmentGroup?: boolean;
}

interface CategorySubcategoriesPageProps {
  categoryId: string;
  isCollectionHint: boolean;
}

export function CategorySubcategoriesPage({
  categoryId,
  isCollectionHint,
}: CategorySubcategoriesPageProps) {
  const { locale, isRTL } = useTranslation();
  const numericCategoryId = Number(categoryId);
  const [title, setTitle] = React.useState("");
  const [heroImage, setHeroImage] = React.useState("");
  const [items, setItems] = React.useState<Subcategory[]>([]);
  const [doctorAppointmentItems, setDoctorAppointmentItems] = React.useState<
    Subcategory[]
  >([]);
  const [isDoctorAppointmentView, setIsDoctorAppointmentView] =
    React.useState(false);
  const [usesMainCategoryImages, setUsesMainCategoryImages] =
    React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const loadCategory = async () => {
      setLoading(true);
      setNotFound(false);
      setIsDoctorAppointmentView(false);
      setSearchText("");
      setUsesMainCategoryImages(false);

      try {
        const [categories, subcategories] = await Promise.all([
          govaApi.getPublicJson<Category[]>("/catagory/categories.json"),
          govaApi.getPublicJson<Subcategory[]>("/catagory/subcategories.json"),
        ]);

        if (Number.isNaN(numericCategoryId)) {
          setNotFound(true);
          return;
        }

        const collectionItems = categories.filter(
          (category) => category.collection === numericCategoryId,
        );
        const category = categories.find(
          (item) => item.id === numericCategoryId,
        );
        const shouldShowCollection =
          isCollectionHint || (!category && collectionItems.length > 0);

        if (shouldShowCollection && collectionItems.length > 0) {
          const firstCollectionItem = collectionItems[0];
          const collectionTitle =
            locale === "ar"
              ? firstCollectionItem.collection_ar
              : firstCollectionItem.collection_en;

          if (!cancelled) {
            setTitle(collectionTitle || "");
            setHeroImage(firstCollectionItem.collection_image || "");
            setUsesMainCategoryImages(true);
            setDoctorAppointmentItems([]);
            setItems(
              collectionItems.map((item) => ({
                id: item.id,
                category_id: numericCategoryId,
                original_id: item.id,
                title_ar: item.title_ar,
                title_en: item.title_en,
                icon: item.icon,
                image: item.image,
                created_at: item.created_at,
                updated_at: item.updated_at,
                sub_collection: null,
              })),
            );
          }
          return;
        }

        if (!category) {
          setNotFound(true);
          return;
        }

        const categoryTitle =
          locale === "ar" ? category.title_ar : category.title_en;
        const filteredItems = subcategories.filter(
          (item) => item.category_id === numericCategoryId,
        );

        if (numericCategoryId === MEDICAL_SERVICES_CATEGORY_ID) {
          const doctorItems = filteredItems.filter(
            (item) => item.sub_collection === 0,
          );
          const visibleItems = filteredItems.filter(
            (item) => item.sub_collection !== 0,
          );

          if (!cancelled) {
            setTitle(categoryTitle);
            setHeroImage(category.image);
            setUsesMainCategoryImages(false);
            setDoctorAppointmentItems(doctorItems);
            setItems([
              {
                id: DOCTOR_APPOINTMENT_GROUP_ID,
                category_id: numericCategoryId,
                original_id: DOCTOR_APPOINTMENT_GROUP_ID,
                title_ar: "\u0643\u0634\u0641 \u0637\u0628\u064a",
                title_en: "Doctor Appointment",
                icon: "fas fa-user-md",
                image: "doctors_appointment.webp",
                created_at: "",
                updated_at: "",
                sub_collection: null,
                isDoctorAppointmentGroup: true,
              },
              ...visibleItems,
            ]);
          }
          return;
        }

        if (!cancelled) {
          setTitle(categoryTitle);
          setHeroImage(category.image);
          setUsesMainCategoryImages(false);
          setDoctorAppointmentItems([]);
          setItems(filteredItems);
        }
      } catch (error) {
        console.error("Failed to load category subcategories:", error);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCategory();

    return () => {
      cancelled = true;
    };
  }, [isCollectionHint, locale, numericCategoryId]);

  const visibleItems = isDoctorAppointmentView ? doctorAppointmentItems : items;
  const normalizedSearchText = searchText.trim().toLowerCase();
  const filteredItems = normalizedSearchText
    ? visibleItems.filter((item) => {
        const arabicTitle = item.title_ar.toLowerCase();
        const englishTitle = item.title_en.toLowerCase();
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="px-4 py-6">
        <p className="mt-8 text-center text-on-surface-variant">
          {locale === "ar"
            ? "\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u062a\u0635\u0646\u064a\u0641"
            : "Category not found"}
        </p>
      </div>
    );
  }

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
          <div className="relative z-10">
            <p className="text-xs font-medium text-on-surface-variant">
              {locale === "ar"
                ? "\u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0627\u0644\u0641\u0631\u0639\u064a\u0629"
                : "Subcategories"}
            </p>
            <h1 className="text-2xl font-bold text-on-surface">{pageTitle}</h1>
          </div>
        </div>
      </section>

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
            const name = locale === "ar" ? item.title_ar : item.title_en;
            const imageBasePath =
              usesMainCategoryImages && !isDoctorAppointmentView
                ? "/images/mainCategories"
                : "/images/subCategories";
            const imageSrc = `${imageBasePath}/${item.image}`;
            const isDoctorGroup = item.isDoctorAppointmentGroup;

            return (
              <button
                key={item.id}
                type="button"
                className="group flex flex-col gap-2 text-start transition-transform duration-200 active:scale-95"
                onClick={() => {
                  if (isDoctorGroup) setIsDoctorAppointmentView(true);
                }}
                aria-label={name}
              >
                <div className="relative aspect-[4/3.5] overflow-hidden rounded-2xl bg-surface-bright shadow-sm">
                  <Image
                    src={imageSrc}
                    alt={name}
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
