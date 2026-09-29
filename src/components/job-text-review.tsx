"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, RotateCcw, ScanText } from "lucide-react";
import { analyzeJobAction, deleteJobAction, saveOcrTextAction } from "@/app/actions/jobs";
import { Button, Notice, Progress, Textarea } from "@/components/ui";
import { UpgradeDialog } from "@/components/upgrade";
import { AnalysisProgress } from "@/components/analysis-progress";

export function JobTextReview({
  jobId,
  initialText,
  images,
  clientOcr,
  warning,
  analyzed,
}: {
  jobId: string;
  initialText: string;
  images: { id: string; url: string }[];
  clientOcr: boolean;
  warning: string | null;
  analyzed: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText);
  const [ocr, setOcr] = useState<{ running: boolean; progress: number; label: string }>({ running: false, progress: 0, label: "" });
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [limit, setLimit] = useState(false);
  const [pending, start] = useTransition();
  const ran = useRef(false);

  const runOcr = async () => {
    setOcr({ running: true, progress: 0, label: "Loading Finnish text recognition…" });
    setOcrWarning(null);
    try {
      const { createWorker } = await import("tesseract.js");
      let current = 0;
      const worker = await createWorker(["fin", "eng"], 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setOcr({ running: true, progress: Math.round(((current + m.progress) / images.length) * 100), label: `Reading screenshot ${current + 1} of ${images.length}…` });
          }
        },
      });
      const parts: string[] = [];
      for (const [i, im] of images.entries()) {
        current = i;
        const { data } = await worker.recognize(im.url);
        parts.push(data.text.trim());
      }
      await worker.terminate();
      const joined = parts.join("\n\n").replace(/\n{3,}/g, "\n\n");
      setText(joined);
      await saveOcrTextAction(jobId, joined);
      if (joined.replace(/\s/g, "").length < 60) setOcrWarning("Very little text could be read. The screenshots may be blurry, cropped or too small.");
    } catch {
      setOcrWarning("Text recognition failed to load. Check your internet connection, or type/paste the text below.");
    } finally {
      setOcr({ running: false, progress: 100, label: "" });
    }
  };

  useEffect(() => {
    if (clientOcr && !initialText && !ran.current) {
      ran.current = true;
      void runOcr();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const analyze = () => {
    setError(null);
    start(async () => {
      const r = await analyzeJobAction(jobId, text);
      if (r.ok) {
        router.push(`/jobs/${jobId}/analysis`);
        router.refresh();
      } else if (r.code === "LIMIT") setLimit(true);
      else setError(r.error);
    });
  };

  const discard = () =>
    start(async () => {
      await deleteJobAction(jobId);
      router.push("/jobs/new");
    });

  if (pending && !error) return <AnalysisProgress />;

  const unreadable = warning ?? ocrWarning;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {images.length > 0 && (
        <div className="space-y-3 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto">
          {images.map((im, i) => (
            <figure key={im.id} className="overflow-hidden rounded-xl border border-line bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt={`Job ad screenshot ${i + 1}`} className="w-full" />
              <figcaption className="border-t border-line px-3 py-1.5 text-xs text-muted">Screenshot {i + 1}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{images.length ? "Check the extracted text" : "Job advertisement text"}</h2>
          <p className="mt-1 text-sm text-muted">
            {images.length
              ? "Text recognition can make mistakes, especially with Finnish letters (ä, ö). Compare with the screenshots and correct anything wrong."
              : "Edit the text if needed, then run the analysis."}
          </p>
        </div>

        {unreadable && (
          <Notice tone="warn" icon={<AlertTriangle className="size-4" />}>
            <p className="font-semibold">We couldn&apos;t read these screenshots reliably.</p>
            <p className="mt-0.5">{unreadable.replace(/^OCR_(UNREADABLE|ERROR):/, "")}</p>
            <p className="mt-1">Upload sharper, uncropped screenshots — or paste the text below.</p>
          </Notice>
        )}

        {ocr.running ? (
          <div className="rounded-xl border border-line bg-card p-5" role="status" aria-live="polite">
            <div className="flex items-center gap-2 text-sm font-medium"><ScanText className="size-4 text-primary" aria-hidden />{ocr.label}</div>
            <Progress value={ocr.progress} label="Text recognition progress" className="mt-3" />
          </div>
        ) : (
          <Textarea rows={18} value={text} onChange={(e) => setText(e.target.value)} aria-label="Extracted job ad text" placeholder="The job ad text will appear here…" />
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {images.length > 0 && clientOcr && (
              <Button variant="ghost" onClick={runOcr} disabled={ocr.running || pending}><RotateCcw className="size-4" aria-hidden /> Re-read</Button>
            )}
            {images.length > 0 && !analyzed && (
              <Button variant="ghost" onClick={discard} disabled={ocr.running || pending}>Discard & upload new</Button>
            )}
          </div>
          <Button size="lg" onClick={analyze} disabled={ocr.running || text.trim().length < 80} loading={pending}>
            {analyzed ? "Re-run analysis" : "Analyse this job"} <ArrowRight className="size-4" aria-hidden />
          </Button>
        </div>
        {!analyzed && <p className="text-right text-[13px] text-muted">Uses 1 analysis. Re-running the same job later is free.</p>}
      </div>
      <UpgradeDialog open={limit} onClose={() => setLimit(false)} />
    </div>
  );
}
