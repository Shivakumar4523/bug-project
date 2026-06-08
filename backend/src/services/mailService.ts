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

    try {
      const fromName = options.fromName ?? sender.fromName;
      const info = await transporter.sendMail({
        from: fromName ? { name: fromName, address: sender.user } : sender.user,
        replyTo: options.replyTo,
        to,
        subject,
        html
      });

      console.log("Email sent:", info.messageId);
    } catch (error) {
      console.error("SMTP Error:", error);
      throw error;
    }
  }
};

export const sendIssueAssignedEmail = async ({
  developerEmail,
  developerName,
  issueTitle,
  issueDescription,
  testerName
}: {
  developerEmail: string;
  developerName: string;
  issueTitle: string;
  issueDescription: string;
  testerName: string;
}) => {
  await mailService.send(
    developerEmail,
    `New Issue Assigned - ${issueTitle}`,
    `
    <div style="font-family:Arial,sans-serif">
      <h2>New Issue Assigned</h2>

      <p>Hello ${developerName},</p>

      <p>A new issue has been assigned to you.</p>

      <table border="1" cellpadding="8" cellspacing="0">
        <tr>
          <td><strong>Issue Title</strong></td>
          <td>${issueTitle}</td>
        </tr>

        <tr>
          <td><strong>Description</strong></td>
          <td>${issueDescription}</td>
        </tr>

        <tr>
          <td><strong>Reported By</strong></td>
          <td>${testerName}</td>
        </tr>
      </table>

      <br/>

      <p>Please login and start working on this issue.</p>
    </div>
    `,
    {
      fromName: "Bug Tracker"
    }
  );
};
