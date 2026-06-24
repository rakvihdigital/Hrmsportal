import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client Matrix using explicit Environment Variables
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! 
);

const EXPECTED_TYPES = [
  'onboarding',
  'commencement',
  'confirmation',
  'offer_letter',
  'bank_details',
  'appointment',
  'policy_document'
] as const;

const getLabel = (type: string) => {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Email';
};

// =========================================================
// GET: Pull structures straight out of the database
// =========================================================
export async function GET() {
  try {
    const { data: existingTemplates, error: fetchError } = await supabase
      .from("email_templates")
      .select("type, subject, body");

    if (fetchError) throw fetchError;

    const existingTypes = new Set(existingTemplates?.map(t => t.type) || []);
    const missingTemplates = EXPECTED_TYPES.filter(type => !existingTypes.has(type));

    // Auto-seed missing rows if table happens to be completely empty
    if (missingTemplates.length > 0) {
      const seeds = missingTemplates.map(type => ({
        type,
        label: getLabel(type),
        subject: `Regarding Your ${getLabel(type)}`,
        body: `Dear {name},\n\nThis is your official template configuration for ${getLabel(type)}.\n\nBest regards,\nTeam Rakvih.`
      }));

      const { error: seedError } = await supabase
        .from("email_templates")
        .insert(seeds);

      if (seedError) throw seedError;

      const { data: completeData, error: reFetchError } = await supabase
        .from("email_templates")
        .select("type, subject, body");

      if (reFetchError) throw reFetchError;
      return NextResponse.json(completeData);
    }

    return NextResponse.json(existingTemplates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =========================================================
// POST: Permanently write mutations down into Postgres
// =========================================================
export async function POST(request: Request) {
  try {
    const bodyPayload = await request.json();
    const { type, subject, body } = bodyPayload;

    if (!type || !EXPECTED_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid layout identifier token" }, { status: 400 });
    }

    // Direct Database Write Execution
    const { data, error } = await supabase
      .from("email_templates")
      .upsert(
        { 
          type: type, 
          label: getLabel(type),
          subject: subject || '', 
          body: body || '', 
          updated_at: new Date().toISOString() 
        },
        { onConflict: "type" } // Enforces update workflow matching your table constraints
      )
      .select();

    if (error) {
      console.error("Supabase engine rejected database insert mutation:", error);
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Critical API routing pipeline failure:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}