import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const preview = source(
  "src/features/profile/presentation/ProfilePreviewContent.tsx",
);
const productGrid = source(
  "src/features/profile-products/presentation/ProfileProductsGrid.tsx",
);
const productCard = source(
  "packages/product-card-core/src/presentation/ProductCard.tsx",
);
const sellerDiscounts = source(
  "src/features/seller-discounts/presentation/SellerDiscountsPreview.tsx",
);
const workingHours = source(
  "src/features/profile-working-hours/presentation/WorkingHoursCard.tsx",
);
const fulfillment = source(
  "src/features/profile/presentation/ProfilePreviewInformation.tsx",
);
const reviews = source("src/features/product/presentation/ProductReviews.tsx");

assert.match(
  preview,
  /data-snapshot-id="profile-preview-root"[\s\S]*?className="[^"]*min-w-0[^"]*space-y-5[^"]*overflow-x-clip/,
);
assert.match(
  preview,
  /className="grid min-w-0 grid-cols-2 items-center gap-2 min-\[360px\]:grid-cols-3 sm:flex sm:flex-wrap"/,
);
assert.match(preview, /<FollowButton[\s\S]*?className="w-full sm:w-auto"/);
assert.match(preview, /const PROFILE_ACTION_TILE_CLASS = `\$\{ACTION_TILE_CLASS\} w-full border-input sm:w-auto`/);
assert.match(preview, /className="mx-2 mt-3 min-w-0 border-b/);
assert.match(preview, /className="flex min-w-0 items-start gap-3 sm:gap-4"/);

assert.match(productGrid, /className="grid min-w-0 grid-cols-2/);
assert.match(productGrid, /variant=\{showManagement \? "profile-edit" : "profile-preview"\}[\s\S]*?className="min-w-0"/);
assert.match(productCard, /className=\{`relative min-w-0 overflow-hidden/);
assert.match(productCard, /line-clamp-2 min-h-\[32px\] break-words/);
assert.match(productCard, /min-w-0 break-words text-xs font-bold text-primary/);

assert.match(sellerDiscounts, /className="mx-2 min-w-0 rounded-3xl/);
assert.match(sellerDiscounts, /className="mt-2 inline-flex max-w-full break-all/);
assert.match(workingHours, /className="min-w-0 space-y-4 rounded-xl/);
assert.match(fulfillment, /className="min-w-0 rounded-3xl/);
assert.match(fulfillment, /className="mt-4 whitespace-pre-wrap break-words/);
assert.match(reviews, /className="min-w-0 space-y-5"/);
assert.match(reviews, /className="mt-3 whitespace-pre-wrap break-words"/);

console.log("Profile preview responsive layout tests passed.");
