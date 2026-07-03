import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { email, subject, html, message } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "No recipient email" }, { status: 400 });
    }

    if (!process.env.SMTP_USER || !process.env.EMAIL_APP_PASSWORD) {
      console.error("SMTP_USER or EMAIL_APP_PASSWORD is not set");
      return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Attendance System" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject || "Attendance Notification",
      html: html || undefined,
      text: message || (html ? undefined : "Attendance notification"),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("send-attendance-email error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}