import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // needs service role to bypass RLS
);

export async function POST(req: NextRequest) {
  try {
    const { recordId, uploadedDocs } = await req.json();

    if (!uploadedDocs || uploadedDocs.length === 0) {
      return NextResponse.json({ error: "No documents found" }, { status: 400 });
    }

    const mergedPdf = await PDFDocument.create();

    for (const doc of uploadedDocs) {
      try {
        // Download file from Supabase Storage
        const { data, error } = await supabase.storage
          .from("onboarding-docs")
          .download(doc.filePath);

        if (error || !data) {
          console.warn(`Skipping ${doc.filePath}:`, error?.message);
          continue;
        }

        const fileBytes = await data.arrayBuffer();
        const fileName = doc.fileName.toLowerCase();

        if (fileName.endsWith(".pdf")) {
          // Merge PDF pages
          const pdf = await PDFDocument.load(fileBytes, {
            ignoreEncryption: true,
          });
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));

        } else if (
          fileName.endsWith(".jpg") ||
          fileName.endsWith(".jpeg") ||
          fileName.endsWith(".png") ||
          fileName.endsWith(".webp")
        ) {
          // Embed image as a PDF page
          let image;
          if (fileName.endsWith(".png")) {
            image = await mergedPdf.embedPng(fileBytes);
          } else {
            image = await mergedPdf.embedJpg(fileBytes);
          }

          const page = mergedPdf.addPage();
          const { width, height } = image.scaleToFit(page.getWidth(), page.getHeight());
          page.drawImage(image, {
            x: (page.getWidth() - width) / 2,
            y: (page.getHeight() - height) / 2,
            width,
            height,
          });
        }
      } catch (fileErr) {
        console.warn(`Failed to process ${doc.filePath}:`, fileErr);
        continue; // skip bad files, don't fail entire merge
      }
    }

    const mergedBytes = await mergedPdf.save();

    // Upload merged PDF back to Supabase Storage
    const mergedPath = `${recordId}/Master_Docs.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("onboarding-docs")
      .upload(mergedPath, mergedBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw new Error(uploadError.message);

    // Generate signed URL
    const { data: signedData, error: signedError } = await supabase.storage
      .from("onboarding-docs")
      .createSignedUrl(mergedPath, 3600);

    if (signedError) throw new Error(signedError.message);

    return NextResponse.json({ url: signedData.signedUrl });

  } catch (err: any) {
    console.error("Merge error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}