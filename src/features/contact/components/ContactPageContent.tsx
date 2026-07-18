"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faFacebook, faInstagram, faTiktok, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import {
  faBriefcase,
  faBullhorn,
  faChartLine,
  faChevronDown,
  faClock,
  faEnvelope,
  faHeadset,
  faLocationDot,
  faMessage,
  faPaperPlane,
  faPhone,
  faQuestionCircle,
  faShieldHalved,
  faTrashCan,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { useTranslation } from "@/lib/i18n";
import { contactApiService } from "../services/contact-api-service";
import type { ContactMessageInput } from "../types";

const SOCIALS = [
  { href: "https://www.facebook.com/share/1DfPfyv1mg/", label: "Facebook", icon: faFacebook },
  { href: "https://www.instagram.com/suez.bazaar?igsh=MXJma2thbDFxaDE0dg==", label: "Instagram", icon: faInstagram },
  { href: "https://www.tiktok.com/@suez.bazaar?_r=1&_t=ZS-941YlZuVJG0", label: "TikTok", icon: faTiktok },
  { href: "https://wa.me/201026546550", label: "WhatsApp", icon: faWhatsapp },
];

const COPY = {
  ar: {
    title: "تواصل مع أصول",
    intro: "نحن هنا لمساعدتك. أرسل رسالتك وسيرد عليك فريق أصول في أقرب وقت.",
    name: "الاسم",
    email: "البريد الإلكتروني",
    phone: "رقم الهاتف (اختياري)",
    service: "نوع الخدمة",
    message: "كيف يمكننا مساعدتك؟",
    send: "إرسال الرسالة",
    sending: "جارٍ الإرسال…",
    success: "تم إرسال رسالتك بنجاح.",
    error: "تعذر إرسال الرسالة. تحقق من البيانات وحاول لاحقًا.",
    contact: "بيانات التواصل",
    hours: "يوميًا من 9 صباحًا إلى 10 مساءً",
    location: "السويس، مصر",
    qr: "امسح الرمز للتواصل السريع",
    servicesTitle: "خدماتنا",
    services: ["التسويق الرقمي", "تحليل السوق", "الإعلانات وبناء الهوية"],
    faq: "الأسئلة الشائعة",
    faqs: [
      ["لماذا نثق في خدماتنا؟", "نثق في خدماتنا لأنها تعمل على بنية تحتية سحابية عالمية توفر استقرارًا عاليًا وسرعة في الاستجابة ووقت تشغيل مرتفع. هذا التطبيق يعتمد على خدمات وتقنيات متقدمة من Google لدعم الأداء، وحماية البيانات، واستمرارية الخدمة بأعلى قدر ممكن من الأمان والاعتمادية."],
      ["كيف تعمل أصول في التسجيل أو شراء أو بيع منتج؟", "التسجيل في أصول مجاني تمامًا وسيظل مجانيًا دون رسوم أو اشتراكات. يمكنك شراء أي منتج بسهولة وإتمام الطلب ومتابعة حالته حتى الاستلام."],
      ["كيف يمكنني عمل إعلان أو حملة تسويقية مجانية أو مخصصة؟", "بمجرد إنشاء صفحتك الخاصة على أصول، فإنها تصبح واجهة إعلانية مميزة لك، حيث يمكنك إضافة خدماتك، وإبراز المميز منها، وعرض معلوماتك للتواصل، كما يمكنك مشاركة صفحتك مع أي شخص في أي مكان. ويمكنك أيضًا إنشاء حملة دائمة داخل أصول عبر إضافة منتج خدمي ليظهر للمستخدمين كإعلان مستمر، أو التواصل معنا لطلب حملات عامة أو مخصصة تناسب نشاطك."],
      ["هل تقدمون خدمات تسويقية للشركات الصغيرة؟", "نعم، نقدم حلولًا تسويقية تناسب الشركات الناشئة والصغيرة والمتوسطة وحتى المؤسسات الكبيرة، مع خيارات مرنة حسب الميزانية والهدف."],
      ["ما حدود مسؤولية أصول تجاه مقدمي الخدمة والمشترين وجودة المعروض؟", "تعمل أصول كمنصة لعرض المنتجات والخدمات والتواصل بين المستخدمين، وهي لا تضمن جدية مقدم الخدمة أو المشتري ولا جودة المنتج أو الخدمة. لذلك يجب على المستخدم التأكد بنفسه من الطرف الآخر، وعدم دفع أي مبلغ إلا بعد استلام المنتج أو الحصول على الخدمة والتأكد منها. كما تلتزم أصول بحذف أي صاحب منتج أو خدمة يثبت من خلال البلاغات أو المراجعة أنه يعرض منتجًا أو خدمة غير حقيقية أو يمارس أي نوع من أنواع الغش أو التضليل."],
    ],
    privacy: "سياسة الخصوصية",
    delete: "حذف الحساب",
    options: ["استشارة", "تسويق رقمي", "إعلانات وهوية", "أخرى"],
  },
  en: {
    title: "Contact ASOL",
    intro: "We are here to help. Send your message and the ASOL team will reply as soon as possible.",
    name: "Name",
    email: "Email",
    phone: "Phone (optional)",
    service: "Service",
    message: "How can we help?",
    send: "Send message",
    sending: "Sending…",
    success: "Your message was sent successfully.",
    error: "Message could not be sent. Check the details and try again later.",
    contact: "Contact details",
    hours: "Daily, 9 AM to 10 PM",
    location: "Suez, Egypt",
    qr: "Scan for quick contact",
    servicesTitle: "Our services",
    services: ["Digital marketing", "Market analysis", "Advertising and branding"],
    faq: "Frequently Asked Questions",
    faqs: [
      ["Why do we trust our services?", "We trust our services because they run on a global cloud infrastructure that provides strong stability, fast response times, and high uptime. This app relies on advanced Google cloud services and technologies to support performance, data protection, and reliable service continuity."],
      ["How does ASOL work for registration, buying, or selling a product?", "Registration on ASOL is completely free and stays free. You can buy products easily, complete the order, and track it until delivery."],
      ["How can I create a free or customized advertisement or marketing campaign?", "Once you create your own page on ASOL, it becomes a distinctive promotional storefront for you, where you can add your products, highlight featured ones, show your contact information, and share your page with anyone anywhere. You can also create an ongoing campaign inside ASOL by adding a service product that appears to users as a continuous ad, or contact us for general or customized campaigns that suit your business."],
      ["Do you provide marketing services for small businesses?", "Yes. We provide marketing solutions for startups, small and medium businesses, and larger companies, with flexible options based on budget and goals."],
      ["What are ASOL's responsibility limits regarding sellers, buyers, and the quality of listed products or services?", "ASOL operates as a platform for listing products and services and enabling communication between users. It does not guarantee the seriousness of sellers or buyers, nor the quality of any product or service. Users should verify the other party themselves and should not make any payment until they receive the product or obtain the service and confirm it. ASOL also commits to removing any product or service provider proven through reports or review to be offering fake products or services or engaging in any form of fraud or deception."],
    ],
    privacy: "Privacy policy",
    delete: "Delete account",
    options: ["Consulting", "Digital marketing", "Advertising & branding", "Other"],
  },
};

const serviceValues: ContactMessageInput["service"][] = ["consulting", "digital", "branding", "other"];
const serviceIcons = [faChartLine, faBriefcase, faBullhorn];

export function ContactPageContent() {
  const { isRTL } = useTranslation();
  const c = isRTL ? COPY.ar : COPY.en;
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [form, setForm] = useState<ContactMessageInput>({ name: "", email: "", phone: "", service: "consulting", message: "" });
  const set = (key: keyof ContactMessageInput, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    try {
      await contactApiService.send(form);
      setStatus("success");
      setForm({ name: "", email: "", phone: "", service: "consulting", message: "" });
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary p-7 text-white shadow-xl md:p-12">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm"><FontAwesomeIcon icon={faHeadset} /> ASOL · أصول</div>
          <h1 className="flex items-center gap-3 text-3xl font-bold md:text-5xl"><FontAwesomeIcon icon={faMessage} className="text-3xl md:text-4xl" />{c.title}</h1>
          <p className="mt-4 text-lg text-white/90">{c.intro}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-outline/30 bg-surface p-6 shadow-sm md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            <Field icon={faUser} label={c.name}><input required minLength={2} value={form.name} onChange={(event) => set("name", event.target.value)} /></Field>
            <Field icon={faEnvelope} label={c.email}><input required type="email" value={form.email} onChange={(event) => set("email", event.target.value)} /></Field>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field icon={faPhone} label={c.phone}><input inputMode="tel" value={form.phone} onChange={(event) => set("phone", event.target.value)} /></Field>
            <Field icon={faBriefcase} label={c.service}><select value={form.service} onChange={(event) => set("service", event.target.value)}>{serviceValues.map((value, index) => <option key={value} value={value}>{c.options[index]}</option>)}</select></Field>
          </div>
          <Field icon={faMessage} label={c.message}><textarea required minLength={10} rows={6} value={form.message} onChange={(event) => set("message", event.target.value)} /></Field>
          {status === "success" && <p className="rounded-xl bg-green-100 p-3 text-green-800"><FontAwesomeIcon icon={faPaperPlane} className="me-2" />{c.success}</p>}
          {status === "error" && <p className="rounded-xl bg-red-100 p-3 text-red-800"><FontAwesomeIcon icon={faQuestionCircle} className="me-2" />{c.error}</p>}
          <button disabled={status === "sending"} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary disabled:opacity-60"><FontAwesomeIcon icon={faPaperPlane} />{status === "sending" ? c.sending : c.send}</button>
        </form>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-outline/30 bg-surface p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-xl font-bold"><FontAwesomeIcon icon={faHeadset} className="text-primary" />{c.contact}</h2>
            <ContactLine icon={faPhone} text="01026546550" href="tel:01026546550" />
            <ContactLine icon={faPhone} text="01024182175" href="tel:01024182175" />
            <ContactLine icon={faEnvelope} text="suezbazaar@gmail.com" href="mailto:suezbazaar@gmail.com" />
            <ContactLine icon={faClock} text={c.hours} />
            <ContactLine icon={faLocationDot} text={c.location} />
            <div className="mt-5 flex flex-wrap gap-3">{SOCIALS.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noreferrer" title={social.label} className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary transition-transform hover:-translate-y-1"><FontAwesomeIcon icon={social.icon} /></a>)}</div>
          </section>
          <section className="rounded-3xl border border-outline/30 bg-surface p-6 text-center shadow-sm">
            <Image src="/images/qr-code.png" width={180} height={180} alt={c.qr} className="mx-auto rounded-xl" />
            <p className="mt-3 text-sm text-on-surface-variant"><FontAwesomeIcon icon={faWhatsapp} className="me-2 text-green-600" />{c.qr}</p>
          </section>
        </aside>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold"><FontAwesomeIcon icon={faBriefcase} className="text-secondary" />{c.servicesTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3">{c.services.map((item, index) => <div key={item} className="rounded-2xl border border-outline/30 bg-surface p-6"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15 text-xl text-secondary"><FontAwesomeIcon icon={serviceIcons[index]} /></div><h3 className="font-bold">{item}</h3></div>)}</div>
      </section>

      <section className="rounded-3xl border border-outline/30 bg-surface p-6 md:p-8">
        <h2 className="mb-5 flex items-center gap-3 text-2xl font-bold"><FontAwesomeIcon icon={faQuestionCircle} className="text-primary" />{c.faq}</h2>
        <div className="space-y-3">{c.faqs.map(([question, answer], index) => <details key={question} className="group rounded-xl bg-surface-container p-4"><summary className="flex cursor-pointer list-none items-center gap-3 font-semibold"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><FontAwesomeIcon icon={faQuestionCircle} /></span><span className="flex-1">{question}</span><FontAwesomeIcon icon={faChevronDown} className="text-primary transition-transform group-open:rotate-180" /></summary><p className="mt-4 border-t border-outline/20 pt-4 leading-8 text-on-surface-variant">{answer}</p></details>)}</div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/privacy-policy" className="flex items-center gap-3 rounded-2xl border border-outline/30 bg-surface p-5 font-semibold"><FontAwesomeIcon icon={faShieldHalved} className="text-xl text-primary" />{c.privacy}</Link>
        <Link href="/delete-account" className="flex items-center gap-3 rounded-2xl border border-error/30 bg-error/5 p-5 font-semibold text-error"><FontAwesomeIcon icon={faTrashCan} className="text-xl" />{c.delete}</Link>
      </div>
    </main>
  );
}

function Field({ icon, label, children }: { icon: IconDefinition; label: string; children: ReactNode }) {
  return <label className="block space-y-2 text-sm font-semibold"><span className="flex items-center gap-2"><FontAwesomeIcon icon={icon} className="text-primary" />{label}</span><span className="block [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-outline/40 [&>input]:bg-surface-container [&>input]:p-3 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-outline/40 [&>select]:bg-surface-container [&>select]:p-3 [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-outline/40 [&>textarea]:bg-surface-container [&>textarea]:p-3">{children}</span></label>;
}

function ContactLine({ icon, text, href }: { icon: IconDefinition; text: string; href?: string }) {
  const body = <><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FontAwesomeIcon icon={icon} /></span><span>{text}</span></>;
  return href ? <a href={href} className="mb-3 flex items-center gap-3 text-sm">{body}</a> : <div className="mb-3 flex items-center gap-3 text-sm">{body}</div>;
}
