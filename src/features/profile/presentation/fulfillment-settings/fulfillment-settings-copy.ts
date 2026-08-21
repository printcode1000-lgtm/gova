export function fulfillmentSettingsCopy(locale: "ar" | "en") {
  return {
    loading: locale === "ar" ? "جاري التحميل..." : "Loading...",
    invalidCarrier:
      locale === "ar"
        ? "يجب اختيار مقدمي توصيل لديهم تخصص خدمات التوصيل."
        : "Selected carriers must have the delivery services specialty.",
    saved: locale === "ar" ? "تم الحفظ" : "Saved",
    shippingMethods:
      locale === "ar"
        ? "اختر مقدمي خدمة التوصيل"
        : "Choose delivery providers",
    searchPlaceholder:
      locale === "ar" ? "ابحث باسم المتجر" : "Search by store name",
    search: locale === "ar" ? "بحث" : "Search",
    loadingProviders:
      locale === "ar"
        ? "جاري تحميل مقدمي التوصيل..."
        : "Loading delivery providers...",
    noMatchingProviders:
      locale === "ar" ? "لا توجد نتائج مطابقة." : "No matching providers.",
    noDeliveryProviders:
      locale === "ar"
        ? "لا يوجد مقدمو خدمات توصيل حتى الآن."
        : "No delivery service providers yet.",
    remove: locale === "ar" ? "إلغاء" : "Remove",
    select: locale === "ar" ? "تحديد" : "Select",
    viewProfile: locale === "ar" ? "عرض البروفايل" : "View profile",
    selectedCount: (count: number) =>
      locale === "ar"
        ? `تم اختيار ${count} مقدم توصيل.`
        : `${count} delivery provider(s) selected.`,
    returnPolicy: locale === "ar" ? "سياسة الإرجاع" : "Return policy",
    shippingPricing: locale === "ar" ? "تسعير الشحن" : "Shipping pricing",
    shippingPricingMode:
      locale === "ar" ? "طريقة حساب الشحن" : "Shipping pricing method",
    freeShipping: locale === "ar" ? "شحن مجاني" : "Free shipping",
    flatShipping: locale === "ar" ? "قيمة ثابتة" : "Flat rate",
    locationShipping: locale === "ar" ? "حسب المكان" : "By location",
    flatRate: locale === "ar" ? "قيمة الشحن الثابتة" : "Flat shipping rate",
    specialVehicleFee:
      locale === "ar"
        ? "رسوم سيارة النقل عند الحاجة"
        : "Special vehicle fee when needed",
    freeShippingThreshold:
      locale === "ar"
        ? "حد أدنى للطلب لشحن مجاني"
        : "Free shipping minimum order",
    shippingNotes: locale === "ar" ? "ملاحظات الشحن" : "Shipping notes",
    shippingNotesPlaceholder:
      locale === "ar"
        ? "مثال: السعر النهائي قد يختلف حسب العنوان أو حجم الطلب."
        : "Example: final shipping may vary by address or order size.",
    returnsAvailable:
      locale === "ar" ? "الإرجاع متاح" : "Returns are available",
    returnsUnavailable:
      locale === "ar" ? "الإرجاع غير متاح" : "Returns are unavailable",
    returnWindowDays:
      locale === "ar" ? "عدد أيام الإرجاع" : "Return window days",
    returnShippingPayer:
      locale === "ar" ? "من يتحمل تكلفة شحن الإرجاع" : "Return shipping payer",
    buyer: locale === "ar" ? "المشتري" : "Buyer",
    seller: locale === "ar" ? "البائع" : "Seller",
    caseByCase: locale === "ar" ? "حسب الحالة" : "Case by case",
    policyText: locale === "ar" ? "نص السياسة" : "Policy text",
    policyPlaceholder:
      locale === "ar"
        ? "اكتب شروط الإرجاع الخاصة بمتجرك."
        : "Write your store return policy.",
  };
}
