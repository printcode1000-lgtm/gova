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
import { useTranslation } from "@/shared/i18n";
import { contactApiService } from "../application/services/contact-api-service";
import type { ContactMessageInput } from "../application/types";
import { PhoneField } from "@/shared/ui/phone-field";
import { phoneFieldLabels } from "@/shared/phone/phone-field-labels";
import { uiAttributes } from "@asol/ui-registry-core";

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
      ["What are ASOL's responsibility limits regarding sellers, buyers, and the quality of listed products or services?","ASOL operates as a platform for listing products and services and enabling communication between users. It does not guarantee the seriousness of sellers or buyers, nor the quality of any product or service. Users should verify the other party themselves and should not make any payment until they receive the product or obtain the service and confirm it. ASOL also commits to removing any product or service provider proven through reports or review to be offering fake products or services or engaging in any form of fraud or deception."],
    ],
    privacy: "Privacy policy",
    delete: "Delete account",
    options: ["Consulting", "Digital marketing", "Advertising & branding", "Other"],
  },
};

const serviceValues: ContactMessageInput["service"][] = ["consulting", "digital", "branding", "other"];
const serviceIcons = [faChartLine, faBriefcase, faBullhorn];

export function ContactPageContent() {
  const { t, isRTL, locale } = useTranslation();
  const phoneLabels = phoneFieldLabels(t, locale);
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
    <main {...uiAttributes({ uid: "contact.contact-page-content.main.2-p1s8sE", id: "contact.contact-page-content.main.2" })} id="contact.contact-page-content.main" className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8" dir={isRTL ? "rtl" : "ltr"}>
      <section {...uiAttributes({ uid: "contact.contact-page-content.section.6-OCOeo4", id: "contact.contact-page-content.section.6" })} id="contact.contact-page-content.section" className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary p-7 text-white shadow-xl md:p-12">
        <div {...uiAttributes({ uid: "contact.contact-page-content.div.10-Q99KI9", id: "contact.contact-page-content.div.10" })} id="contact.contact-page-content.div" className="max-w-2xl">
          <div {...uiAttributes({ uid: "contact.contact-page-content.div.11-HRDk7R", id: "contact.contact-page-content.div.11" })} id="contact.contact-page-content.div.2" className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon" icon={faHeadset} /> ASOL · أصول</div>
          <h1 {...uiAttributes({ uid: "contact.contact-page-content.h1.2-JoBP7b", id: "contact.contact-page-content.h1.2" })} id="contact.contact-page-content.h1" className="flex items-center gap-3 text-3xl font-bold md:text-5xl"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon.2" icon={faMessage} className="text-3xl md:text-4xl" />{c.title}</h1>
          <p {...uiAttributes({ uid: "contact.contact-page-content.p.5-00UaeH", id: "contact.contact-page-content.p.5" })} id="contact.contact-page-content.p" className="mt-4 text-lg text-white/90">{c.intro}</p>
        </div>
      </section>

      <div {...uiAttributes({ uid: "contact.contact-page-content.div.12-n6LPZD", id: "contact.contact-page-content.div.12" })} id="contact.contact-page-content.div.3" className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <form {...uiAttributes({ uid: "contact-submit-no73V8", id: "contact-submit", kind: "action", interaction: { type: "tap" }, simulation: { kind: "event", id: "contact-submit" } })} onSubmit={submit} className="space-y-5 rounded-3xl border border-outline/30 bg-surface p-6 shadow-sm md:p-8">
          <div {...uiAttributes({ uid: "contact.contact-page-content.div.13-Fksx9Y", id: "contact.contact-page-content.div.13" })} id="contact.contact-page-content.div.4" className="grid gap-4 md:grid-cols-2">
            <Field id="contact.contact-page-content.field" icon={faUser} label={c.name}><input {...uiAttributes({ uid: "contact.contact-page-content.input.3-w1V8gh", id: "contact.contact-page-content.input.3" })} id="contact.contact-page-content.input" required minLength={2} value={form.name} onChange={(event) => set("name", event.target.value)} /></Field>
            <Field id="contact.contact-page-content.field.2" icon={faEnvelope} label={c.email}><input {...uiAttributes({ uid: "contact.contact-page-content.input.4-5NqHvk", id: "contact.contact-page-content.input.4" })} id="contact.contact-page-content.input.2" required type="email" value={form.email} onChange={(event) => set("email", event.target.value)} /></Field>
          </div>
          <div {...uiAttributes({ uid: "contact.contact-page-content.div.14-90LjKG", id: "contact.contact-page-content.div.14" })} id="contact.contact-page-content.div.5" className="grid gap-4 md:grid-cols-2">
            <Field id="contact.contact-page-content.field.3" icon={faPhone} label={c.phone}><PhoneField ui={{ uid: "contact.contact-page-content.phone-field.2-lCg7eS", id: "contact.contact-page-content.phone-field.2" }} id="contact.contact-page-content.phone-field" labels={phoneLabels} value={form.phone ?? ""} inputClassName="rounded-xl border border-outline/40 bg-surface-container p-3" onChange={(value) => set("phone", value)} /></Field>
            <Field id="contact.contact-page-content.field.4" icon={faBriefcase} label={c.service}><select {...uiAttributes({ uid: "contact.contact-page-content.select.2-QRebD5", id: "contact.contact-page-content.select.2" })} id="contact.contact-page-content.select" value={form.service} onChange={(event) => set("service", event.target.value)}>{serviceValues.map((value, index) => <option key={value} {...uiAttributes({ uid: "contact.contact-page-content.option-O0lZHc", id: "contact.contact-page-content.option" })} value={value}>{c.options[index]}</option>)}</select></Field>
          </div>
          <Field id="contact.contact-page-content.field.5" icon={faMessage} label={c.message}><textarea {...uiAttributes({ uid: "contact.contact-page-content.textarea.2-12IaFq", id: "contact.contact-page-content.textarea.2" })} id="contact.contact-page-content.textarea" required minLength={10} rows={6} value={form.message} onChange={(event) => set("message", event.target.value)} /></Field>
          {status === "success" && <p {...uiAttributes({ uid: "contact.contact-page-content.p.6-4ZAAXB", id: "contact.contact-page-content.p.6" })} id="contact.contact-page-content.p.2" className="rounded-xl bg-green-100 p-3 text-green-800"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon.3" icon={faPaperPlane} className="me-2" />{c.success}</p>}
          {status === "error" && <p {...uiAttributes({ uid: "contact.contact-page-content.p.7-gWn9f3", id: "contact.contact-page-content.p.7" })} id="contact.contact-page-content.p.3" className="rounded-xl bg-red-100 p-3 text-red-800"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon.4" icon={faQuestionCircle} className="me-2" />{c.error}</p>}
          <button {...uiAttributes({ uid: "contact.contact-page-content.button.2-Pi1LmZ", id: "contact.contact-page-content.button.2" })} id="contact.contact-page-content.button" disabled={status === "sending"} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-on-primary disabled:opacity-60"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon.5" icon={faPaperPlane} />{status === "sending" ? c.sending : c.send}</button>
        </form>

        <aside {...uiAttributes({ uid: "contact.contact-page-content.aside.2-U8n6KP", id: "contact.contact-page-content.aside.2" })} id="contact.contact-page-content.aside" className="space-y-5">
          <section {...uiAttributes({ uid: "contact.contact-page-content.section.7-3DULBL", id: "contact.contact-page-content.section.7" })} id="contact.contact-page-content.section.2" className="rounded-3xl border border-outline/30 bg-surface p-6 shadow-sm">
            <h2 {...uiAttributes({ uid: "contact.contact-page-content.h2.4-2kUDsH", id: "contact.contact-page-content.h2.4" })} id="contact.contact-page-content.h2" className="mb-5 flex items-center gap-2 text-xl font-bold"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon.6" icon={faHeadset} className="text-primary" />{c.contact}</h2>
            <ContactLine id="contact.contact-page-content.contact-line" icon={faPhone} text="01026546550" href="tel:01026546550" />
            <ContactLine id="contact.contact-page-content.contact-line.2" icon={faPhone} text="01024182175" href="tel:01024182175" />
            <ContactLine id="contact.contact-page-content.contact-line.3" icon={faEnvelope} text="suezbazaar@gmail.com" href="mailto:suezbazaar@gmail.com" />
            <ContactLine id="contact.contact-page-content.contact-line.4" icon={faClock} text={c.hours} />
            <ContactLine id="contact.contact-page-content.contact-line.5" icon={faLocationDot} text={c.location} />
            <div {...uiAttributes({ uid: "contact.contact-page-content.div.15-Mb9JJ3", id: "contact.contact-page-content.div.15" })} id="contact.contact-page-content.div.6" className="mt-5 flex flex-wrap gap-3">{SOCIALS.map((social) => <a key={social.label} {...uiAttributes({ uid: "contact-channel-GY1n2A", id: "contact-channel", kind: "item", interaction: { type: "tap" }, simulation: { kind: "list-item", id: "contact-channel" } })} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label} className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl text-primary transition-transform"><FontAwesomeIcon icon={social.icon} /></a>)}</div>
          </section>
          <section {...uiAttributes({ uid: "contact.contact-page-content.section.8-19Jh0A", id: "contact.contact-page-content.section.8" })} id="contact.contact-page-content.section.3" className="rounded-3xl border border-outline/30 bg-surface p-6 text-center shadow-sm">
            <Image id="contact.contact-page-content.image" src="/images/qr-code.png" width={180} height={180} alt={c.qr} className="mx-auto rounded-xl" />
            <p {...uiAttributes({ uid: "contact.contact-page-content.p.8-50N7NK", id: "contact.contact-page-content.p.8" })} id="contact.contact-page-content.p.4" className="mt-3 text-sm text-on-surface-variant"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon.7" icon={faWhatsapp} className="me-2 text-green-600" />{c.qr}</p>
          </section>
        </aside>
      </div>

      <section {...uiAttributes({ uid: "contact.contact-page-content.section.9-nSUIl0", id: "contact.contact-page-content.section.9" })} id="contact.contact-page-content.section.4">
        <h2 {...uiAttributes({ uid: "contact.contact-page-content.h2.5-xZ71Tu", id: "contact.contact-page-content.h2.5" })} id="contact.contact-page-content.h2.2" className="mb-4 flex items-center gap-2 text-2xl font-bold"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon.8" icon={faBriefcase} className="text-secondary" />{c.servicesTitle}</h2>
        <div {...uiAttributes({ uid: "contact.contact-page-content.div.16-bz9JtB", id: "contact.contact-page-content.div.16" })} id="contact.contact-page-content.div.7" className="grid gap-4 md:grid-cols-3">{c.services.map((item, index) => <div key={item} {...uiAttributes({ uid: "contact.contact-page-content.div.17-oQ5sEN", id: "contact.contact-page-content.div.17" })} className="rounded-2xl border border-outline/30 bg-surface p-6"><div {...uiAttributes({ uid: "contact.contact-page-content.div.18-S3Rcb8", id: "contact.contact-page-content.div.18" })} className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/15 text-xl text-secondary"><FontAwesomeIcon icon={serviceIcons[index]} /></div><h3 {...uiAttributes({ uid: "contact.contact-page-content.h3-V7d4hr", id: "contact.contact-page-content.h3" })} className="font-bold">{item}</h3></div>)}</div>
      </section>

      <section {...uiAttributes({ uid: "contact.contact-page-content.section.10-Jl2QTX", id: "contact.contact-page-content.section.10" })} id="contact.contact-page-content.section.5" className="rounded-3xl border border-outline/30 bg-surface p-6 md:p-8">
        <h2 {...uiAttributes({ uid: "contact.contact-page-content.h2.6-WK7v9W", id: "contact.contact-page-content.h2.6" })} id="contact.contact-page-content.h2.3" className="mb-5 flex items-center gap-3 text-2xl font-bold"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon.9" icon={faQuestionCircle} className="text-primary" />{c.faq}</h2>
        <div {...uiAttributes({ uid: "contact.contact-page-content.div.19-tCM1AV", id: "contact.contact-page-content.div.19" })} id="contact.contact-page-content.div.8" className="space-y-3">{c.faqs.map(([question, answer], index) => <details key={question} {...uiAttributes({ uid: "contact.contact-page-content.details-5ZsaOy", id: "contact.contact-page-content.details" })} className="group rounded-xl bg-surface-container p-4"><summary {...uiAttributes({ uid: "contact.contact-page-content.summary-CJ4naH", id: "contact.contact-page-content.summary" })} className="flex list-none items-center gap-3 font-semibold"><span {...uiAttributes({ uid: "contact.contact-page-content.span-ISfVH6", id: "contact.contact-page-content.span" })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><FontAwesomeIcon icon={faQuestionCircle} /></span><span {...uiAttributes({ uid: "contact.contact-page-content.span.2-l3LNpB", id: "contact.contact-page-content.span.2" })} className="flex-1">{question}</span><FontAwesomeIcon icon={faChevronDown} className="text-primary transition-transform group-open:rotate-180" /></summary><p {...uiAttributes({ uid: "contact.contact-page-content.p.9-Bc0IAf", id: "contact.contact-page-content.p.9" })} className="mt-4 border-t border-outline/20 pt-4 leading-8 text-on-surface-variant">{answer}</p></details>)}</div>
      </section>

      <div {...uiAttributes({ uid: "contact.contact-page-content.div.20-D8WEt3", id: "contact.contact-page-content.div.20" })} id="contact.contact-page-content.div.9" className="grid gap-4 sm:grid-cols-2">
        <Link id="contact.contact-page-content.link" href="/privacy-policy" className="flex items-center gap-3 rounded-2xl border border-outline/30 bg-surface p-5 font-semibold"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon.10" icon={faShieldHalved} className="text-xl text-primary" />{c.privacy}</Link>
        <Link id="contact.contact-page-content.link.2" href="/delete-account" className="flex items-center gap-3 rounded-2xl border border-error/30 bg-error/5 p-5 font-semibold text-error"><FontAwesomeIcon id="contact.contact-page-content.font-awesome-icon.11" icon={faTrashCan} className="text-xl" />{c.delete}</Link>
      </div>
    </main>
  );
}

function Field({ id, icon, label, children }: { icon: IconDefinition; label: string; children: ReactNode } & { id?: string }) {
  return <label {...uiAttributes({ uid: "contact.contact-page-content.label-2q7K5Y", id: "contact.contact-page-content.label" })} id={id} className="block space-y-2 text-sm font-semibold"><span {...uiAttributes({ uid: "contact.contact-page-content.span.3-7v66JO", id: "contact.contact-page-content.span.3" })} className="flex items-center gap-2"><FontAwesomeIcon icon={icon} className="text-primary" />{label}</span><span {...uiAttributes({ uid: "contact.contact-page-content.span.4-mQ5B1G", id: "contact.contact-page-content.span.4" })} className="block [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-outline/40 [&>input]:bg-surface-container [&>input]:p-3 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-outline/40 [&>select]:bg-surface-container [&>select]:p-3 [&>textarea]:w-full [&>textarea]:rounded-xl [&>textarea]:border [&>textarea]:border-outline/40 [&>textarea]:bg-surface-container [&>textarea]:p-3">{children}</span></label>;
}

function ContactLine({ id, icon, text, href }: { icon: IconDefinition; text: string; href?: string } & { id?: string }) {
  const body = <><span {...uiAttributes({ uid: "contact.contact-page-content.span.5-jPZ0eD", id: "contact.contact-page-content.span.5" })} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><FontAwesomeIcon icon={icon} /></span><span {...uiAttributes({ uid: "contact.contact-page-content.span.6-2hhvHl", id: "contact.contact-page-content.span.6" })}>{text}</span></>;
  return href ? <a {...uiAttributes({ uid: "contact.contact-page-content.a-llL3Fe", id: "contact.contact-page-content.a" })} id={id} href={href} className="mb-3 flex items-center gap-3 text-sm">{body}</a> : <div {...uiAttributes({ uid: "contact.contact-page-content.div.21-lWKF2o", id: "contact.contact-page-content.div.21" })} className="mb-3 flex items-center gap-3 text-sm">{body}</div>;
}
