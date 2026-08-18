"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, PackagePlus, Pencil, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
import { useTranslation } from "@/lib/i18n";
import { pharmacyProfileCatalogApi } from "../services/pharmacy-profile-catalog-api";
import {
  PHARMACY_MAIN_CATEGORY_ID,
  PHARMACY_SUBCATEGORY_ID,
  type PharmacyProfileCatalogCategoryView,
  type PharmacyProfileCatalogProductView,
  type PharmacyProfileCatalogSubcategoryView,
  type PharmacyProfileCatalogView,
} from "../entities/pharmacy-profile-catalog.types";
import { PharmacyCategoryIcon } from "./PharmacyCategoryIcon";

import { text, CreateCategoryDialog, IconButton, ManagerColumn, ProductManagerCard, StatusBadge, VisibilityButton, LoadingFrame, MessageFrame } from "./catalog-manager/PharmacyCatalogManagerPage.dialogs";

export function PharmacyCatalogManagerPage() {
  const { formatApiError } = useTranslation();
  const searchParams = useSearchParams();
  const requestedUid = searchParams.get("uid") ?? "";
  const { session, isLoading } = useSession();
  const uid = requestedUid || session?.uid || "";
  const allowed = Boolean(session?.uid && (session.uid === uid || isSuperAdmin(session)));
  const [catalog, setCatalog] = React.useState<PharmacyProfileCatalogView | null>(null);
  const [activeCategoryId, setActiveCategoryId] = React.useState(searchParams.get("categoryId") ?? "");
  const [activeSubcategoryId, setActiveSubcategoryId] = React.useState(searchParams.get("subcategoryId") ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [editDialog, setEditDialog] = React.useState<
    | { mode: "create"; kind: "category" | "subcategory" }
    | {
        mode: "edit";
        kind: "category";
        item: PharmacyProfileCatalogCategoryView;
      }
    | {
        mode: "edit";
        kind: "subcategory";
        item: PharmacyProfileCatalogSubcategoryView;
      }
    | null
  >(null);
  const [editName, setEditName] = React.useState("");

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
    () => [...(catalog?.categories ?? [])].sort((left, right) => left.sortOrder - right.sortOrder),
    [catalog?.categories],
  );
  const subcategories = React.useMemo(
    () =>
      (catalog?.subcategories ?? [])
        .filter((item) => item.parentCategoryId === activeCategoryId)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [activeCategoryId, catalog?.subcategories],
  );
  const products = React.useMemo(
    () =>
      (catalog?.products ?? [])
        .filter((item) => item.parentSubcategoryId === activeSubcategoryId)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [activeSubcategoryId, catalog?.products],
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

  async function run(action: () => Promise<PharmacyProfileCatalogView>) {
    setBusy(true);
    try {
      setCatalog(await action());
    } finally {
      setBusy(false);
    }
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

  async function submitEditDialog() {
    const nameAr = editName.trim();
    if (!nameAr || !editDialog) return;
    if (editDialog.mode === "create" && editDialog.kind === "category") {
      await run(() => pharmacyProfileCatalogApi.createCategory(uid, nameAr));
      setEditDialog(null);
      setEditName("");
      return;
    }
    if (editDialog.mode === "create" && editDialog.kind === "subcategory") {
      if (!activeCategoryId) return;
      await run(() =>
        pharmacyProfileCatalogApi.createSubcategory(uid, activeCategoryId, nameAr),
      );
      setEditDialog(null);
      setEditName("");
      return;
    }
    if (editDialog.mode !== "edit") return;
    if (editDialog.kind === "category") {
      await run(() =>
        pharmacyProfileCatalogApi.updateCategory(uid, editDialog.item.id, nameAr),
      );
    } else {
      await run(() =>
        pharmacyProfileCatalogApi.updateSubcategory(
          uid,
          editDialog.item.id,
          editDialog.item.parentCategoryId,
          nameAr,
        ),
      );
    }
    setEditDialog(null);
    setEditName("");
  }

  async function toggleCategory(category: PharmacyProfileCatalogCategoryView) {
    await run(() =>
      pharmacyProfileCatalogApi.setCategoryStatus(
        uid,
        category.id,
        category.status === "hidden" ? "visible" : "hidden",
      ),
    );
  }

  async function toggleSubcategory(subcategory: PharmacyProfileCatalogSubcategoryView) {
    await run(() =>
      pharmacyProfileCatalogApi.setSubcategoryStatus(
        uid,
        subcategory.id,
        subcategory.parentCategoryId,
        subcategory.status === "hidden" ? "visible" : "hidden",
      ),
    );
  }

  async function toggleProduct(product: PharmacyProfileCatalogProductView) {
    await run(() =>
      pharmacyProfileCatalogApi.setProductStatus(
        uid,
        product.id,
        product.status === "hidden" ? "visible" : "hidden",
      ),
    );
  }

  const addProductHref = `/product?${new URLSearchParams({
    mode: "new",
    mainCategoryId: PHARMACY_MAIN_CATEGORY_ID,
    subcategoryId: PHARMACY_SUBCATEGORY_ID,
    pharmacyCategoryId: activeCategoryId,
    pharmacySubcategoryId: activeSubcategoryId,
    returnTo: "profile-products",
  }).toString()}`;

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
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary/90"
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
          <section className="grid min-h-[620px] overflow-hidden rounded-lg border border-outline-variant bg-surface lg:grid-cols-[300px_330px_1fr]">
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
                      : "border-outline-variant hover:border-primary/50"
                  } ${category.status === "hidden" ? "opacity-55" : ""}`}
                >
                  <button
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
                    onClick={() => void toggleCategory(category)}
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
                      : "border-outline-variant hover:border-tertiary/50"
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
                    onClick={() => void toggleSubcategory(subcategory)}
                  />
                </div>
              ))}
            </ManagerColumn>

            <ManagerColumn title={text.products} disabled={busy}>
              {products.length === 0 ? (
                <p className="rounded-lg border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">
                  {text.emptyProducts}
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductManagerCard
                      key={product.id}
                      product={product}
                      disabled={busy}
                      onToggle={() => void toggleProduct(product)}
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
          onSubmit={() => void submitEditDialog()}
        />
      ) : null}
    </main>
  );
}
