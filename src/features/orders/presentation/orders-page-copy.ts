export function ordersPageCopy(locale: "ar" | "en") {
  return locale === "ar"
    ? {
        title: "الطلبات",
        login: "يجب تسجيل الدخول لعرض الطلبات المرتبطة بك.",
        description: "أحدث الطلبات المرتبطة بحسابك بكل الأدوار.",
        admin: "تحكم السوبر أدمن",
        emptyTitle: "لا توجد طلبات",
        emptyDescription:
          "عند إنشاء طلب أو ارتباطك بطلب كبائع أو مقدم توصيل سيظهر هنا.",
        orderNumber: "رقم الطلب",
        orderDate: "تاريخ الطلب",
        yourRole: "دورك في الطلب",
        total: "الإجمالي",
        remaining: "المتبقي عند الاستلام",
        loadFailed: "تعذر تحميل الطلبات.",
        loadMore: "جلب المزيد",
        loadingMore: "جاري التحميل...",
      }
    : {
        title: "Orders",
        login: "Sign in to view orders associated with you.",
        description: "Your latest orders across every role.",
        admin: "Super admin control",
        emptyTitle: "No orders",
        emptyDescription:
          "Orders you create or join as a seller or delivery provider will appear here.",
        orderNumber: "Order number",
        orderDate: "Order date",
        yourRole: "Your role",
        total: "Total",
        remaining: "Remaining on delivery",
        loadFailed: "Unable to load orders.",
        loadMore: "Load more",
        loadingMore: "Loading...",
      };
}
