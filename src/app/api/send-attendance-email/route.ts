import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { email, subject, html } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "No recipient email" }, { status: 400 });
    }

    await resend.emails.send({
      from: "Attendance <attendance@yourdomain.com>",
      to: email,
      subject,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-attendance-email error:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}