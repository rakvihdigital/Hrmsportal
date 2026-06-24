import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zngenqhpqevhmlmzttaz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ2VucWhwcWV2aG1sbXp0dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcwMTk0NCwiZXhwIjoyMDk1Mjc3OTQ0fQ.awnUoCtGaj_Kj6ainz1RBat_ADAyBAseR03m_ShXJxI';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('employee_credentials')
            .select('id, employee_id, name, email, role, has_received_email, sent_emails, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error("Employee list dashboard lookup error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}