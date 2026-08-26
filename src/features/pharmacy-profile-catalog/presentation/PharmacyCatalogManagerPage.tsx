"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, PackagePlus, Pencil, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/shared/ui/LoadingSpinner";
import { useSessionRuntime } from "@/shared/session-runtime";
import { isSuperAdminSession } from "@asol/auth-core";
import { usePageSaveOperationScope } from "@/features/page-save/ui";
import { useTranslation } from "@/shared/i18n";
import { pharmacyProfileCatalogApi } from "../application/services/pharmacy-profile-catalog-api";
import {
  type PharmacyProfileCatalogCategoryView,
  type PharmacyProfileCatalogProductView,
  type PharmacyProfileCatalogSubcategoryView,
  type PharmacyProfileCatalogView,
} from "../domain/pharmacy-profile-catalog.types";
import { PharmacyCategoryIcon } from "./PharmacyCategoryIcon";

import { text, CreateCategoryDialog, IconButton, ManagerColumn, ProductManagerCard, StatusBadge, VisibilityButton, LoadingFrame, MessageFrame } from "./catalog-manager/PharmacyCatalogManagerPage.dialogs";
import { uiAttributes, type UiDescriptor } from "@asol/ui-registry-core";
import {
  buildAddPharmacyProductHref,
  sortedPharmacyCategories,
  sortedPharmacyProducts,
  sortedPharmacySubcategories,
  type PharmacyCatalogEditDialog,
} from "./catalog-manager/PharmacyCatalogManagerPage.model";


const PHARMACY_TOGGLE_UI: UiDescriptor = { uid: "pharmacy-toggle-l9ZwPk", id: "pharmacy-toggle", kind: "item", interaction: { type: "toggle" }, simulation: { kind: "list-item", id: "pharmacy-toggle" } };
export function PharmacyCatalogManagerPage() {
  const { formatApiError } = useTranslation();
  const searchParams = useSearchParams();
  const requestedUid = searchParams.get("uid") ?? "";
  const { session, isLoading } = useSessionRuntime();
  const uid = requestedUid || session?.uid || "";
  const allowed = Boolean(session?.uid && (session.uid === uid || isSuperAdminSession(session)));
  const [catalog, setCatalog] = React.useState<PharmacyProfileCatalogView | null>(null);
  const [activeCategoryId, setActiveCategoryId] = React.useState(searchParams.get("categoryId") ?? "");
  const [activeSubcategoryId, setActiveSubcategoryId] = React.useState(searchParams.get("subcategoryId") ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [editDialog, setEditDialog] = React.useState<PharmacyCatalogEditDialog | null>(null);
  const [editName, setEditName] = React.useState("");

  const catalogOperations = usePageSaveOperationScope({
    id: "pharmacy-catalog-manager",
    label: text.title,
    returnPath: `/profile/pharmacy-catalog?uid=${encodeURIComponent(uid)}`,
    enabled: allowed && Boolean(uid),
  });

  const load = React.useCallback(async () => {
    if (!uid || !allowed) return;
    setBusy(true);
    setError("");
    try {
      setCatalog(await pharmacyProfileCatalogApi.list(uid, true));
    } catch (loadError) {
      setError(formatApiError(loadError));
    } finally {
      setBusy(false);
    }
  }, [allowed, formatApiError, uid]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const categories = React.useMemo(
    () => sortedPharmacyCategories(catalog),
    [catalog],
  );
  const subcategories = React.useMemo(
    () => sortedPharmacySubcategories(catalog, activeCategoryId),
    [activeCategoryId, catalog],
  );
  const products = React.useMemo(
    () => sortedPharmacyProducts(catalog, activeSubcategoryId),
    [activeSubcategoryId, catalog],
  );
  const activeCategory = categories.find((item) => item.id === activeCategoryId) ?? categories[0];

  React.useEffect(() => {
    if (!categories.length) return;
    if (!categories.some((item) => item.id === activeCategoryId)) {
      setActiveCategoryId(categories[0]!.id);
    }
  }, [activeCategoryId, categories]);

  React.useEffect(() => {
    if (!subcategories.length) {
      setActiveSubcategoryId("");
      return;
    }
    if (!subcategories.some((item) => item.id === activeSubcategoryId)) {
      setActiveSubcategoryId(subcategories[0]!.id);
    }
  }, [activeSubcategoryId, subcategories]);

  /**
   * Every catalog write is staged; `@asol/page-save-core` runs it from the
   * header save dialog so this page owns no save button.
   */
  function stage(
    itemId: string,
    label: string,
    action: () => Promise<PharmacyProfileCatalogView>,
  ) {
    catalogOperations.stage({
      itemId,
      kind: "save",
      label,
      execute: async () => {
        setBusy(true);
        setError("");
        try {
          setCatalog(await action());
          return true;
        } catch (actionError) {
          setError(formatApiError(actionError));
          return false;
        } finally {
          setBusy(false);
        }
      },
    });
  }

  function openCreateCategory() {
    setEditName("");
    setEditDialog({ mode: "create", kind: "category" });
  }

  function openCreateSubcategory() {
    if (!activeCategoryId) return;
    setEditName("");
    setEditDialog({ mode: "create", kind: "subcategory" });
  }

  function openEditCategory(category: PharmacyProfileCatalogCategoryView) {
    setEditName(category.nameAr);
    setEditDialog({ mode: "edit", kind: "category", item: category });
  }

  function openEditSubcategory(subcategory: PharmacyProfileCatalogSubcategoryView) {
    setEditName(subcategory.nameAr);
    setEditDialog({ mode: "edit", kind: "subcategory", item: subcategory });
  }

  function stageEditDialog() {
    const nameAr = editName.trim();
    if (!nameAr || !editDialog) return;
    if (editDialog.mode === "create") {
      if (editDialog.kind === "category") {
        stage(
          `pharmacy-create-category:${nameAr}`,
          `${text.addMainTitle}: ${nameAr}`,
          () => pharmacyProfileCatalogApi.createCategory(uid, nameAr),
        );
      } else {
        if (!activeCategoryId) return;
        const parentCategoryId = activeCategoryId;
        stage(
          `pharmacy-create-subcategory:${parentCategoryId}:${nameAr}`,
          `${text.addSubTitle}: ${nameAr}`,
          () =>
            pharmacyProfileCatalogApi.createSubcategory(
              uid,
              parentCategoryId,
              nameAr,
            ),
        );
      }
    } else if (editDialog.kind === "category") {
      const categoryId = editDialog.item.id;
      stage(
        `pharmacy-rename-category:${categoryId}`,
        `${text.editMainTitle}: ${nameAr}`,
        () => pharmacyProfileCatalogApi.updateCategory(uid, categoryId, nameAr),
      );
    } else {
      const { id: subcategoryId, parentCategoryId } = editDialog.item;
      stage(
        `pharmacy-rename-subcategory:${subcategoryId}`,
        `${text.editSubTitle}: ${nameAr}`,
        () =>
          pharmacyProfileCatalogApi.updateSubcategory(
            uid,
            subcategoryId,
            parentCategoryId,
            nameAr,
          ),
      );
    }
    setEditDialog(null);
    setEditName("");
  }

  function statusLabel(status: string): string {
    return status === "hidden" ? text.restore : text.hide;
  }

  function toggleCategory(category: PharmacyProfileCatalogCategoryView) {
    const nextStatus = category.status === "hidden" ? "visible" : "hidden";
    stage(
      `pharmacy-category-status:${category.id}`,
      `${statusLabel(category.status)}: ${category.nameAr}`,
      () =>
        pharmacyProfileCatalogApi.setCategoryStatus(uid, category.id, nextStatus),
    );
  }

  function toggleSubcategory(subcategory: PharmacyProfileCatalogSubcategoryView) {
    const nextStatus = subcategory.status === "hidden" ? "visible" : "hidden";
    stage(
      `pharmacy-subcategory-status:${subcategory.id}`,
      `${statusLabel(subcategory.status)}: ${subcategory.nameAr}`,
      () =>
        pharmacyProfileCatalogApi.setSubcategoryStatus(
          uid,
          subcategory.id,
          subcategory.parentCategoryId,
          nextStatus,
        ),
    );
  }

  function toggleProduct(product: PharmacyProfileCatalogProductView) {
    const nextStatus = product.status === "hidden" ? "visible" : "hidden";
    stage(
      `pharmacy-product-status:${product.id}`,
      `${statusLabel(product.status)}: ${product.nameAr}`,
      () => pharmacyProfileCatalogApi.setProductStatus(uid, product.id, nextStatus),
    );
  }

  const addProductHref = buildAddPharmacyProductHref({
    activeCategoryId,
    activeSubcategoryId,
  });

  if (isLoading) {
    return <LoadingFrame />;
  }

  if (!session?.uid) {
    return <MessageFrame message={text.loginRequired} />;
  }

  if (!allowed) {
    return <MessageFrame message={text.noAccess} />;
  }

  return (
    <main className="min-h-screen bg-background px-4 py-5">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-4">
          <div>
            <Link
              href="/profile?mode=edit&tab=products"
              className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-primary"
            >
              <ArrowRight className="h-4 w-4" />
              {text.back}
            </Link>
            <h1 className="text-2xl font-bold text-on-surface">{text.title}</h1>
            <p className="mt-1 text-sm text-on-surface-variant">{text.subtitle}</p>
          </div>
          <Link
            href={addProductHref}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition"
          >
            <PackagePlus className="h-4 w-4" />
            {text.addProduct}
          </Link>
        </header>

        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {!catalog && busy ? (
          <LoadingFrame compact />
        ) : (
          <section {...uiAttributes({ uid: "pharmacy-catalog-empty-fYw1eB", id: "pharmacy-catalog-empty", kind: "region", simulation: { kind: "state", id: "pharmacy-catalog-empty" } })}
            className="grid min-h-[620px] overflow-hidden rounded-lg border border-outline-variant bg-surface lg:grid-cols-[300px_330px_1fr]"
          >
            <ManagerColumn
              title={text.mainCategories}
              actionLabel={text.addMain}
              disabled={busy}
              onAdd={openCreateCategory}
            >
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-start text-xs transition ${
                    category.id === activeCategoryId
                      ? "border-primary bg-primary/10"
                      : "border-outline-variant"
                  } ${category.status === "hidden" ? "opacity-55" : ""}`}
                >
                  <button {...uiAttributes({ uid: "pharmacy-category-06QfVC", id: "pharmacy-category", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "pharmacy-category" } })}
                    type="button"
                    onClick={() => setActiveCategoryId(category.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-start"
                  >
                    <PharmacyCategoryIcon icon={category.icon} className="h-4 w-4 text-center text-primary" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{category.nameAr}</span>
                  <StatusBadge hidden={category.status === "hidden"} />
                  </button>
                  <IconButton
                    title={text.edit}
                    disabled={busy}
                    onClick={() => openEditCategory(category)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </IconButton>
                  <VisibilityButton
                    hidden={category.status === "hidden"}
                    disabled={busy}
                    onClick={() => toggleCategory(category)}
                  />
                </div>
              ))}
            </ManagerColumn>

            <ManagerColumn
              title={text.subcategories}
              actionLabel={text.addSub}
              disabled={busy || !activeCategoryId}
              onAdd={openCreateSubcategory}
            >
              {subcategories.map((subcategory) => (
                <div
                  key={subcategory.id}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-start text-xs transition ${
                    subcategory.id === activeSubcategoryId
                      ? "border-tertiary bg-tertiary/10"
                      : "border-outline-variant"
                  } ${subcategory.status === "hidden" ? "opacity-55" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveSubcategoryId(subcategory.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-start"
                  >
                    <PharmacyCategoryIcon icon={activeCategory?.icon} className="h-4 w-4 text-center text-tertiary" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{subcategory.nameAr}</span>
                  <StatusBadge hidden={subcategory.status === "hidden"} />
                  </button>
                  <IconButton
                    title={text.edit}
                    disabled={busy}
                    onClick={() => openEditSubcategory(subcategory)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </IconButton>
                  <VisibilityButton
                    hidden={subcategory.status === "hidden"}
                    disabled={busy}
                    onClick={() => toggleSubcategory(subcategory)}
                  />
                </div>
              ))}
            </ManagerColumn>

            <ManagerColumn title={text.products} disabled={busy}>
              {products.length === 0 ? (
                <p {...uiAttributes({ uid: "pharmacy-products-empty-BrW6Lv", id: "pharmacy-products-empty", kind: "region", simulation: { kind: "state", id: "pharmacy-products-empty" } })} className="rounded-lg border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">
                  {text.emptyProducts}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductManagerCard
                      key={product.id}
                      product={product}
                      disabled={busy}
                      onToggle={() => toggleProduct(product)}
                      toggleUi={PHARMACY_TOGGLE_UI}
                    />
                  ))}
                </div>
              )}
            </ManagerColumn>
          </section>
        )}
      </div>
      {editDialog ? (
        <CreateCategoryDialog
          dialog={editDialog}
          value={editName}
          disabled={busy}
          onChange={setEditName}
          onClose={() => {
            setEditDialog(null);
            setEditName("");
          }}
          onSubmit={stageEditDialog}
        />
      ) : null}
    </main>
  );
}
