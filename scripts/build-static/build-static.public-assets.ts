import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { withoutVsCodeDebuggerEnv } from "../child-process-env";
import {
  CAPACITOR_API_BASE_URL,
  CAPACITOR_NOTIFICATIONS_BASE_URL,
  CAPACITOR_ORDERS_BASE_URL,
  CAPACITOR_PRODUCTS_BASE_URL,
  CAPACITOR_PROFILES_BASE_URL,
} from "../../platform/capacitor.defaults";
import { categoryService } from "../../src/features/categories";
import { auditCapacitorDefaultBundle } from "../lib/capacitor-defaults-audit";
import {
  CAPABILITY_METADATA_FILE,
  scanSourceCapabilityReferences,
  splitCapabilityRequirements,
} from "../ota/ota-capability-scan";
import {
  CURRENT_NATIVE_APP_VERSION,
  CURRENT_WEB_CONTENT_VERSION,
} from "../../src/core/config/app-version";

import { rootOutDir } from "./build-static.runtime-config";

export function auditGeneratedStaticRoutes(): void {
  console.log(
    "🔍 Auditing generated static routes against categories registry...",
  );
  const missingRoutes: string[] = [];

  // 1. Check Categories & Sellers
  const categoryIds = new Set<number>();
  for (const category of categoryService.getMainCategories()) {
    categoryIds.add(category.id);
  }
  for (const collection of categoryService.getCollections()) {
    for (const item of collection.items) {
      categoryIds.add(item.id);
    }
  }

  for (const categoryId of categoryIds) {
    const categoryPath = path.join(
      rootOutDir,
      "categories",
      String(categoryId),
      "index.html",
    );
    if (!existsSync(categoryPath)) {
      missingRoutes.push(`/categories/${categoryId}`);
    }

    // Sellers pages for this category
    const tree = categoryService.getCategoryTree(categoryId);
    if (tree) {
      for (const subcategory of tree.subcategories) {
        const sellerPath = path.join(
          rootOutDir,
          "categories",
          String(categoryId),
          "sellers",
          String(subcategory.originalId),
          "index.html",
        );
        if (!existsSync(sellerPath)) {
          missingRoutes.push(
            `/categories/${categoryId}/sellers/${subcategory.originalId}`,
          );
        }
      }
    }
  }

  // 2. Check Doctor Appointment Specialties (under Category 20)
  const medicalCategory = categoryService.getCategoryTree(20);
  if (medicalCategory && medicalCategory.doctorAppointmentItems) {
    for (const specialty of medicalCategory.doctorAppointmentItems) {
      const docPath = path.join(
        rootOutDir,
        "categories",
        "20",
        "doctor-appointment",
        String(specialty.originalId),
        "index.html",
      );
      if (!existsSync(docPath)) {
        missingRoutes.push(
          `/categories/20/doctor-appointment/${specialty.originalId}`,
        );
      }
    }
  }

  // 3. Check Collections
  for (const collection of categoryService.getCollections()) {
    const collectionPath = path.join(
      rootOutDir,
      "collections",
      String(collection.id),
      "index.html",
    );
    if (!existsSync(collectionPath)) {
      missingRoutes.push(`/collections/${collection.id}`);
    }
  }

  if (missingRoutes.length > 0) {
    console.error("\n❌ STATIC BUILD AUDIT FAILED!");
    console.error("The following expected static routes were not generated:");
    for (const route of missingRoutes) {
      console.error(`  - ${route}`);
    }
    console.error(
      "\nThis happens if page.tsx components do not generate params for these routes in generateStaticParams().",
    );
    console.error("Please check generateStaticParams() under:");
    console.error("  - src/app/categories/[categoryId]/page.tsx");
    console.error(
      "  - src/app/categories/[categoryId]/sellers/[subcategoryId]/page.tsx",
    );
    console.error(
      "  - src/app/categories/[categoryId]/doctor-appointment/[specialtyId]/page.tsx",
    );
    console.error("  - src/app/collections/[collectionId]/page.tsx\n");
    throw new Error(
      `Static build audit failed: ${missingRoutes.length} routes are missing.`,
    );
  }

  console.log(
    "✅ Static build audit passed. All registered category/sellers/doctor pages were generated successfully!",
  );
}
