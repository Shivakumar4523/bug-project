import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export const mailService = {
  async send(
    to: string,
    subject: string,
    html: string,
    options: { fromName?: string; replyTo?: string } = {}
  ) {
    if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
      console.log(`[email skipped] ${to} | ${subject}`);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: Number(env.smtp.port),
      secure: Number(env.smtp.port) === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass
      }
    });

    try {
      const info = await transporter.sendMail({
        from: options.fromName
          ? {
              name: options.fromName,
              address: env.smtp.user
            }
          : env.smtp.user,
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
