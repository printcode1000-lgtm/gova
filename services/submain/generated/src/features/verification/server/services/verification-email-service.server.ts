import "server-only";

import nodemailer from "nodemailer";
import { getPasswordRecoveryConfig } from "@/core/config/server-env";
import type { VerificationPurpose } from "@asol/verification-core";

function purposeTitle(purpose: VerificationPurpose): string {
  if (purpose === "registration") return "تسجيل حساب جديد";
  if (purpose === "primary_phone_change") return "تغيير رقم الهاتف";
  return "استعادة كلمة المرور";
}

export class VerificationEmailService {
  async sendCode(input: { email: string; code: string; purpose: VerificationPurpose }): Promise<void> {
    const config = getPasswordRecoveryConfig();
    const title = purposeTitle(input.purpose);
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: config.gmailUser, pass: config.gmailAppPassword },
    });

    await transporter.sendMail({
      from: `Pbook <${config.gmailUser}>`,
      to: input.email,
      subject: `رمز التحقق - ${title} - بيبوك`,
      text: `رمز التحقق هو: ${input.code}\nينتهي الرمز خلال 10 دقائق.\nإذا لم تطلب هذا الرمز فتجاهل الرسالة.`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
        <h2>${title}</h2>
        <p>استخدم الرمز التالي لإكمال التحقق:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${input.code}</p>
        <p>ينتهي الرمز خلال 10 دقائق.</p>
        <p style="color:#666">إذا لم تطلب هذا الرمز فتجاهل الرسالة.</p>
      </div>`,
    });
  }
}
