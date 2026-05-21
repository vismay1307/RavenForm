import nodemailer from "nodemailer";
import { logger } from "@repo/logger";
import { env } from "../env";

export class MailerService {
  private readonly transporter = env.SMTP_HOST
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER && env.SMTP_PASS
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
      })
    : nodemailer.createTransport({
        jsonTransport: true,
      });

  public async sendOtpEmail(input: {
    email: string;
    otp: string;
    purpose: "email_verification" | "password_reset";
  }) {
    const actionText =
      input.purpose === "email_verification" ? "verify your RavenForm account" : "reset your password";

    const info = await this.transporter.sendMail({
      from: env.MAIL_FROM,
      to: input.email,
      subject:
        input.purpose === "email_verification"
          ? "RavenForm email verification OTP"
          : "RavenForm password reset OTP",
      text: `Your OTP to ${actionText} is ${input.otp}. It expires in 60 seconds.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#111018;color:#f5f5f4;border:1px solid #292524;border-radius:16px;">
          <p style="letter-spacing:0.2em;text-transform:uppercase;color:#fbbf24;font-size:12px;">RavenForm</p>
          <h1 style="font-size:24px;margin:12px 0 16px;">Use this OTP to ${actionText}</h1>
          <div style="font-size:32px;font-weight:700;letter-spacing:0.35em;padding:16px 20px;background:#1c1917;border-radius:12px;color:#fcd34d;text-align:center;">
            ${input.otp}
          </div>
          <p style="margin-top:16px;color:#d6d3d1;">This OTP expires in 60 seconds.</p>
        </div>
      `,
    });

    if (!env.SMTP_HOST) {
      logger.info("OTP email captured via nodemailer json transport", {
        email: input.email,
        purpose: input.purpose,
        preview: JSON.stringify(info),
      });
    }
  }
}

export default MailerService;
