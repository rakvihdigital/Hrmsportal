import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client directly with explicit production keys
const supabaseUrl = 'https://zngenqhpqevhmlmzttaz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuZ2VucWhwcWV2aG1sbXp0dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTcwMTk0NCwiZXhwIjoyMDk1Mjc3OTQ0fQ.awnUoCtGaj_Kj6ainz1RBat_ADAyBAseR03m_ShXJxI';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const toEmail = formData.get('to') as string;
        const recipientName = formData.get('recipientName') as string;
        const subject = formData.get('subject') as string;
        const body = formData.get('body') as string;
        const templateType = formData.get('templateType') as string || 'general';
        const assignedRole = formData.get('assignedRole') as string || 'Web Developer';
        const fileAttachment = formData.get('attachment') as File | null;

        if (!toEmail) {
            return NextResponse.json({ error: 'Target destination email parameters are missing.' }, { status: 400 });
        }

        const senderEmail = 'rakvihdigital@gmail.com';
        const cleanAppPassword = 'dzxbbwypbyrfeiwp';

        // 1. Initialize Nodemailer Configuration
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: senderEmail,
                pass: cleanAppPassword,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // 2. Setup attachment packet arrays
        const attachments: any[] = [];
        if (templateType === 'policy_document' && fileAttachment) {
            const bufferArray = await fileAttachment.arrayBuffer();
            const binaryBuffer = Buffer.from(bufferArray);
            attachments.push({
                filename: fileAttachment.name,
                content: binaryBuffer,
            });
        }

        // 3. Dispatch the raw outbound SMTP payload
        await transporter.sendMail({
            from: `"RAKVIH Solutions" <${senderEmail}>`,
            to: toEmail,
            subject: subject || 'Official Communication from RAKVIH Solutions',
            text: body,
            attachments: attachments
        });

        // 4. Synchronize Database Matrix Logs safely
        try {
            const { data: existingUser, error: checkError } = await supabase
                .from('employee_credentials')
                .select('id, sent_emails')
                .eq('email', toEmail)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingUser) {
                // Parse existing structural logs array or fallback safely
                let currentEmailsList: string[] = [];
                if (existingUser.sent_emails) {
                    currentEmailsList = typeof existingUser.sent_emails === 'string' 
                        ? JSON.parse(existingUser.sent_emails) 
                        : existingUser.sent_emails;
                }
                
                // Add the new template code to our history array list
                if (!currentEmailsList.includes(templateType)) {
                    currentEmailsList.push(templateType);
                }

                const { error: updateError } = await supabase
                    .from('employee_credentials')
                    .update({
                        has_received_email: true,
                        sent_emails: currentEmailsList
                    })
                    .eq('email', toEmail);

                if (updateError) throw updateError;
            } else {
                // Generate secure auto passwords for new candidates
                const generatedTemporaryPassword = "EMP" + Math.random().toString(36).substring(2, 7).toUpperCase() + "@2026";
                
                const { error: insertError } = await supabase
                    .from('employee_credentials')
                    .insert([{
                        name: recipientName || toEmail.split('@')[0],
                        email: toEmail,
                        auto_pass: generatedTemporaryPassword,
                        role: assignedRole,
                        withdrawal_horizon: '1m',
                        has_received_email: true,
                        sent_emails: [templateType]
                    }]);

                if (insertError) throw insertError;
            }
        } catch (dbError) {
            console.error("DATABASE SCHEMA SYNC ERROR:", dbError);
            return NextResponse.json({ error: 'Mail dispatched, but data logging sync failed.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Transmission processed and logged completely.' });

    } catch (error: any) {
        console.error('CRITICAL DISPATCH ERROR:', error);
        return NextResponse.json({ error: error.message || 'SMTP handshaking execution failure' }, { status: 500 });
    }
}