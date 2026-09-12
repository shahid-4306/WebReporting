import nodemailer from "nodemailer";

let transporter = null;
function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: (process.env.SMTP_SECURE || "false").toLowerCase() === "true",
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    // No SMTP configured — this is fine for local development. Print the
    // message so this (and the weekly summary email) is still testable
    // without a real mail account.
    console.log(`\n[dev email] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return { devMode: true };
  }
  return t.sendMail({ from: process.env.SMTP_FROM || "no-reply@example.com", to, subject, text, html });
}
