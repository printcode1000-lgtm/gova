import "server-only";

import nodemailer from "nodemailer";

import { getProductionDeployMailConfig } from "@/core/config/control-env";
import type { ProductionDeployEmail } from "@/features/release-commands/domain/production-deploy-report";

/**
 * Sends the production deploy result to the release mailbox.
 *
 * It reuses the Gmail application password the application already holds for
 * transactional mail; the recipient is declared separately so a release report
 * never lands wherever the last user happened to be.
 */
export async function sendProductionDeployEmail(message: ProductionDeployEmail): Promise<void> {
  const config = getProductionDeployMailConfig();
  if (!config) throw new Error("productionDeployEmailNotConfigured");

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
  });

  await transporter.sendMail({
    from: `ASOL Release <${config.gmailUser}>`,
    to: config.recipient,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
