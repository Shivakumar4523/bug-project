import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const mailService = {
  async send(to: string, subject: string, html: string, options: { fromName?: string; replyTo?: string } = {}) {
    if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
      console.log(`[email skipped] ${to} | ${subject}`);
      return;
    }
    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      auth: { user: env.smtp.user, pass: env.smtp.pass }
    });
    await transporter.sendMail({
      from: options.fromName ? { name: options.fromName, address: env.smtp.user } : env.smtp.user,
      replyTo: options.replyTo,
      to,
      subject,
      html
    });
  }
};
