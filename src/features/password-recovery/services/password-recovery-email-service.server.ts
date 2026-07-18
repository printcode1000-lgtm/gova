import 'server-only';

import nodemailer from 'nodemailer';
import { getPasswordRecoveryConfig } from '@/core/config/server-env';

export class PasswordRecoveryEmailService {
  async sendCode(email: string, code: string): Promise<void> {
    const config = getPasswordRecoveryConfig();
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.gmailUser, pass: config.gmailAppPassword },
    });

    await transporter.sendMail({
      from: `ASOL <${config.gmailUser}>`,
      to: email,
      subject: 'رمز استعادة كلمة المرور - ASOL',
      text: `رمز استعادة كلمة المرور هو: ${code}\nينتهي الرمز خلال 10 دقائق.\nإذا لم تطلب هذا الرمز فتجاهل الرسالة.`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8">
        <h2>استعادة كلمة المرور</h2>
        <p>استخدم الرمز التالي لإكمال استعادة حسابك:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
        <p>ينتهي الرمز خلال 10 دقائق.</p>
        <p style="color:#666">إذا لم تطلب هذا الرمز فتجاهل الرسالة.</p>
      </div>`,
    });
  }
}
