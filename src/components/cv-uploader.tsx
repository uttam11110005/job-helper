"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardPaste, FileUp, ShieldCheck, UploadCloud } from "lucide-react";
import { parseCVAction, saveCVAction } from "@/app/actions/cv";
import type { CVData } from "@/lib/types";
import { SAMPLE_CV } from "@/lib/sample";
import { Button, Notice, Textarea, cx } from "@/components/ui";
import { CVForm } from "@/components/cv-form";

type Parsed = { parsed: CVData; rawText: string; sourceFile: string | null; sourceType: string };

export function CVUploader({ redirectTo, compact }: { redirectTo?: string; compact?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Parsed | null>(null);
  const [parsing, startParse] = useTransition();
  const [saving, startSave] = useTransition();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parse = () => {
    setError(null);
    const fd = new FormData();
    if (mode === "file" && file) fd.set("file", file);
    else fd.set("text", text);
    startParse(async () => {
      const r = await parseCVAction(fd);
      if (!r.ok) setError(r.error);
      else setReview(r);
    });
  };

  const save = () => {
    if (!review) return;
    startSave(async () => {
      await saveCVAction(review);
      toast.success("CV saved", { description: "Saved as a new version. Earlier versions are kept." });
      setReview(null);
      setFile(null);
      setText("");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  };

  if (review) {
    return (
      <div className="enter space-y-6">
        <Notice tone="info" icon={<ShieldCheck className="size-4" />}>
          Check what we extracted{review.sourceFile ? ` from ${review.sourceFile}` : ""}. Fix anything that is wrong — this becomes the source of truth
          for every job. Tailored versions never overwrite it.
        </Notice>
        <CVForm value={review.parsed} onChange={(parsed) => setReview({ ...review, parsed })} />
        <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-2 rounded-2xl border border-line bg-card/95 p-3 shadow-soft backdrop-blur sm:flex-row sm:justify-end lg:bottom-4">
          <Button variant="ghost" onClick={() => setReview(null)} disabled={saving}>Start over</Button>
          <Button onClick={save} loading={saving}>Save my CV</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="CV input method" className="inline-flex rounded-xl bg-sunken p-1">
        {([["file", "Upload file", FileUp], ["text", "Paste text", ClipboardPaste]] as const).map(([m, label, Icon]) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cx(
              "pressable flex h-9 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-sm font-medium",
              mode === m ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) setFile(f);
          }}
          className={cx(
            "flex flex-col items-center rounded-2xl border-2 border-dashed px-6 text-center transition-colors duration-150",
            compact ? "py-8" : "py-12",
            dragging ? "border-primary bg-primary-soft" : "border-line-strong bg-bg",
          )}
        >
          <UploadCloud className="size-9 text-primary" aria-hidden />
          <p className="mt-3 font-medium">{file ? file.name : "Drop your CV here"}</p>
          <p className="mt-1 text-sm text-muted">{file ? `${(file.size / 1024).toFixed(0)} KB` : "PDF or DOCX preferred · TXT also works · max 4 MB"}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            className="sr-only"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
            {file ? "Choose another file" : "Choose file"}
          </Button>
        </div>
      ) : (
        <Textarea
          rows={compact ? 8 : 12}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Paste your whole CV here — name, experience, education, skills, languages…"}
          aria-label="CV text"
        />
      )}
      {mode === "text" && !text && (
        <button type="button" onClick={() => setText(SAMPLE_CV)} className="cursor-pointer text-[13px] font-medium text-primary hover:underline">
          No CV handy? Try a sample CV
        </button>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-muted">We only read your CV to compare it with jobs you add. You can delete it anytime.</p>
        <Button onClick={parse} loading={parsing} disabled={mode === "file" ? !file : text.trim().length < 50}>
          {parsing ? "Reading CV…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
