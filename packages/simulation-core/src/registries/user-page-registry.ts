import {
  uiSimulationTarget,
  uiSimulationUidForSimulationId,
} from "@asol/ui-registry-core";

import type {
  PageInteractionDefinition,
  SimulationDriverAction,
  SimulationTarget,
  SimulationTargetKind,
  SimulationUserRole,
  UserPageDefinition,
} from "../domain/simulation.types";

type Actor = "guest" | SimulationUserRole | "any";
type FieldInput = Readonly<{ target: SimulationTarget; value: string }>;

/**
 * Resolves a declared scenario/event id to the registered element it names.
 *
 * Scenarios are still written in the vocabulary a person uses — "the checkout
 * button" — but what comes out is the uid, taken from the generated
 * UiSimulationRegistry. An id that no longer resolves throws here, at module
 * load, instead of failing later as a missing DOM element: a renamed control
 * breaks the scenario that depended on it, loudly and in one place.
 */
function target(kind: SimulationTargetKind, simulationId: string): SimulationTarget {
  const uid = uiSimulationUidForSimulationId(simulationId);
  if (!uid) {
    throw new Error(
      `simulationTargetNotRegistered:${kind}:${simulationId} — no UiRegistry descriptor declares this simulation id, or more than one does.`,
    );
  }
  const record = uiSimulationTarget(uid)!;
  if (kind !== "state" && !record.interaction) {
    throw new Error(
      `simulationTargetHasNoInteraction:${simulationId} (uid ${uid}) — add an interaction to its descriptor.`,
    );
  }
  return {
    targetUid: uid,
    interaction: record.interaction?.type ?? "tap",
    kind,
    simulationId,
  };
}

function eventTarget(id: string): SimulationTarget {
  return target("event", id);
}

function fieldTarget(id: string): SimulationTarget {
  return target("field", id);
}

function listItemTarget(id: string): SimulationTarget {
  return target("list-item", id);
}

function fileTarget(id: string): SimulationTarget {
  return target("file", id);
}

function stateTarget(id: string): SimulationTarget {
  return target("state", id);
}

/** Declares the real empty state that makes an interaction inapplicable here. */
function unavailableWhen(
  id: string,
  reason: string,
): { target: SimulationTarget; reason: string } {
  return { target: stateTarget(id), reason };
}

function openInteraction(route: string): PageInteractionDefinition {
  return {
    id: "open-page",
    label: "فتح الصفحة",
    description: `تحميل ${route} عبر مسار التطبيق الحقيقي في البيئة الحالية.`,
    actor: "any",
    actions: [],
  };
}

function click(
  id: string,
  label: string,
  description: string,
  actor: Actor = "any",
): PageInteractionDefinition {
  return {
    id,
    label,
    description,
    actor,
    actions: [{ type: "click", target: eventTarget(id), accessibleLabel: label }],
  };
}

function clickFirstOf(
  id: string,
  label: string,
  description: string,
  actor: Actor = "any",
): PageInteractionDefinition {
  return {
    id,
    label,
    description,
    actor,
    actions: [{ type: "click", target: listItemTarget(id), accessibleLabel: label }],
  };
}

function submit(
  id: string,
  label: string,
  description: string,
  actor: Actor,
  fields: readonly FieldInput[] = [],
): PageInteractionDefinition {
  return {
    id,
    label,
    description,
    actor,
    actions: [
      ...fields.map((field) => ({
        type: "set-value" as const,
        target: field.target,
        value: field.value,
      })),
      { type: "submit", target: eventTarget(id) },
    ],
  };
}

function internalImage(
  id: string,
  label: string,
  description: string,
  actor: Actor,
): PageInteractionDefinition {
  return {
    id,
    label,
    description,
    actor,
    actions: [{ type: "set-internal-image", target: fileTarget(id) }],
  };
}

function page(
  id: string,
  route: string,
  samplePath: string,
  label: string,
  description: string,
  interactions: readonly PageInteractionDefinition[] = [],
): UserPageDefinition {
  return {
    id,
    route,
    samplePath,
    label,
    description,
    interactions: [openInteraction(route), ...interactions],
  };
}

const SEARCH_MAIN_TARGET = listItemTarget("search-main-category");
const SEARCH_SUB_TARGET = listItemTarget("search-subcategory");
const SEARCH_INPUT_TARGET = fieldTarget("search-query");
const SEARCH_RESULT_TARGET = listItemTarget("search-result");
const SEARCH_SELLER_RESULT_TARGET = listItemTarget("search-seller-result");

function searchPreparationActions() {
  return [
    // The category pickers are tab strips: the first tab of each strip is the
    // real control a user taps to reach a searchable category pair.
    { type: "click" as const, target: SEARCH_MAIN_TARGET },
    { type: "click" as const, target: SEARCH_SUB_TARGET },
    { type: "set-value" as const, target: SEARCH_INPUT_TARGET, value: "" },
    { type: "press-key" as const, target: SEARCH_INPUT_TARGET, key: "Enter" },
  ];
}

/**
 * Prerequisite paths.
 *
 * Some real targets only exist once the user has already walked a real path:
 * a cart row needs something in the cart, a product action needs an opened
 * product. These helpers replay that path through the same controls a user
 * touches, so the interaction reaches its declared target without any seeded
 * state or simulation-only shortcut. The frame follows each real navigation.
 */
const SEARCH_ENTRY_PATH = "/search";
const PRODUCT_ADD_CART_TARGET = eventTarget("product-add-cart");
const PRODUCT_FAVORITE_TARGET = eventTarget("product-favorite");
const NAV_CART_TARGET = eventTarget("nav-cart");
const NAV_FAVORITES_TARGET = eventTarget("nav-favorites");
const REACH_TIMEOUT_MS = 8_000;

function searchResultTarget(mode: "products" | "sellers"): SimulationTarget {
  return mode === "sellers" ? SEARCH_SELLER_RESULT_TARGET : SEARCH_RESULT_TARGET;
}

function openFirstResultActions(
  mode: "products" | "sellers",
  accessibleLabel: string,
): readonly SimulationDriverAction[] {
  const resultTarget = searchResultTarget(mode);
  return [
    ...(mode === "sellers"
      ? [{ type: "click" as const, target: eventTarget("search-sellers-mode"), accessibleLabel: "البائعون" }]
      : []),
    ...searchPreparationActions(),
    { type: "wait-for-target", target: resultTarget, timeoutMs: REACH_TIMEOUT_MS },
    { type: "click", target: resultTarget, accessibleLabel },
  ];
}

function reachThenClick(
  target: SimulationTarget,
  accessibleLabel: string,
): readonly SimulationDriverAction[] {
  return [
    { type: "wait-for-target", target, timeoutMs: REACH_TIMEOUT_MS },
    { type: "click", target, accessibleLabel },
  ];
}

/** Opens the first real product from real search, then runs the product action. */
function productInteraction(
  id: string,
  label: string,
  description: string,
  actor: Actor = "any",
): PageInteractionDefinition {
  return {
    id,
    label,
    description,
    actor,
    entryPath: SEARCH_ENTRY_PATH,
    actions: [
      ...openFirstResultActions("products", "فتح منتج"),
      ...reachThenClick(eventTarget(id), label),
    ],
  };
}

/**
 * Page Save is a two-step real gateway: the header button opens the dialog and
 * the dialog's Execute button runs the work. Stopping at the header button
 * would report success without ever saving, so both steps are declared.
 */
function pageSaveActions(
  headerTargetId: string,
  label: string,
): readonly SimulationDriverAction[] {
  return [
    ...reachThenClick(eventTarget(headerTargetId), label),
    ...reachThenClick(eventTarget("page-save-execute"), "تنفيذ الحفظ"),
  ];
}

/** Opens the real custom-request form from a real seller profile. */
function openCustomRequestActions(): readonly SimulationDriverAction[] {
  return [
    ...openFirstResultActions("sellers", "فتح بائع"),
    ...reachThenClick(eventTarget("profile-custom-request"), "طلب مخصص"),
  ];
}

/** Fills the cart through the real product path, then opens the real cart. */
function cartInteraction(
  id: string,
  label: string,
  description: string,
  target: SimulationTarget,
): PageInteractionDefinition {
  return {
    id,
    label,
    description,
    actor: "buyer",
    entryPath: SEARCH_ENTRY_PATH,
    actions: [
      ...openFirstResultActions("products", "فتح منتج"),
      ...reachThenClick(PRODUCT_ADD_CART_TARGET, "إضافة إلى السلة"),
      { type: "click", target: NAV_CART_TARGET, accessibleLabel: "السلة" },
      ...reachThenClick(target, label),
    ],
  };
}

export const USER_PAGE_REGISTRY: readonly UserPageDefinition[] = [
  page("splash", "/", "/", "البداية", "شاشة بدء تجربة المستخدم والانتقال التلقائي بعد التهيئة."),
  page("home", "/home", "/home", "الرئيسية", "الكتالوج والعروض ونقاط الدخول الأساسية.", [
    click("home-search", "فتح البحث", "الانتقال من الرئيسية إلى البحث."),
    clickFirstOf("home-category", "اختيار كتالوج", "فتح أول كتالوج متاح للمستخدم."),
    {
      ...click("home-promotion", "فتح عرض", "تشغيل إجراء العرض النشط الفعلي."),
      unavailableWhen: unavailableWhen("home-promotion-empty", "لا يوجد عرض نشط مُهيّأ في هذه البيئة."),
    },
  ]),
  page("login", "/login", "/login", "تسجيل الدخول", "الدخول بحساب حقيقي أو كضيف.", [
    submit("login-submit", "تسجيل الدخول", "إرسال الهاتف وكلمة المرور عبر نموذج الدخول الحقيقي.", "buyer", [
      { target: fieldTarget("login-phone"), value: "{{phone}}" },
      { target: fieldTarget("login-password"), value: "{{password}}" },
    ]),
    click("login-as-guest", "الدخول كضيف", "تشغيل جلسة الضيف الحقيقية.", "guest"),
    click("login-forgot-password", "نسيت كلمة المرور", "فتح استعادة كلمة المرور.", "guest"),
    click("login-registration", "إنشاء حساب", "فتح التسجيل من صفحة الدخول.", "guest"),
  ]),
  page("registration", "/registration", "/registration", "التسجيل", "إنشاء حساب مستخدم جديد.", [
    submit("registration-submit", "إرسال التسجيل", "تشغيل نموذج التسجيل الحقيقي بعد التحقق من الهاتف.", "guest"),
    click("registration-login", "العودة لتسجيل الدخول", "فتح صفحة الدخول من التسجيل.", "guest"),
  ]),
  page("forgot-password", "/forgot-password", "/forgot-password", "استعادة كلمة المرور", "طلب رمز الاستعادة عبر المسار الحقيقي.", [
    submit("password-request", "طلب رمز الاستعادة", "إرسال الهاتف إلى خدمة الاستعادة الحقيقية.", "buyer", [
      { target: fieldTarget("password-request-phone"), value: "{{phone}}" },
    ]),
  ]),
  page("contact", "/contact-us", "/contact-us", "تواصل معنا", "بيانات التواصل ونموذج الرسالة.", [
    submit("contact-submit", "إرسال رسالة", "إرسال نموذج التواصل إلى الخدمة الحقيقية.", "any"),
    clickFirstOf("contact-channel", "فتح وسيلة تواصل", "فتح أول وسيلة تواصل متاحة."),
  ]),
  page("privacy", "/privacy-policy", "/privacy-policy", "سياسة الخصوصية", "صفحة معلومات عامة بلا عمليات كتابة.", [
    click("privacy-email", "مراسلة الدعم", "فتح البريد المعلن في سياسة الخصوصية."),
  ]),
  page("delete-account", "/delete-account", "/delete-account", "حذف الحساب", "تجهيز حذف الحساب عبر بوابة حفظ الصفحة.", [
    {
      id: "account-delete-stage",
      label: "تجهيز حذف الحساب",
      description: "تفعيل إقرار الحذف الحقيقي لتجهيز حالة الصفحة دون تنفيذ الحذف النهائي.",
      actor: "buyer",
      actions: [{ type: "click", target: eventTarget("account-delete-stage"), accessibleLabel: "تجهيز حذف الحساب" }],
    },
  ]),
  page("search", "/search", "/search", "البحث", "البحث الحقيقي عن المنتجات والبائعين.", [
    {
      id: "search-submit",
      label: "تنفيذ البحث",
      description: "اختيار أول فئة رئيسية وفرعية متاحتين ثم تنفيذ البحث من حقل البحث الحقيقي.",
      actor: "any",
      actions: searchPreparationActions(),
    },
    {
      id: "search-product",
      label: "فتح منتج",
      description: "تنفيذ بحث فعلي ثم فتح أول منتج ظاهر من النتائج.",
      actor: "any",
      actions: [
        ...searchPreparationActions(),
        { type: "wait-for-target", target: SEARCH_RESULT_TARGET, timeoutMs: 8_000 },
        { type: "click", target: SEARCH_RESULT_TARGET, accessibleLabel: "فتح منتج" },
      ],
    },
    {
      id: "search-seller",
      label: "فتح بائع",
      description: "الانتقال إلى بحث البائعين وتنفيذ بحث فعلي ثم فتح أول بائع ظاهر.",
      actor: "any",
      actions: [
        { type: "click", target: eventTarget("search-sellers-mode"), accessibleLabel: "البائعون" },
        ...searchPreparationActions(),
        { type: "wait-for-target", target: SEARCH_SELLER_RESULT_TARGET, timeoutMs: 8_000 },
        { type: "click", target: SEARCH_SELLER_RESULT_TARGET, accessibleLabel: "فتح بائع" },
      ],
    },
  ]),
  page("cart", "/cart", "/cart", "السلة", "عناصر السلة والكميات وإنشاء الطلب.", [
    cartInteraction("cart-increase", "زيادة الكمية", "إضافة أول منتج حقيقي إلى السلة ثم زيادة كميته.", listItemTarget("cart-increase")),
    cartInteraction("cart-decrease", "خفض الكمية", "إضافة أول منتج حقيقي إلى السلة ثم خفض كميته.", listItemTarget("cart-decrease")),
    cartInteraction("cart-remove", "إزالة عنصر", "إضافة أول منتج حقيقي إلى السلة ثم إزالته عبر مخزن السلة.", listItemTarget("cart-remove")),
    cartInteraction("cart-checkout", "تنفيذ الطلب", "إضافة أول منتج حقيقي إلى السلة ثم إرسالها إلى مسار إنشاء الطلب.", eventTarget("cart-checkout")),
  ]),
  page("favorites", "/favorites", "/favorites", "المفضلة", "المنتجات والبائعون المحفوظون على الجهاز.", [
    click("favorites-products", "عرض المنتجات", "اختيار تبويب المنتجات."),
    click("favorites-sellers", "عرض البائعين", "اختيار تبويب البائعين."),
    {
      id: "favorites-open",
      label: "فتح عنصر محفوظ",
      description: "حفظ أول منتج حقيقي من مساره الفعلي ثم فتحه من المفضلة.",
      actor: "any",
      entryPath: SEARCH_ENTRY_PATH,
      actions: [
        ...openFirstResultActions("products", "فتح منتج"),
        ...reachThenClick(PRODUCT_FAVORITE_TARGET, "تبديل المفضلة"),
        { type: "click", target: NAV_FAVORITES_TARGET, accessibleLabel: "المفضلة" },
        ...reachThenClick(listItemTarget("favorites-open"), "فتح عنصر محفوظ"),
      ],
    },
  ]),
  page("product", "/product", "/product", "المنتج", "تفاصيل المنتج وإجراءات الشراء والحفظ والمشاركة.", [
    productInteraction("product-add-cart", "إضافة إلى السلة", "فتح أول منتج حقيقي ثم إضافته عبر خدمة السلة.", "buyer"),
    productInteraction("product-favorite", "تبديل المفضلة", "فتح أول منتج حقيقي ثم حفظه أو إزالته على الجهاز.", "any"),
    productInteraction("product-share", "مشاركة المنتج", "فتح أول منتج حقيقي ثم تشغيل مسار المشاركة المناسب للمنصة."),
    productInteraction("product-review", "إرسال تقييم", "فتح أول منتج حقيقي ثم فتح تقييمه عبر الخدمة الحقيقية.", "buyer"),
    productInteraction("product-contact", "مراسلة صاحب المنتج", "فتح أول منتج حقيقي ثم بدء محادثته مع البائع.", "buyer"),
    productInteraction("product-owner-profile", "فتح ملف صاحب المنتج", "فتح أول منتج حقيقي ثم الانتقال إلى ملف صاحبه.", "buyer"),
  ]),
  page("product-share", "/s/product", "/s/product", "رابط منتج مشترك", "فتح المنتج عبر رابط المشاركة العام."),
  page("profile", "/profile", "/profile", "الملف الشخصي", "عرض وتحرير ملف المستخدم ومنتجاته.", [
    click("profile-follow", "متابعة البائع", "تشغيل خدمة المتابعة الحقيقية.", "buyer"),
    click("profile-share", "مشاركة الملف", "فتح مشاركة الملف المناسبة للمنصة."),
    {
      id: "profile-custom-request",
      label: "فتح طلب مخصص",
      description: "فتح ملف أول بائع حقيقي ثم فتح نموذج الطلب المخصص الخاص به.",
      actor: "buyer",
      entryPath: SEARCH_ENTRY_PATH,
      actions: openCustomRequestActions(),
    },
    {
      id: "profile-contact",
      label: "التواصل مع البائع",
      description: "فتح ملف أول بائع حقيقي من بحث البائعين ثم فتح قناة التواصل الفعلية.",
      actor: "buyer",
      entryPath: SEARCH_ENTRY_PATH,
      actions: [
        ...openFirstResultActions("sellers", "فتح بائع"),
        ...reachThenClick(eventTarget("profile-contact"), "التواصل مع البائع"),
      ],
    },
    {
      id: "profile-save",
      label: "حفظ التعديلات",
      description: "تجهيز تغيير حقيقي في وصف المتجر من نموذج التحرير الفعلي ثم تنفيذه عبر Page Save.",
      actor: "seller",
      entryPath: "/profile?mode=edit",
      actions: [
        { type: "wait-for-target", target: fieldTarget("profile-store-description"), timeoutMs: REACH_TIMEOUT_MS },
        { type: "set-value", target: fieldTarget("profile-store-description"), value: "وصف محاكاة — {{storeName}}" },
        ...pageSaveActions("profile-save", "حفظ التعديلات"),
      ],
    },
  ]),
  page("profile-share", "/s/profile", "/s/profile", "رابط ملف مشترك", "فتح الملف عبر رابط المشاركة العام."),
  page("pharmacy-catalog", "/profile/pharmacy-catalog", "/profile/pharmacy-catalog", "كتالوج الصيدلية", "إدارة ظهور عناصر كتالوج الصيدلية.", [
    {
      ...clickFirstOf("pharmacy-category", "اختيار قسم", "اختيار قسم فعلي من الكتالوج.", "seller"),
      unavailableWhen: unavailableWhen("pharmacy-catalog-empty", "حساب البائع لا يملك كتالوج صيدلية بأقسام."),
    },
    {
      ...clickFirstOf("pharmacy-toggle", "تبديل ظهور منتج", "تجهيز تغيير ظهور منتج.", "seller"),
      unavailableWhen: unavailableWhen("pharmacy-products-empty", "قسم الكتالوج الحالي لا يحتوي منتجات."),
    },
    {
      id: "pharmacy-save",
      label: "حفظ الكتالوج",
      description: "تنفيذ تغييرات الكتالوج المجهزة عبر بوابة Page Save الحقيقية بخطوتيها.",
      actor: "seller",
      actions: pageSaveActions("pharmacy-save", "حفظ الكتالوج"),
    },
  ]),
  page("settings", "/settings", "/settings", "الإعدادات", "إعدادات التطبيق والتحديث والبيانات المحلية.", [
    click("settings-check-update", "فحص التحديث", "تشغيل فحص OTA الحقيقي المتاح للبيئة."),
    click("settings-clear-data", "تجهيز مسح البيانات", "فتح تأكيد مسح بيانات الجهاز."),
    click("settings-notifications", "فتح إعدادات الإشعارات", "الانتقال لإعدادات الإشعارات."),
  ]),
  page("notification-settings", "/settings/notifications", "/settings/notifications", "إعدادات الإشعارات", "الأذونات والأجهزة وتفضيلات الإشعارات.", [
    click("notifications-permission", "فحص الإذن", "قراءة إذن النظام الحقيقي."),
    click("notifications-test", "إرسال إشعار تجريبي", "إرسال الاختبار الذاتي عبر الخدمة الحقيقية.", "buyer"),
    {
      ...clickFirstOf("notifications-revoke-device", "إلغاء جهاز", "إلغاء أول جهاز مسجل للحساب.", "buyer"),
      unavailableWhen: unavailableWhen("account-devices-empty", "لا توجد أجهزة مسجّلة لهذا الحساب."),
    },
  ]),
  page("notifications", "/notifications", "/notifications", "مركز الإشعارات", "قراءة وفتح وإخفاء الإشعارات.", [
    clickFirstOf("notification-filter", "تغيير الفلتر", "اختيار فلتر إشعارات فعلي."),
    {
      ...clickFirstOf("notification-read", "تعليم كمقروء", "تحديث حالة أول إشعار.", "buyer"),
      unavailableWhen: unavailableWhen("notifications-empty", "لا توجد إشعارات في هذا التبويب."),
    },
    {
      ...clickFirstOf("notification-open", "فتح إشعار", "تنفيذ وجهة أول إشعار."),
      unavailableWhen: unavailableWhen("notifications-empty", "لا توجد إشعارات في هذا التبويب."),
    },
    {
      ...clickFirstOf("notification-dismiss", "إخفاء إشعار", "إخفاء أول إشعار من المركز.", "buyer"),
      unavailableWhen: unavailableWhen("notifications-empty", "لا توجد إشعارات في هذا التبويب."),
    },
  ]),
  page("notification-chat", "/notifications/chat", "/notifications/chat", "محادثة إشعار", "قراءة وإرسال رد في محادثة الطلب المتخصص.", [
    {
      ...submit("chat-reply", "إرسال رد", "إرسال الرد عبر خدمة المحادثة والإشعارات.", "buyer"),
      unavailableWhen: unavailableWhen("chat-conversation-missing", "لا توجد محادثة محفوظة على هذا الجهاز."),
    },
  ]),
  page("orders", "/orders", "/orders", "الطلبات", "قائمة الطلبات الفعلية حسب الحساب.", [
    {
      ...clickFirstOf("orders-open", "فتح طلب", "فتح أول طلب فعلي.", "buyer"),
      unavailableWhen: unavailableWhen("orders-empty", "لا توجد طلبات على هذا الحساب."),
    },
  ]),
  page("order-details-static", "/orders/details", "/orders/details", "تفاصيل الطلب الثابتة", "تفاصيل طلب عبر query في Static Out.", [
    {
      ...clickFirstOf("order-action", "تنفيذ إجراء متاح", "تنفيذ أول إجراء مسموح بحسب حالة الطلب ودور المستخدم.", "buyer"),
      unavailableWhen: unavailableWhen("order-details-missing", "لا يوجد طلب حقيقي على هذا المسار."),
    },
  ]),
  page("order-details", "/orders/[orderId]", "/orders/simulation-order", "تفاصيل الطلب", "تفاصيل ومسار عمليات الطلب على Web.", [
    {
      ...clickFirstOf("order-action", "تنفيذ إجراء متاح", "تنفيذ أول إجراء مسموح بحسب حالة الطلب ودور المستخدم.", "buyer"),
      unavailableWhen: unavailableWhen("order-details-missing", "لا يوجد طلب حقيقي على هذا المسار."),
    },
  ]),
  page("custom-request", "/custom-request", "/custom-request", "طلب مخصص", "إنشاء طلب مخصص لبائع.", [
    {
      id: "custom-request-submit",
      label: "إرسال الطلب المخصص",
      description: "فتح نموذج الطلب المخصص لبائع حقيقي وكتابة وصفه ثم تنفيذه عبر بوابة Page Save.",
      actor: "buyer",
      entryPath: SEARCH_ENTRY_PATH,
      actions: [
        ...openCustomRequestActions(),
        { type: "wait-for-target", target: fieldTarget("custom-request-description"), timeoutMs: REACH_TIMEOUT_MS },
        { type: "set-value", target: fieldTarget("custom-request-description"), value: "طلب مخصص للمحاكاة من {{storeName}}" },
        ...pageSaveActions("custom-request-submit", "إرسال الطلب المخصص"),
      ],
    },
    {
      id: "custom-request-image",
      label: "إضافة صورة داخلية",
      description: "فتح نموذج الطلب المخصص لبائع حقيقي ثم اختيار صورة عشوائية من الكتالوجات الداخلية ورفعها.",
      actor: "buyer",
      entryPath: SEARCH_ENTRY_PATH,
      actions: [
        ...openCustomRequestActions(),
        { type: "wait-for-target", target: fileTarget("custom-request-image"), timeoutMs: REACH_TIMEOUT_MS },
        { type: "set-internal-image", target: fileTarget("custom-request-image") },
      ],
    },
  ]),
  page("specialty-request", "/specialty-request", "/specialty-request", "طلب متخصص", "اختيار تخصص وإرسال طلب للمختصين.", [
    clickFirstOf("specialty-main", "اختيار تخصص رئيسي", "اختيار أول تخصص فعلي."),
    {
      id: "specialty-sub",
      label: "اختيار تخصص فرعي",
      description: "اختيار أول تخصص رئيسي ثم أول تخصص فرعي يظهر تحته.",
      actor: "any",
      actions: [
        { type: "click", target: listItemTarget("specialty-main"), accessibleLabel: "اختيار تخصص رئيسي" },
        { type: "wait-for-target", target: listItemTarget("specialty-sub"), timeoutMs: 5_000 },
        { type: "click", target: listItemTarget("specialty-sub"), accessibleLabel: "اختيار تخصص فرعي" },
      ],
    },
    {
      id: "specialty-submit",
      label: "إرسال الطلب",
      description: "اختيار أول تخصص رئيسي وفرعي وكتابة نص الطلب ثم تشغيل مسار إنشاء الطلب المتخصص.",
      actor: "buyer",
      actions: [
        { type: "click", target: listItemTarget("specialty-main"), accessibleLabel: "اختيار تخصص رئيسي" },
        { type: "wait-for-target", target: listItemTarget("specialty-sub"), timeoutMs: 5_000 },
        { type: "click", target: listItemTarget("specialty-sub"), accessibleLabel: "اختيار تخصص فرعي" },
        { type: "set-value", target: fieldTarget("specialty-message"), value: "طلب محاكاة من {{storeName}}" },
        { type: "submit", target: eventTarget("specialty-submit") },
      ],
    },
  ]),
  page("collection", "/collections/[collectionId]", "/collections/0", "مجموعة كتالوج", "عرض أقسام مجموعة حقيقية.", [
    clickFirstOf("collection-item", "اختيار قسم", "فتح أول قسم متاح في المجموعة."),
  ]),
  page("category", "/categories/[categoryId]", "/categories/1", "كتالوج رئيسي", "عرض الأقسام الفرعية لكتالوج حقيقي.", [
    clickFirstOf("category-item", "اختيار قسم فرعي", "فتح أول قسم فرعي متاح."),
  ]),
  page("sellers", "/categories/[categoryId]/sellers/[subcategoryId]", "/categories/1/sellers/1", "البائعون", "البائعون المتاحون لقسم محدد.", [
    clickFirstOf("seller-open", "فتح بائع", "فتح أول بائع فعلي."),

  ]),
  page("doctor-appointment", "/categories/[categoryId]/doctor-appointment/[specialtyId]", "/categories/20/doctor-appointment/300", "حجز طبيب", "مقدمو الخدمة لتخصص طبي محدد.", [
    {
      ...clickFirstOf("doctor-open", "فتح مقدم خدمة", "فتح أول مقدم خدمة فعلي."),
      unavailableWhen: unavailableWhen("doctor-empty", "لا يوجد مقدمو خدمة في هذا التخصص."),
    },
  ]),
] as const;

export function userPageById(id: string): UserPageDefinition | undefined {
  return USER_PAGE_REGISTRY.find((candidate) => candidate.id === id);
}

export function pageInteractionById(
  page: UserPageDefinition,
  interactionId: string,
): PageInteractionDefinition | undefined {
  return page.interactions.find((candidate) => candidate.id === interactionId);
}
