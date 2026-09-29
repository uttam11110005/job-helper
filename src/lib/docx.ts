import "server-only";
import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } from "docx";
import type { CVData } from "./types";

const FONT = "Calibri";

function heading(text: string) {
  return new Paragraph({
    spacing: { before: 240, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F3A5F", space: 2 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 22, font: FONT, color: "1F3A5F" })],
  });
}

function line(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; color?: string } = {}) {
  return new Paragraph({
    spacing: { after: 40 },
    children: [new TextRun({ text, font: FONT, size: opts.size ?? 21, bold: opts.bold, italics: opts.italics, color: opts.color })],
  });
}

/** ATS-readable single-column DOCX (no tables, no text boxes, real text). */
export async function cvToDocx(cv: CVData): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: cv.name || "Your Name", bold: true, size: 40, font: FONT, color: "0F172A" })],
    }),
  ];
  if (cv.headline) children.push(line(cv.headline, { size: 24, color: "334155" }));
  const contact = [cv.location, cv.phone, cv.email].filter(Boolean).join("  |  ");
  if (contact) children.push(line(contact, { size: 20, color: "475569" }));

  if (cv.summary) {
    children.push(heading("Profile"), line(cv.summary));
  }
  if (cv.experience.length) {
    children.push(heading("Work experience"));
    for (const e of cv.experience) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 20 },
          children: [
            new TextRun({ text: e.title, bold: true, font: FONT, size: 22 }),
            new TextRun({ text: e.employer ? ` — ${e.employer}` : "", font: FONT, size: 22 }),
          ],
        }),
      );
      const meta = [[e.start, e.end].filter(Boolean).join(" – "), e.location].filter(Boolean).join("  |  ");
      if (meta) children.push(line(meta, { size: 19, color: "64748B" }));
      for (const b of e.bullets) {
        children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 20 }, children: [new TextRun({ text: b, font: FONT, size: 21 })] }));
      }
    }
  }
  if (cv.skills.length) children.push(heading("Skills"), line(cv.skills.join(" • ")));
  if (cv.languages.length) {
    children.push(heading("Languages"));
    for (const l of cv.languages) children.push(line(`${l.name}${l.level ? ` — ${l.level}` : ""}`));
  }
  if (cv.certificates.length) {
    children.push(heading("Certificates & licences"));
    for (const c of cv.certificates) children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: c, font: FONT, size: 21 })] }));
  }
  if (cv.education.length) {
    children.push(heading("Education"));
    for (const ed of cv.education) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 20 },
          children: [
            new TextRun({ text: ed.degree, bold: true, font: FONT, size: 22 }),
            new TextRun({ text: ed.institution ? ` — ${ed.institution}` : "", font: FONT, size: 22 }),
          ],
        }),
      );
      const dates = [ed.start, ed.end].filter(Boolean).join(" – ");
      if (dates) children.push(line(dates, { size: 19, color: "64748B" }));
      if (ed.details) children.push(line(ed.details));
    }
  }

  const doc = new Document({
    creator: "Job Helper",
    title: `${cv.name} CV`,
    styles: { default: { document: { run: { font: FONT } } } },
    sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children }],
  });
  return Packer.toBuffer(doc);
}
