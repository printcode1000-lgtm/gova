export function unifiedDeliveryPlanStatusText(status: unknown) {
  const statusText: Record<string, string> = {
    collecting_quotes: "نجمع عروض مقدمي التوصيل",
    pending_buyer: "توجد عروض بانتظار قرار المشتري",
    accepted: "تم اختيار عرض التوصيل الموحّد",
    reprice_required: "تغيرت محطات الاستلام ويجب إرسال عرض جديد",
    separate_selected: "اختار المشتري التوصيل المنفصل",
    cancelled: "أُلغيت خطة التوصيل",
    completed: "أُنشئت شحنة التوصيل الموحّد",
  };

  return statusText[String(status)] ?? String(status);
}
