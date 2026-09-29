"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardPaste, ImagePlus, Images, Sparkles, X } from "lucide-react";
import { createJobFromImagesAction, createJobFromTextAction } from "@/app/actions/jobs";
import { SAMPLE_JOB_AD } from "@/lib/sample";
import { Button, Notice, Textarea, cx } from "@/components/ui";
import { UpgradeDialog } from "@/components/upgrade";
import { AnalysisProgress } from "@/components/analysis-progress";

const MAX = 6;
type Shot = { file: File; url: string };

export function JobInput() {
  const router = useRouter();
  const [mode, setMode] = useState<"text" | "images">("text");
  const [text, setText] = useState("");
  const [shots, setShots] = useState<Shot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);
  const [pending, start] = useTransition();
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => shots.forEach((s) => URL.revokeObjectURL(s.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Shrink large screenshots in the browser so an upload stays under the host's
  // request limit (4.5 MB on Vercel) while text remains sharp enough to read.
  const shrink = async (file: File): Promise<File> => {
    if (file.size < 600_000) return file;
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : file;
  };

  const addFiles = async (files: FileList | File[]) => {
    const list = [...files];
    const imgs = list.filter((f) => /image\/(png|jpe?g|webp)/.test(f.type));
    if (imgs.length < list.length) setError("Only PNG, JPG or WebP images are supported.");
    else setError(null);
    const small = await Promise.all(imgs.map(shrink));
    setShots((s) => [...s, ...small.map((file) => ({ file, url: URL.createObjectURL(file) }))].slice(0, MAX));
  };

  // Paste screenshots straight from the clipboard.
  useEffect(() => {
    if (mode !== "images") return;
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) addFiles(files);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [mode]);

  const move = (i: number, d: -1 | 1) =>
    setShots((s) => {
      const n = [...s];
      [n[i], n[i + d]] = [n[i + d], n[i]];
      return n;
    });

  const submit = () => {
    setError(null);
    start(async () => {
      if (mode === "text") {
        const r = await createJobFromTextAction(text);
        if (r.ok) router.push(`/jobs/${r.jobId}/analysis`);
        else if (r.code === "LIMIT") setLimit(true);
        else setError(r.error);
      } else {
        const fd = new FormData();
        shots.forEach((s) => fd.append("images", s.file));
        const r = await createJobFromImagesAction(fd);
        if (r.ok) router.push(`/jobs/${r.jobId}/review`);
        else if (r.code === "LIMIT") setLimit(true);
        else setError(r.error);
      }
    });
  };

  if (pending && mode === "text") return <AnalysisProgress />;

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Job ad input" className="grid grid-cols-2 gap-2 sm:inline-grid sm:w-auto">
        {([["text", "Paste text", ClipboardPaste], ["images", "Screenshots", Images]] as const).map(([m, label, Icon]) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={cx(
              "pressable flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium",
              mode === m ? "border-primary bg-primary-soft text-primary-soft-ink" : "border-line bg-card text-ink-2 hover:border-line-strong",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      {mode === "text" ? (
        <div className="space-y-2">
          <Textarea
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the full job advertisement here (Finnish, Swedish or English)…"
            aria-label="Job advertisement text"
          />
          <div className="flex items-center justify-between text-[13px] text-muted">
            <button type="button" onClick={() => setText(SAMPLE_JOB_AD)} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md font-medium text-primary hover:underline">
              <Sparkles className="size-3.5" aria-hidden /> Try an example ad
            </button>
            <span className="tabular-nums">{text.length.toLocaleString()} characters</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            className={cx(
              "flex flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors duration-150",
              dragging ? "border-primary bg-primary-soft" : "border-line-strong bg-bg",
            )}
          >
            <ImagePlus className="size-9 text-primary" aria-hidden />
            <p className="mt-3 font-medium">Drop screenshots of the job ad</p>
            <p className="mt-1 text-sm text-muted">Up to {MAX} images, in reading order · PNG, JPG, WebP · or paste with ⌘V / Ctrl+V</p>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={(e) => e.target.files && addFiles(e.target.files)} />
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => fileRef.current?.click()} disabled={shots.length >= MAX}>
              Choose images
            </Button>
          </div>
          {shots.length > 0 && (
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {shots.map((s, i) => (
                <li key={s.url} className="group relative overflow-hidden rounded-xl border border-line bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.url} alt={`Screenshot ${i + 1}`} className="aspect-[3/4] w-full object-cover object-top" />
                  <span className="absolute top-2 left-2 grid size-6 place-items-center rounded-full bg-ink/80 text-xs font-semibold text-bg tabular-nums">{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setShots((x) => x.filter((_, j) => j !== i))}
                    aria-label={`Remove screenshot ${i + 1}`}
                    className="absolute top-2 right-2 grid size-7 cursor-pointer place-items-center rounded-full bg-ink/80 text-bg hover:bg-ink"
                  >
                    <X className="size-4" />
                  </button>
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-ink/70 p-1.5">
                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move earlier" className="grid size-7 cursor-pointer place-items-center rounded-md text-bg hover:bg-white/20 disabled:opacity-30">
                      <ArrowLeft className="size-4" />
                    </button>
                    <button type="button" disabled={i === shots.length - 1} onClick={() => move(i, 1)} aria-label="Move later" className="grid size-7 cursor-pointer place-items-center rounded-md text-bg hover:bg-white/20 disabled:opacity-30">
                      <ArrowRight className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-muted">
          {mode === "images" ? "Next, you'll review the extracted text before it's analysed." : "This job will use 1 analysis (re-running it later is free)."}
        </p>
        <Button onClick={submit} loading={pending} disabled={mode === "text" ? text.trim().length < 80 : shots.length === 0} size="lg">
          {mode === "text" ? "Analyse job" : pending ? "Extracting text…" : "Extract text"}
          {!pending && <ArrowRight className="size-4" aria-hidden />}
        </Button>
      </div>
      <UpgradeDialog open={limit} onClose={() => setLimit(false)} />
    </div>
  );
}
