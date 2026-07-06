import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Initialize the Supabase Client with Service Role Key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure Nodemailer using your Gmail SMTP environment credentials
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "465"),
  secure: true, // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export async function GET(request: Request) {
  // Optional: Verify CRON secret header for security
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDate = today.getDate();
    const currentYear = today.getFullYear();

    // 1. Fetch employees who have a date of birth set
    const { data: employees, error: fetchError } = await supabase
      .from("employee_credentials")
      .select("id, name, email, dob, sent_emails")
      .not("dob", "is", null);

    if (fetchError) throw fetchError;

    // 2. Filter employees celebrating their birthday today (TIMEZONE SAFE FIX)
    const birthdayEmployees = employees.filter((emp) => {
      // Split '2025-07-07' into ['2025', '07', '07'] directly to avoid local timezone drops
      const [year, month, day] = emp.dob.split('-');
      const dobMonth = parseInt(month, 10);
      const dobDay = parseInt(day, 10);

      const isBirthdayToday = dobMonth === currentMonth && dobDay === currentDate;
      
      const logs = emp.sent_emails || [];
      const alreadySentThisYear = logs.some((log: any) => {
        if (log.type === "birthday" && log.sent_at) {
          return new Date(log.sent_at).getFullYear() === currentYear;
        }
        return false;
      });

      return isBirthdayToday && !alreadySentThisYear;
    });

    if (birthdayEmployees.length === 0) {
      return NextResponse.json({ message: "No birthdays to celebrate today." });
    }

    // 3. Process the mailing loops
    for (const employee of birthdayEmployees) {
      
      // 💌 EMAIL 1: Beautiful Birthday Card template for the Employee
      const employeeHtmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color:#f4f4f5; padding:32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e4e4e7; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <tr>
              <td style="background-color:#9333ea; padding:32px 32px 24px; text-align:center;">
                <span style="font-size:40px;">🎂</span>
                <h1 style="margin:12px 0 0; color:#ffffff; font-size:24px; font-weight:800; line-height:1.2;">
                  Happy Birthday!
                </h1>
                <p style="margin:4px 0 0; color:#ffffff; font-size:12px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; opacity:0.85;">
                  Rakvih Solutions
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px; color:#18181b; font-size:15px; font-weight:600;">
                  Hi ${employee.name},
                </p>
                <p style="margin:0 0 20px; color:#3f3f46; font-size:14px; line-height:1.6;">
                  Wishing you a very Happy Birthday! Thank you for your hard work, dedication, and all the wonderful value you bring everyday to the team. 
                </p>
                <p style="margin:0; color:#3f3f46; font-size:14px; line-height:1.6;">
                  Have an incredible day filled with joy, celebration, and relaxation!
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px; background-color:#fafafa; border-top:1px solid #f0f0f0;">
                <p style="margin:0; font-size:11px; color:#a1a1aa; text-align:center;">
                  Sent with 💜 from your team at Rakvih Solutions Private Limited.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;

      // 🔔 EMAIL 2: Admin Dashboard Alert / Reminder for you
      const adminHtmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color:#f4f4f5; padding:32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e4e4e7; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <tr>
              <td style="background-color:#0284c7; padding:24px 32px;">
                <p style="margin:0; color:#ffffff; font-size:11px; font-weight:700; letter-spacing:0.05em; text-transform:uppercase; opacity:0.85;">
                  Team Reminder Alert
                </p>
                <h1 style="margin:6px 0 0; color:#ffffff; font-size:20px; font-weight:800; line-height:1.2;">
                  Employee Birthday Today
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <p style="margin:0 0 14px; color:#18181b; font-size:14px; font-line:1.5;">
                  Hello Management Team,
                </p>
                <p style="margin:0 0 20px; color:#3f3f46; font-size:14px; line-height:1.6;">
                  This is an automated notification reminding you that today is <strong>${employee.name}</strong>'s birthday!
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; border-radius:12px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 4px; font-size:11px; font-weight:700; text-transform:uppercase; color:#71717a;">
                        Employee Details
                      </p>
                      <p style="margin:0; font-size:15px; font-weight:700; color:#18181b;">
                        ${employee.name}
                      </p>
                      <p style="margin:2px 0 0; font-size:13px; color:#4b5563;">
                        Email: ${employee.email}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px; background-color:#fafafa; border-top:1px solid #f0f0f0;">
                <p style="margin:0; font-size:11px; color:#a1a1aa;">
                  Rakvih Solutions Internal Operational Update Portal.
                </p>
              </td>
            </tr>
          </table>
        </div>
      `;

      // Dispatch Email 1 to Employee
      await transporter.sendMail({
        from: `"Rakvih Solutions" <${process.env.SMTP_USER}>`,
        to: employee.email,
        subject: `Happy Birthday, ${employee.name}! 🎉`,
        html: employeeHtmlBody,
      });

      // Dispatch Email 2 to Admin (rakvihdigital@gmail.com)
      await transporter.sendMail({
        from: `"Rakvih Operations" <${process.env.SMTP_USER}>`,
        to: process.env.SMTP_USER, 
        subject: `🔔 Birthday Reminder: ${employee.name}`,
        html: adminHtmlBody,
      });

      // Append log entry and save to Supabase JSONB
      const currentLogs = employee.sent_emails || [];
      const updatedLogs = [...currentLogs, { type: "birthday", sent_at: new Date().toISOString() }];

      await supabase
        .from("employee_credentials")
        .update({ sent_emails: updatedLogs })
        .eq("id", employee.id);
    }

    return NextResponse.json({ message: `Successfully handled processes for ${birthdayEmployees.length} birthday tracks.` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}