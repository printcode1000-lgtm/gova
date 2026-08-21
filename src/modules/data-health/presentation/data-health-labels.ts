import { formatAdminDateTime } from "@asol/format-core";
import type {
  DataHealthIssue,
  DataHealthTopologyStatus,
} from "@asol/data-health-core";

export const dateText = formatAdminDateTime;

export const severityLabels = {
  critical: "حرج",
  warning: "تحذير",
  info: "معلومة",
} as const;

export const categoryLabels: Record<DataHealthIssue["category"], string> = {
  database: "قواعد البيانات",
  user: "المستخدمون",
  profile: "البروفايلات",
  product: "المنتجات",
  image: "الصور",
  order: "الطلبات",
  relationship: "العلاقات",
  advertisement: "الإعلانات",
  discount: "الخصومات",
};

export const cleanupLabels: Record<DataHealthIssue["cleanupAction"], string> = {
  "archive-product": "أرشفة المنتج",
  "archive-order": "أرشفة الطلب",
  "delete-broken-relation": "حذف العلاقة المكسورة",
  "quarantine-record": "حجر السجل",
  "quarantine-storage-object": "حجر ملف الصورة",
  "delete-storage-object": "حذف ملف الصورة",
  none: "فحص يدوي",
};

export function severityClass(severity: DataHealthIssue["severity"]) {
  if (severity === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "warning")
    return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export function topologyStatusClass(status: DataHealthTopologyStatus) {
  if (status === "ready") return "border-green-200 bg-green-50 text-green-700";
  if (status === "warning")
    return "border-amber-200 bg-amber-50 text-amber-800";
  if (status === "unavailable") return "border-red-200 bg-red-50 text-red-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
}

export function topologyStatusLabel(status: DataHealthTopologyStatus) {
  if (status === "ready") return "متصل";
  if (status === "warning") return "بحاجة إلى انتباه";
  if (status === "unavailable") return "غير متاح";
  return "خارج هذه البيئة";
}
