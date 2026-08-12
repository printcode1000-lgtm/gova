import "server-only";
import nodemailer from "nodemailer";
import { getPasswordRecoveryConfig } from "@/core/config/server-env";
import type { ContactMessageInput, ContactMessageResult } from "../types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SERVICES = new Set(["consulting", "digital", "branding", "other"]);
const attempts = new Map<string, number[]>();
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]!);

function assertRateLimit(ip: string) {
  const now = Date.now(), start = now - 15 * 60 * 1000;
  const recent = (attempts.get(ip) ?? []).filter((time) => time >= start);
  if (recent.length >= 3) throw new Error("contactRateLimited");
  attempts.set(ip, [...recent, now]);
}

export class ContactService {
  async send(raw: ContactMessageInput, ip: string): Promise<ContactMessageResult> {
    assertRateLimit(ip);
    const input = { name: clean(raw?.name, 100), email: clean(raw?.email, 180).toLowerCase(), phone: clean(raw?.phone, 30), service: clean(raw?.service, 30), message: clean(raw?.message, 4000) };
    if (input.name.length < 2 || !EMAIL.test(input.email) || input.message.length < 10 || !SERVICES.has(input.service)) throw new Error("invalidContactMessage");
    const config = getPasswordRecoveryConfig();
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: config.gmailUser, pass: config.gmailAppPassword } });
    await transporter.sendMail({
      from: `ASOL <${config.gmailUser}>`, to: "suezbazaar@gmail.com", replyTo: `${input.name} <${input.email}>`,
      subject: `رسالة تواصل جديدة من ${input.name} - أصول`,
      text: `الاسم: ${input.name}\nالبريد: ${input.email}\nالهاتف: ${input.phone || "غير مذكور"}\nالخدمة: ${input.service}\n\n${input.message}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>رسالة تواصل جديدة - أصول</h2><p><b>الاسم:</b> ${escapeHtml(input.name)}</p><p><b>البريد:</b> ${escapeHtml(input.email)}</p><p><b>الهاتف:</b> ${escapeHtml(input.phone || "غير مذكور")}</p><p><b>الخدمة:</b> ${escapeHtml(input.service)}</p><hr><p>${escapeHtml(input.message).replace(/\n/g, "<br>")}</p></div>`,
    });
    return { sent: true };
  }
}
export const contactService = new ContactService();
