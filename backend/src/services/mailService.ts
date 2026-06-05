import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { decryptSecret } from "../utils/secretCrypto.js";

type MailOptions = {
  fromName?: string;
  replyTo?: string;
  senderUserId?: string;
};

type SmtpSender = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName?: string;
};

async function userSmtpSender(userId?: string): Promise<SmtpSender | null> {
  if (!userId) return null;

  const user = await User.findById(userId).select("name smtp");
  if (!user) return null;

  const smtp = user.smtp;
  if (!smtp?.enabled || !smtp.host || !smtp.user || !smtp.passEncrypted) return null;

  const pass = decryptSecret(smtp.passEncrypted);
  if (!pass) return null;

  return {
    host: smtp.host,
    port: smtp.port || 587,
    secure: Boolean(smtp.secure),
    user: smtp.user,
    pass,
    fromName: smtp.fromName || user.name
  };
}

function defaultSmtpSender(): SmtpSender | null {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) return null;
  return {
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    user: env.smtp.user,
    pass: env.smtp.pass
  };
}

export const mailService = {
  async send(to: string, subject: string, html: string, options: MailOptions = {}) {
    const sender = (await userSmtpSender(options.senderUserId)) ?? defaultSmtpSender();
    if (!sender) {
      console.log(`[email skipped] ${to} | ${subject}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: sender.host,
      port: sender.port,
      secure: sender.secure,
      auth: { user: sender.user, pass: sender.pass }
    });
    await transporter.sendMail({
      from: options.fromName || sender.fromName ? { name: options.fromName ?? sender.fromName!, address: sender.user } : sender.user,
      replyTo: options.replyTo,
      to,
      subject,
      html
    });
  }
};
