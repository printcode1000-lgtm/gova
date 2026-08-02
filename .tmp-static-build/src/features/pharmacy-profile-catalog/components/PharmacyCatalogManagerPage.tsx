"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, PackagePlus, Pencil, Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useSession } from "@/features/auth/components/SessionProvider";
import { isSuperAdmin } from "@/features/auth/utils/super-admin";
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

const text = {
  title: "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0635\u064a\u062f\u0644\u064a\u0629",
  subtitle:
    "\u0623\u062f\u0631 \u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0648\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u0635\u064a\u062f\u0644\u064a\u062a\u0643.",
  back: "\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0628\u0631\u0648\u0641\u0627\u064a\u0644",
  mainCategories: "\u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
  subcategories: "\u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0627\u0644\u0641\u0631\u0639\u064a\u0629",
  products: "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
  addMain: "\u0625\u0636\u0627\u0641\u0629 \u0631\u0626\u064a\u0633\u064a",
  addSub: "\u0625\u0636\u0627\u0641\u0629 \u0641\u0631\u0639\u064a",
  addProduct: "\u0625\u0636\u0627\u0641\u0629 \u0645\u0646\u062a\u062c \u062c\u062f\u064a\u062f",
  addMainTitle:
    "\u0625\u0636\u0627\u0641\u0629 \u062a\u0635\u0646\u064a\u0641 \u0631\u0626\u064a\u0633\u064a",
  addSubTitle:
    "\u0625\u0636\u0627\u0641\u0629 \u062a\u0635\u0646\u064a\u0641 \u0641\u0631\u0639\u064a",
  editMainTitle:
    "\u062a\u0639\u062f\u064a\u0644 \u062a\u0635\u0646\u064a\u0641 \u0631\u0626\u064a\u0633\u064a",
  editSubTitle:
    "\u062a\u0639\u062f\u064a\u0644 \u062a\u0635\u0646\u064a\u0641 \u0641\u0631\u0639\u064a",
  nameLabel: "\u0627\u0644\u0627\u0633\u0645",
  mainNamePlaceholder:
    "\u0627\u0633\u0645 \u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u0631\u0626\u064a\u0633\u064a",
  subNamePlaceholder:
    "\u0627\u0633\u0645 \u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u0641\u0631\u0639\u064a",
  cancel: "\u0625\u0644\u063a\u0627\u0621",
  save: "\u062d\u0641\u0638",
  edit: "\u062a\u0639\u062f\u064a\u0644",
  emptyProducts:
    "\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u0646\u062a\u062c\u0627\u062a \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u0641\u0631\u0639\u064a.",
  hidden: "\u0645\u062e\u0641\u064a",
  visible: "\u0638\u0627\u0647\u0631",
  restore: "\u0627\u0633\u062a\u0639\u0627\u062f\u0629",
  hide: "\u0625\u062e\u0641\u0627\u0621",
  noAccess: "\u0644\u0627 \u064a\u0645\u0643\u0646\u0643 \u0625\u062f\u0627\u0631\u0629 \u0635\u064a\u062f\u0644\u064a\u0629 \u0645\u0633\u062a\u062e\u062f\u0645 \u0622\u062e\u0631.",
  loginRequired:
    "\u064a\u062c\u0628 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0644\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0635\u064a\u062f\u0644\u064a\u0629.",
};

export function PharmacyCatalogManagerPage() {
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
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setBusy(false);
    }
  }, [allowed, uid]);

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

function CreateCategoryDialog({
  dialog,
  value,
  disabled,
  onChange,
  onClose,
  onSubmit,
}: {
  dialog:
    | { mode: "create"; kind: "category" | "subcategory" }
    | { mode: "edit"; kind: "category"; item: PharmacyProfileCatalogCategoryView }
    | { mode: "edit"; kind: "subcategory"; item: PharmacyProfileCatalogSubcategoryView };
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const title =
    dialog.mode === "create"
      ? dialog.kind === "category"
        ? text.addMainTitle
        : text.addSubTitle
      : dialog.kind === "category"
        ? text.editMainTitle
        : text.editSubTitle;
  const placeholder = dialog.kind === "category" ? text.mainNamePlaceholder : text.subNamePlaceholder;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <form
        className="w-full max-w-md rounded-lg border border-outline-variant bg-surface p-4 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <h2 className="text-base font-bold text-on-surface">{title}</h2>
        <label className="mt-4 block space-y-1.5 text-sm font-semibold text-on-surface">
          <span>{text.nameLabel}</span>
          <input
            autoFocus
            value={value}
            maxLength={120}
            disabled={disabled}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-outline-variant bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onClose}
            className="h-9 rounded-lg border border-outline-variant px-4 text-xs font-semibold text-on-surface hover:border-primary disabled:opacity-60"
          >
            {text.cancel}
          </button>
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-on-primary disabled:opacity-60"
          >
            {text.save}
          </button>
        </div>
      </form>
    </div>
  );
}

function IconButton({
  title,
  disabled,
  onClick,
  children,
}: {
  title: string;
  disabled?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-50"
      title={title}
    >
      {children}
    </button>
  );
}

function ManagerColumn({
  title,
  actionLabel,
  disabled,
  onAdd,
  children,
}: {
  title: string;
  actionLabel?: string;
  disabled?: boolean;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-3 border-b border-outline-variant p-3 lg:border-b-0 lg:border-e">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-on-surface">{title}</h2>
        {actionLabel && onAdd ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onAdd}
            className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2 text-[11px] font-semibold text-on-primary disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pe-1">{children}</div>
    </div>
  );
}

function ProductManagerCard({
  product,
  disabled,
  onToggle,
}: {
  product: PharmacyProfileCatalogProductView;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <article className={`rounded-lg border border-outline-variant bg-surface-container-low p-2 ${product.status === "hidden" ? "opacity-55" : ""}`}>
      <div className="flex gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-surface-bright">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.nameAr} fill className="object-cover" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-xs font-semibold text-on-surface">{product.nameAr}</p>
          <p className="mt-1 truncate text-[10px] text-on-surface-variant">{product.nameEn}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <StatusBadge hidden={product.status === "hidden"} />
            <VisibilityButton hidden={product.status === "hidden"} disabled={disabled} onClick={onToggle} />
          </div>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ hidden }: { hidden: boolean }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${hidden ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
      {hidden ? text.hidden : text.visible}
    </span>
  );
}

function VisibilityButton({
  hidden,
  disabled,
  onClick,
}: {
  hidden: boolean;
  disabled?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-50"
      title={hidden ? text.restore : text.hide}
    >
      {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </button>
  );
}

function LoadingFrame({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${compact ? "min-h-[360px]" : "min-h-screen"}`}>
      <LoadingSpinner size="lg" />
    </div>
  );
}

function MessageFrame({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <p className="rounded-lg border border-outline-variant bg-surface p-5 text-center text-sm text-on-surface">
        {message}
      </p>
    </main>
  );
}
