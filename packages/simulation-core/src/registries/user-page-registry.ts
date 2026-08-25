import type {
  PageInteractionDefinition,
  SimulationUserRole,
  UserPageDefinition,
} from "../domain/simulation.types";

type Actor = "guest" | SimulationUserRole | "any";

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
    actions: [{ type: "click", selector: `[data-simulation-event="${id}"]`, accessibleLabel: label }],
  };
}

function submit(
  id: string,
  label: string,
  description: string,
  actor: Actor,
  fields: ReadonlyArray<{ selector: string; value: string }> = [],
): PageInteractionDefinition {
  return {
    id,
    label,
    description,
    actor,
    actions: [
      ...fields.map((field) => ({
        type: "set-value" as const,
        selector: field.selector,
        value: field.value,
      })),
      { type: "submit", selector: `[data-simulation-event="${id}"]` },
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
    actions: [{ type: "set-internal-image", selector: "input[type=file]" }],
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

const SEARCH_MAIN_SELECTOR = "main section select:nth-of-type(1)";
const SEARCH_SUB_SELECTOR = "main section select:nth-of-type(2)";
const SEARCH_INPUT_SELECTOR = "main section input.asol-input-decorated-start";
const SEARCH_RESULT_SELECTOR = "main section article > button[type=button]";

function searchPreparationActions() {
  return [
    { type: "select-first-option" as const, selector: SEARCH_MAIN_SELECTOR },
    { type: "select-first-option" as const, selector: SEARCH_SUB_SELECTOR },
    { type: "set-value" as const, selector: SEARCH_INPUT_SELECTOR, value: "" },
    { type: "press-key" as const, selector: SEARCH_INPUT_SELECTOR, key: "Enter" },
  ];
}

export const USER_PAGE_REGISTRY: readonly UserPageDefinition[] = [
  page("splash", "/", "/", "البداية", "شاشة بدء تجربة المستخدم والانتقال التلقائي بعد التهيئة."),
  page("home", "/home", "/home", "الرئيسية", "الكتالوج والعروض ونقاط الدخول الأساسية.", [
    click("home-search", "فتح البحث", "الانتقال من الرئيسية إلى البحث."),
    click("home-category", "اختيار كتالوج", "فتح أول كتالوج متاح للمستخدم."),
    click("home-promotion", "فتح عرض", "تشغيل إجراء العرض النشط الفعلي."),
  ]),
  page("login", "/login", "/login", "تسجيل الدخول", "الدخول بحساب حقيقي أو كضيف.", [
    submit("login-submit", "تسجيل الدخول", "إرسال الهاتف وكلمة المرور عبر نموذج الدخول الحقيقي.", "buyer", [
      { selector: "input[name=phone]", value: "{{phone}}" },
      { selector: "input[name=password]", value: "{{password}}" },
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
      { selector: "input[inputmode=tel]", value: "{{phone}}" },
    ]),
  ]),
  page("contact", "/contact-us", "/contact-us", "تواصل معنا", "بيانات التواصل ونموذج الرسالة.", [
    submit("contact-submit", "إرسال رسالة", "إرسال نموذج التواصل إلى الخدمة الحقيقية.", "any"),
    click("contact-channel", "فتح وسيلة تواصل", "فتح أول وسيلة تواصل متاحة."),
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
      actions: [{ type: "click", selector: "main input[type=checkbox]", accessibleLabel: "تجهيز حذف الحساب" }],
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
        { type: "wait-for-target", selector: SEARCH_RESULT_SELECTOR, timeoutMs: 8_000 },
        { type: "click", selector: SEARCH_RESULT_SELECTOR, accessibleLabel: "فتح منتج" },
      ],
    },
    {
      id: "search-seller",
      label: "فتح بائع",
      description: "الانتقال إلى بحث البائعين وتنفيذ بحث فعلي ثم فتح أول بائع ظاهر.",
      actor: "any",
      actions: [
        { type: "click", selector: "main section > div:first-child > button:nth-child(2)", accessibleLabel: "البائعون" },
        ...searchPreparationActions(),
        { type: "wait-for-target", selector: SEARCH_RESULT_SELECTOR, timeoutMs: 8_000 },
        { type: "click", selector: SEARCH_RESULT_SELECTOR, accessibleLabel: "فتح بائع" },
      ],
    },
  ]),
  page("cart", "/cart", "/cart", "السلة", "عناصر السلة والكميات وإنشاء الطلب.", [
    {
      id: "cart-increase",
      label: "زيادة الكمية",
      description: "زيادة كمية أول عنصر فعلي.",
      actor: "buyer",
      actions: [{ type: "click", selector: "button[aria-label=\"زيادة الكمية\"]", accessibleLabel: "زيادة الكمية" }],
    },
    {
      id: "cart-decrease",
      label: "خفض الكمية",
      description: "خفض كمية أول عنصر فعلي.",
      actor: "buyer",
      actions: [{ type: "click", selector: "button[aria-label=\"تقليل الكمية\"]", accessibleLabel: "خفض الكمية" }],
    },
    {
      id: "cart-remove",
      label: "إزالة عنصر",
      description: "إزالة أول عنصر عبر مخزن السلة الحقيقي.",
      actor: "buyer",
      actions: [{ type: "click", selector: "button[aria-label=\"إزالة من السلة\"]", accessibleLabel: "إزالة عنصر" }],
    },
    click("cart-checkout", "تنفيذ الطلب", "إرسال محتوى السلة إلى مسار إنشاء الطلب.", "buyer"),
  ]),
  page("favorites", "/favorites", "/favorites", "المفضلة", "المنتجات والبائعون المحفوظون على الجهاز.", [
    click("favorites-products", "عرض المنتجات", "اختيار تبويب المنتجات."),
    click("favorites-sellers", "عرض البائعين", "اختيار تبويب البائعين."),
    {
      id: "favorites-open",
      label: "فتح عنصر محفوظ",
      description: "فتح أول عنصر محفوظ فعليًا.",
      actor: "any",
      actions: [{ type: "click", selector: "main article > button[type=button]", accessibleLabel: "فتح عنصر محفوظ" }],
    },
  ]),
  page("product", "/product", "/product", "المنتج", "تفاصيل المنتج وإجراءات الشراء والحفظ والمشاركة.", [
    click("product-add-cart", "إضافة إلى السلة", "إضافة المنتج الحالي عبر خدمة السلة.", "buyer"),
    click("product-favorite", "تبديل المفضلة", "حفظ أو إزالة المنتج على الجهاز.", "any"),
    click("product-share", "مشاركة المنتج", "فتح مسار المشاركة المناسب للمنصة."),
    click("product-review", "إرسال تقييم", "إرسال تقييم المنتج إلى الخدمة الحقيقية.", "buyer"),
  ]),
  page("product-share", "/s/product", "/s/product", "رابط منتج مشترك", "فتح المنتج عبر رابط المشاركة العام.", [
    click("product-share-open", "فتح المنتج", "متابعة رابط المشاركة إلى المنتج."),
  ]),
  page("profile", "/profile", "/profile", "الملف الشخصي", "عرض وتحرير ملف المستخدم ومنتجاته.", [
    click("profile-follow", "متابعة البائع", "تشغيل خدمة المتابعة الحقيقية.", "buyer"),
    click("profile-share", "مشاركة الملف", "فتح مشاركة الملف المناسبة للمنصة."),
    click("profile-contact", "التواصل مع البائع", "فتح قناة التواصل الفعلية.", "buyer"),
    click("profile-save", "حفظ التعديلات", "تنفيذ التغييرات المجهزة عبر Page Save.", "seller"),
  ]),
  page("profile-share", "/s/profile", "/s/profile", "رابط ملف مشترك", "فتح الملف عبر رابط المشاركة العام.", [
    click("profile-share-open", "فتح الملف", "متابعة رابط المشاركة إلى الملف."),
  ]),
  page("pharmacy-catalog", "/profile/pharmacy-catalog", "/profile/pharmacy-catalog", "كتالوج الصيدلية", "إدارة ظهور عناصر كتالوج الصيدلية.", [
    click("pharmacy-category", "اختيار قسم", "اختيار قسم فعلي من الكتالوج.", "seller"),
    click("pharmacy-toggle", "تبديل ظهور منتج", "تجهيز تغيير ظهور منتج.", "seller"),
    click("pharmacy-save", "حفظ الكتالوج", "تنفيذ التغييرات عبر Page Save.", "seller"),
  ]),
  page("settings", "/settings", "/settings", "الإعدادات", "إعدادات التطبيق والتحديث والبيانات المحلية.", [
    click("settings-check-update", "فحص التحديث", "تشغيل فحص OTA الحقيقي المتاح للبيئة."),
    click("settings-clear-data", "تجهيز مسح البيانات", "فتح تأكيد مسح بيانات الجهاز."),
    click("settings-notifications", "فتح إعدادات الإشعارات", "الانتقال لإعدادات الإشعارات."),
  ]),
  page("notification-settings", "/settings/notifications", "/settings/notifications", "إعدادات الإشعارات", "الأذونات والأجهزة وتفضيلات الإشعارات.", [
    click("notifications-permission", "فحص الإذن", "قراءة إذن النظام الحقيقي."),
    click("notifications-test", "إرسال إشعار تجريبي", "إرسال الاختبار الذاتي عبر الخدمة الحقيقية.", "buyer"),
    click("notifications-revoke-device", "إلغاء جهاز", "إلغاء أول جهاز مسجل للحساب.", "buyer"),
  ]),
  page("notifications", "/notifications", "/notifications", "مركز الإشعارات", "قراءة وفتح وإخفاء الإشعارات.", [
    click("notification-filter", "تغيير الفلتر", "اختيار فلتر إشعارات فعلي."),
    click("notification-read", "تعليم كمقروء", "تحديث حالة أول إشعار.", "buyer"),
    click("notification-open", "فتح إشعار", "تنفيذ وجهة أول إشعار."),
    click("notification-dismiss", "إخفاء إشعار", "إخفاء أول إشعار من المركز.", "buyer"),
  ]),
  page("notification-chat", "/notifications/chat", "/notifications/chat", "محادثة إشعار", "قراءة وإرسال رد في محادثة الطلب المتخصص.", [
    submit("chat-reply", "إرسال رد", "إرسال الرد عبر خدمة المحادثة والإشعارات.", "buyer"),
  ]),
  page("orders", "/orders", "/orders", "الطلبات", "قائمة الطلبات الفعلية حسب الحساب.", [
    click("orders-refresh", "تحديث الطلبات", "إعادة القراءة من خدمة الطلبات.", "buyer"),
    click("orders-open", "فتح طلب", "فتح أول طلب فعلي.", "buyer"),
  ]),
  page("order-details-static", "/orders/details", "/orders/details", "تفاصيل الطلب الثابتة", "تفاصيل طلب عبر query في Static Out.", [
    click("order-action", "تنفيذ إجراء متاح", "تنفيذ أول إجراء مسموح بحسب حالة الطلب ودور المستخدم.", "buyer"),
  ]),
  page("order-details", "/orders/[orderId]", "/orders/simulation-order", "تفاصيل الطلب", "تفاصيل ومسار عمليات الطلب على Web.", [
    click("order-action", "تنفيذ إجراء متاح", "تنفيذ أول إجراء مسموح بحسب حالة الطلب ودور المستخدم.", "buyer"),
  ]),
  page("custom-request", "/custom-request", "/custom-request", "طلب مخصص", "إنشاء طلب مخصص لبائع.", [
    submit("custom-request-submit", "إرسال الطلب المخصص", "إنشاء الطلب عبر خدمة الطلبات الحقيقية.", "buyer"),
    internalImage("custom-request-image", "إضافة صورة داخلية", "اختيار صورة عشوائية من الكتالوجات الداخلية ورفعها.", "buyer"),
  ]),
  page("specialty-request", "/specialty-request", "/specialty-request", "طلب متخصص", "اختيار تخصص وإرسال طلب للمختصين.", [
    click("specialty-main", "اختيار تخصص رئيسي", "اختيار أول تخصص فعلي."),
    click("specialty-sub", "اختيار تخصص فرعي", "اختيار أول تخصص فرعي فعلي."),
    submit("specialty-submit", "إرسال الطلب", "تشغيل مسار إنشاء الطلب المتخصص.", "buyer"),
  ]),
  page("collection", "/collections/[collectionId]", "/collections/0", "مجموعة كتالوج", "عرض أقسام مجموعة حقيقية.", [
    click("collection-item", "اختيار قسم", "فتح أول قسم متاح في المجموعة."),
  ]),
  page("category", "/categories/[categoryId]", "/categories/1", "كتالوج رئيسي", "عرض الأقسام الفرعية لكتالوج حقيقي.", [
    click("category-item", "اختيار قسم فرعي", "فتح أول قسم فرعي متاح."),
  ]),
  page("sellers", "/categories/[categoryId]/sellers/[subcategoryId]", "/categories/1/sellers/1", "البائعون", "البائعون المتاحون لقسم محدد.", [
    click("seller-open", "فتح بائع", "فتح أول بائع فعلي."),
    click("seller-contact", "التواصل مع بائع", "فتح قناة التواصل لأول بائع.", "buyer"),
  ]),
  page("doctor-appointment", "/categories/[categoryId]/doctor-appointment/[specialtyId]", "/categories/20/doctor-appointment/300", "حجز طبيب", "مقدمو الخدمة لتخصص طبي محدد.", [
    click("doctor-open", "فتح مقدم خدمة", "فتح أول مقدم خدمة فعلي."),
    click("doctor-request", "بدء طلب موعد", "فتح مسار الطلب لمقدم الخدمة.", "buyer"),
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
