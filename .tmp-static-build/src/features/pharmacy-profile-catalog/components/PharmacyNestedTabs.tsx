"use client";

import * as React from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";

import { pharmacyProfileCatalogApi } from "../services/pharmacy-profile-catalog-api";
import type {
  PharmacyProfileCatalogView,
  PharmacyProfileCatalogCategoryView,
  PharmacyProfileCatalogSubcategoryView,
} from "../entities/pharmacy-profile-catalog.types";
import type { ProductRecord } from "@/features/product/entities/product.entity";
import { PharmacyCategoryIcon } from "./PharmacyCategoryIcon";

const text = {
  sections: "\u0623\u0642\u0633\u0627\u0645 \u0627\u0644\u0635\u064a\u062f\u0644\u064a\u0629",
  manage: "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0635\u064a\u062f\u0644\u064a\u0629",
};

export function isPharmacyProfileBucket(activeSubTab?: {
  categoryId: string;
  productSubcategoryId: string;
} | null) {
  return activeSubTab?.categoryId === "20" && activeSubTab.productSubcategoryId === "204";
}

export function pharmacyProductSubcategoryId(product: ProductRecord): string {
  return product.pharmacyCatalog.subcategoryId || product.pharmacySpecs.pharmacySubcategoryId || "";
}

export function PharmacyNestedTabs({
  uid,
  mode,
  products,
  onFilteredProductsChange,
  onRefreshProducts,
}: {
  uid: string;
  mode: "edit" | "preview";
  products: ProductRecord[];
  onFilteredProductsChange: (products: ProductRecord[]) => void;
  onRefreshProducts?: () => void | Promise<void>;
}) {
  const [catalog, setCatalog] = React.useState<PharmacyProfileCatalogView | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const showManagement = mode === "edit";

  const load = React.useCallback(async () => {
    if (!uid) return;
    setBusy(true);
    try {
      setCatalog(await pharmacyProfileCatalogApi.list(uid, showManagement));
    } finally {
      setBusy(false);
    }
  }, [showManagement, uid]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const categories = React.useMemo(
    () =>
      (catalog?.categories ?? [])
        .filter((item) => showManagement || item.status !== "hidden")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [catalog?.categories, showManagement],
  );

  React.useEffect(() => {
    if (!categories.length) {
      setSelectedCategoryId("");
      setSelectedSubcategoryId("");
      return;
    }
    if (!categories.some((item) => item.id === selectedCategoryId)) {
      setSelectedCategoryId(categories[0]!.id);
    }
  }, [categories, selectedCategoryId]);

  const subcategories = React.useMemo(
    () =>
      (catalog?.subcategories ?? [])
        .filter((item) => item.parentCategoryId === selectedCategoryId)
        .filter((item) => showManagement || item.status !== "hidden")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [catalog?.subcategories, selectedCategoryId, showManagement],
  );

  React.useEffect(() => {
    if (!subcategories.length) {
      setSelectedSubcategoryId("");
      return;
    }
    if (!subcategories.some((item) => item.id === selectedSubcategoryId)) {
      setSelectedSubcategoryId(subcategories[0]!.id);
    }
  }, [selectedSubcategoryId, subcategories]);

  React.useEffect(() => {
    onFilteredProductsChange(
      selectedSubcategoryId
        ? products.filter((product) => pharmacyProductSubcategoryId(product) === selectedSubcategoryId)
        : products,
    );
  }, [onFilteredProductsChange, products, selectedSubcategoryId]);

  const activeCategory = categories.find((item) => item.id === selectedCategoryId) ?? categories[0];
  const managerHref = `/profile/pharmacy-catalog?${new URLSearchParams({
    uid,
    categoryId: selectedCategoryId,
    subcategoryId: selectedSubcategoryId,
  }).toString()}`;

  if (!catalog) return null;

  return (
    <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-low p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-on-surface">{text.sections}</div>
        {showManagement ? (
          <Link
            href={managerHref}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface transition hover:border-primary hover:text-primary"
          >
            <Settings2 className="h-4 w-4" />
            {text.manage}
          </Link>
        ) : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((category) => (
          <PharmacyTabButton
            key={category.id}
            item={category}
            selected={category.id === selectedCategoryId}
            icon={category.icon}
            onClick={() => setSelectedCategoryId(category.id)}
          />
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {subcategories.map((subcategory) => (
          <PharmacyTabButton
            key={subcategory.id}
            item={subcategory}
            selected={subcategory.id === selectedSubcategoryId}
            icon={activeCategory?.icon ?? "fas fa-pills"}
            compact
            onClick={() => setSelectedSubcategoryId(subcategory.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PharmacyTabButton({
  item,
  selected,
  icon,
  compact = false,
  onClick,
}: {
  item: PharmacyProfileCatalogCategoryView | PharmacyProfileCatalogSubcategoryView;
  selected: boolean;
  icon: string;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-w-fit items-center gap-2 rounded-md border px-3 font-semibold transition ${
        compact ? "h-8 text-[11px]" : "h-9 text-[11px]"
      } ${
        selected
          ? "border-primary bg-primary text-on-primary"
          : item.status === "hidden"
            ? "border-error/40 bg-error/10 text-error"
            : "border-outline-variant bg-surface text-on-surface hover:border-primary/50"
      }`}
    >
      <PharmacyCategoryIcon icon={icon} className="h-4 w-4 text-center" />
      <span className="whitespace-nowrap">{item.nameAr}</span>
    </button>
  );
}
