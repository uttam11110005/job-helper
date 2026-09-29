import "server-only";

/** Extracts plain text from an uploaded CV (PDF, DOCX or TXT). */
export async function extractCVText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(buf);
    const { text } = await extractText(pdf, { mergePages: true });
    return tidy(text);
  }
  if (name.endsWith(".docx") || file.type.includes("wordprocessingml")) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return tidy(value);
  }
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return tidy(new TextDecoder().decode(buf));
  }
  throw new Error("Unsupported file type. Please upload a PDF, DOCX or TXT file.");
}

function tidy(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
