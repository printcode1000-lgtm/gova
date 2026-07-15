import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-outline-variant bg-surface p-8 shadow-sm">
        <h1 className="mb-6 text-center text-3xl font-bold text-primary">
          سياسة الخصوصية - ASOL
        </h1>
        <p className="mb-8 text-on-surface-variant">
          في <strong>ASOL</strong> نحترم خصوصية المستخدمين ونسعى لحماية بياناتهم الشخصية وفقًا
          لأفضل الممارسات.
        </p>

        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-primary border-b border-outline-variant pb-2">
              المعلومات التي نقوم بجمعها
            </h2>
            <p className="text-on-surface-variant">
              قد نقوم بجمع بعض المعلومات الأساسية مثل الاسم ورقم الهاتف عند التسجيل في التطبيق، وذلك لتحسين
              تجربة المستخدم وتسهيل عمليات الشراء والبيع.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-primary border-b border-outline-variant pb-2">
              كيفية استخدام المعلومات
            </h2>
            <p className="text-on-surface-variant">
              نستخدم البيانات فقط لأغراض تشغيل التطبيق وتقديم الخدمات، مثل التواصل بين مقدم الخدمة
              والمشترين، وتحسين الأداء، ودعم المستخدمين.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-primary border-b border-outline-variant pb-2">
              مشاركة بيانات التواصل عند الشراء
            </h2>
            <p className="text-on-surface-variant">
              قد يظهر لمقدم الخدمة بعض بيانات التواصل مثل رقم الهاتف عند شراء منتج أو خدمة منه، وذلك لتنسيق
              التواصل وتسليم الطلب. وبإتمام الشراء، يقر المستخدم بعلمه بذلك، ولا تتحمل ASOL مسؤولية أي استخدام لهذه البيانات خارج
              نطاق تنفيذ الطلب.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-primary border-b border-outline-variant pb-2">
              طبيعة المنصة وحدود المسؤولية
            </h2>
            <p className="text-on-surface-variant">
              تعمل ASOL كمنصة لعرض الخدمات والتواصل بين المستخدمين، ولا تضمن جدية مقدم الخدمة
              أو المشترين ولا جودة المنتج أو الخدمة. ويلتزم المستخدم بعدم الدفع إلا بعد استلام المنتج أو الحصول على الخدمة والتأكد
              منها بنفسه. كما تلتزم ASOL بحذف أي صاحب منتج أو خدمة يثبت من خلال البلاغات أو المراجعة أنه يعرض منتجًا أو
              خدمة غير حقيقية أو يمارس أي نوع من أنواع الغش أو التضليل.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-primary border-b border-outline-variant pb-2">
              مشاركة البيانات
            </h2>
            <p className="text-on-surface-variant">
              لا نقوم بمشاركة بيانات المستخدم مع أي طرف ثالث إلا في حال وجود التزام قانوني أو لتحسين الخدمة
              عبر مزودين موثوقين.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-primary border-b border-outline-variant pb-2">
              أمان البيانات
            </h2>
            <p className="text-on-surface-variant">
              نستخدم تقنيات آمنة لحماية بيانات المستخدم من الوصول غير المصرح به أو التعديل أو الحذف.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-primary border-b border-outline-variant pb-2">
              حقوق المستخدم
            </h2>
            <p className="text-on-surface-variant">
              يحق للمستخدم طلب حذف بياناته أو تعديلها في أي وقت من خلال التواصل معنا عبر البريد الإلكتروني
              أدناه.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-primary border-b border-outline-variant pb-2">
              التحديثات
            </h2>
            <p className="text-on-surface-variant">
              قد نقوم بتحديث سياسة الخصوصية من وقت لآخر، وسيتم نشر أي تغييرات في هذه الصفحة.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-primary border-b border-outline-variant pb-2">
              التواصل معنا
            </h2>
            <p className="text-on-surface-variant">
              لأي استفسار أو ملاحظات، يمكنكم التواصل عبر البريد الإلكتروني:{' '}
              <a href="mailto:suezbazaar@gmail.com" className="text-primary hover:underline">
                suezbazaar@gmail.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
