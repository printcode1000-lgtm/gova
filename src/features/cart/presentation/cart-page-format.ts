import { formatCurrencyMinor } from "@asol/format-core";

export function formatMoney(minor: number, locale = "ar") {
  return formatCurrencyMinor(minor, { locale });
}

export function orderErrorMessage(message: string) {
  if (message.includes("Buyer phone is required")) {
    return "يجب توفر رقم هاتف في الحساب قبل إرسال الطلب.";
  }
  if (message.includes("Delivery carrier required")) {
    return "لا يمكن إرسال الطلب لأن أحد البائعين لم يربط مقدم خدمة توصيل في إعدادات الشحن والإرجاع.";
  }
  if (message.includes("userNotFound")) {
    return "يجب تسجيل الدخول قبل إرسال الطلب.";
  }
  return message || "تعذر إرسال الطلب. حاول مرة أخرى.";
}
