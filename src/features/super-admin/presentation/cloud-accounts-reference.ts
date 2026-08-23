/**
 * Cloud-accounts page reference data.
 *
 * Vercel rows are built from `@asol/account-declarations` so adding an account
 * without updating this file fails when display metadata is incomplete.
 * R2 rows come from `@asol/storage-core` plus the explicit OTA bucket (OTA is
 * not in the storage account registry). Turso has no code registry — this
 * file is the SSOT the page and `test:cloud-accounts` share.
 */

import {
  ACCOUNT_DECLARATIONS,
  type AccountDeclaration,
} from "@asol/account-declarations";
import { getAllStorageAccounts } from "@asol/storage-core";

export type VercelCloudAccountRow = {
  readonly name: AccountDeclaration["name"];
  readonly accountLabel: string;
  readonly project: string;
  readonly email: string;
  readonly servesAr: string;
  readonly githubConnected: boolean;
  readonly updatedByAr: string;
};

export type TursoCloudAccountRow = {
  readonly account: string;
  readonly email: string;
  readonly databases: number;
  readonly domainAr: string;
  readonly readByAr: string;
};

export type R2CloudAccountColumn = {
  readonly id: string;
  readonly columnLabelAr: string;
  readonly accountId: string;
  readonly email: string;
  readonly bucketName: string;
  readonly publicUrl: string;
  readonly envPrefixLabel: string;
  readonly targetLabel: string;
};

type VercelDisplay = {
  readonly accountLabel: string;
  readonly servesAr: string;
  readonly githubConnected: boolean;
  readonly updatedByAr?: string;
};

const VERCEL_DISPLAY: { readonly [K in AccountDeclaration["name"]]: VercelDisplay } = {
  gova: {
    accountLabel: "hesham-101",
    servesAr:
      "التطبيق الكامل: كل ما لم يُوجَّه للجسر — تفاصيل الطلب GET /api/orders/:id، تقييمات البروفايل، ولوحة السوبر أدمن",
    githubConnected: true,
    updatedByAr: "push إلى GitHub",
  },
  submain: {
    accountLabel: "submain",
    servesAr:
      "البحث في المنتجات والبائعين، إنشاء الطلب من السلة أو من البروفايل — /api/search/*، POST /api/orders/from-cart، POST /api/orders/custom-request-from-profile",
    githubConnected: false,
  },
  sub2main: {
    accountLabel: "sub2main",
    servesAr:
      "كتابات البائع: إنشاء/تعديل/حذف المنتجات، تحديث البروفايل والخصومات، رفع الصور، كتالوج الصيدلية — عبر جسر المتصفح فقط",
    githubConnected: false,
  },
  notifications: {
    accountLabel: "101-0902",
    servesAr: "توزيع الإشعارات فقط",
    githubConnected: false,
  },
  products: {
    accountLabel: "حساب المنتجات",
    servesAr: "قراءة المنتجات",
    githubConnected: false,
  },
  orders: {
    accountLabel: "حساب الطلبات",
    servesAr: "GET /api/orders (القائمة فقط)",
    githubConnected: false,
  },
  profiles: {
    accountLabel: "حساب البروفايلات",
    servesAr: "خمس قراءات بروفايل",
    githubConnected: false,
  },
};

const R2_COLUMN_LABELS: Record<string, string> = {
  general: "عام",
  products: "منتجات (قديم)",
  "products-apparel-pets": "ملابس + حيوانات",
  ota: "تحديثات OTA",
};

const R2_TARGET_LABELS: Record<string, string> = {
  general: "CloudflareR2",
  products: "CloudflareR2Products",
  "products-apparel-pets": "CloudflareR2_products-apparel-pets",
  ota: "ota (في R2_STORAGE_TARGETS)",
};

/** OTA is routed through R2_STORAGE_TARGETS, not the storage account registry. */
export const OTA_R2_CLOUD_ACCOUNT = {
  id: "ota",
  accountId: "21fce63d…1810",
  email: "tenderx.engineer100@gmail.com",
  bucketName: "ota",
  publicUrl: "https://pub-ee70bc6c84c54d9b8a8ba44c6f7820a9.r2.dev",
  envPrefix: "ASOL_OTA_R2",
} as const;

export const TURSO_CLOUD_ACCOUNTS: readonly TursoCloudAccountRow[] = [
  {
    account: "hesham101",
    email: "print.code.1000@gmail.com",
    databases: 3,
    domainAr: "المستخدمون والمصادقة، الإعلانات، عمليات النظام",
    readByAr: "gova + submain + sub2main",
  },
  {
    account: "hesham102",
    email: "bs.bid.story@gmail.com",
    databases: 1,
    domainAr: "الإشعارات",
    readByAr: "gova + asol-notifications",
  },
  {
    account: "hesham103",
    email: "gnagnahesham@gmail.com",
    databases: 1,
    domainAr: "المنتجات",
    readByAr: "gova + asol-products + sub2main",
  },
  {
    account: "hesham104",
    email: "tenderx10@gmail.com",
    databases: 9,
    domainAr: "شظايا طلبات السوق",
    readByAr: "gova + asol-orders + submain",
  },
  {
    account: "hesham105",
    email: "hesham10125@gmail.com",
    databases: 7,
    domainAr: "شظايا البروفايل",
    readByAr: "gova + asol-profiles + sub2main",
  },
] as const;

const ARABIC_COUNT_WORDS: Record<number, string> = {
  3: "ثلاثة",
  4: "أربعة",
  5: "خمسة",
  6: "ستة",
  7: "سبعة",
};

export function arabicAccountCountWord(count: number): string {
  return ARABIC_COUNT_WORDS[count] ?? String(count);
}

export function listVercelCloudAccounts(): readonly VercelCloudAccountRow[] {
  return (Object.values(ACCOUNT_DECLARATIONS) as AccountDeclaration[]).map((declaration) => {
    const display = VERCEL_DISPLAY[declaration.name];
    return {
      name: declaration.name,
      accountLabel: display.accountLabel,
      project: declaration.project,
      email: declaration.email,
      servesAr: display.servesAr,
      githubConnected: display.githubConnected,
      updatedByAr:
        display.updatedByAr ??
        (declaration.name === "gova" ? "push إلى GitHub" : `npm run ${declaration.name}:deploy`),
    };
  });
}

export function listR2CloudAccounts(): readonly R2CloudAccountColumn[] {
  const registryColumns = getAllStorageAccounts().map((account) => ({
    id: account.id,
    columnLabelAr: R2_COLUMN_LABELS[account.id] ?? account.id,
    accountId: account.accountId,
    email: account.email,
    bucketName: account.bucketName,
    publicUrl: account.publicUrl,
    envPrefixLabel: `${account.envPrefix}_*`,
    targetLabel: R2_TARGET_LABELS[account.id] ?? account.id,
  }));
  return [
    ...registryColumns,
    {
      id: OTA_R2_CLOUD_ACCOUNT.id,
      columnLabelAr: R2_COLUMN_LABELS.ota,
      accountId: OTA_R2_CLOUD_ACCOUNT.accountId,
      email: OTA_R2_CLOUD_ACCOUNT.email,
      bucketName: OTA_R2_CLOUD_ACCOUNT.bucketName,
      publicUrl: OTA_R2_CLOUD_ACCOUNT.publicUrl,
      envPrefixLabel: `${OTA_R2_CLOUD_ACCOUNT.envPrefix}_*`,
      targetLabel: R2_TARGET_LABELS.ota,
    },
  ];
}

export function cloudAccountsGlance() {
  const vercel = listVercelCloudAccounts().length;
  const turso = TURSO_CLOUD_ACCOUNTS.length;
  const r2 = listR2CloudAccounts().length;
  const tursoDatabases = TURSO_CLOUD_ACCOUNTS.reduce((sum, row) => sum + row.databases, 0);
  return {
    vercel,
    turso,
    r2,
    tursoDatabases,
    vercelWord: arabicAccountCountWord(vercel),
    tursoWord: arabicAccountCountWord(turso),
    r2Word: arabicAccountCountWord(r2),
  };
}

/**
 * Database count for one Turso account, for section titles that state it.
 *
 * A title like "hesham105 — 7 شظايا بروفايل" repeats a number this file already
 * holds. Two copies of one fact drift the moment a shard is added, and the page
 * then states a count the repository contradicts — which is the failure
 * `test:cloud-accounts` exists to prevent. The title asks for the number
 * instead of restating it.
 */
export function tursoDatabaseCount(account: string): number {
  const row = TURSO_CLOUD_ACCOUNTS.find((candidate) => candidate.account === account);
  if (!row) {
    throw new Error(
      `[cloud-accounts] no Turso account named "${account}". ` +
        `Known: ${TURSO_CLOUD_ACCOUNTS.map((r) => r.account).join(", ")}.`,
    );
  }
  return row.databases;
}
