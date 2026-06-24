import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Uses the SERVICE ROLE key because this runs server-side only (never exposed to the browser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  // --- Protect this route so only Vercel Cron (or someone with the secret) can trigger it ---
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch every employee with a dob set. We filter for "today" in JS rather than
    // in SQL so this works correctly regardless of your DB server's timezone setting,
    // and so we control which timezone "today" means (see TIMEZONE below).
    const { data: employees, error } = await supabase
      .from("employee_credentials")
      .select("id, name, employee_id, email, role, dob")
      .not("dob", "is", null);

    if (error) throw error;

    // Change this to your business timezone if different
    const TIMEZONE = "Asia/Kolkata";
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: TIMEZONE }); // YYYY-MM-DD
    const [, todayMonth, todayDay] = todayStr.split("-");

    const birthdaysToday = (employees || []).filter((emp) => {
      if (!emp.dob) return false;
      const [, month, day] = emp.dob.split("-"); // dob is stored as YYYY-MM-DD
      return month === todayMonth && day === todayDay;
    });

    if (birthdaysToday.length === 0) {
      return NextResponse.json({ message: "No birthdays today", checked: employees?.length || 0 });
    }

    // --- Build and send the internal notice email ---
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465, // true for port 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    const listHtml = birthdaysToday
      .map(
        (emp) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:700;">${emp.name}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${emp.employee_id ?? "—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${emp.role ?? "—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${emp.email ?? "—"}</td>
        </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#505824;">🎂 Today's Employee Birthdays</h2>
        <p style="color:#555;font-size:13px;">The following employee(s) have a birthday today (${todayStr}):</p>
        <table style="border-collapse:collapse;width:100%;font-size:13px;">
          <thead>
            <tr style="background:#f5f5f0;text-align:left;">
              <th style="padding:8px 12px;">Name</th>
              <th style="padding:8px 12px;">Employee ID</th>
              <th style="padding:8px 12px;">Role</th>
              <th style="padding:8px 12px;">Email</th>
            </tr>
          </thead>
          <tbody>${listHtml}</tbody>
        </table>
        <p style="color:#999;font-size:11px;margin-top:24px;">Automated reminder — Employee Credentials System.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Employee Credentials System" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // internal notice goes to your own SMTP inbox
      subject: `🎂 Birthday Reminder: ${birthdaysToday.map((e) => e.name).join(", ")}`,
      html,
    });

    return NextResponse.json({
      message: "Birthday email sent",
      count: birthdaysToday.length,
      names: birthdaysToday.map((e) => e.name),
    });
  } catch (err: any) {
    console.error("Birthday cron error:", err);
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}