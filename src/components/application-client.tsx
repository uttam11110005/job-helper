"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Check, Copy, RefreshCw, Save, Send, ShieldCheck } from "lucide-react";
import { generateApplicationAction, saveApplicationAction } from "@/app/actions/jobs";
import type { ApplicationDraft } from "@/lib/types";
import { Button, Card, CardHeader, EmptyState, LinkButton, Notice, Textarea } from "@/components/ui";
import { AnalysisProgress } from "@/components/analysis-progress";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      aria-label={label}
    >
      {done ? <Check className="size-4 text-match" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span className="hidden sm:inline">{done ? "Copied" : label}</span>
    </Button>
  );
}

export function ApplicationClient({ jobId, initial, sourceLabel }: { jobId: string; initial: ApplicationDraft | null; sourceLabel: string }) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [generating, startGen] = useTransition();
  const [saving, startSave] = useTransition();
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  const generate = () =>
    startGen(async () => {
      const r = await generateApplicationAction(jobId);
      if (!r.ok) return void toast.error(r.error);
      router.refresh();
      // Server component re-renders with new props; key on parent resets state.
    });

  if (generating) return <AnalysisProgress title="Writing your application" />;

  if (!draft) {
    return (
      <EmptyState
        icon={<Send className="size-6" />}
        title="Write a targeted Finnish application"
        action={<Button onClick={generate}>Generate application</Button>}
      >
        We&apos;ll write it in Finnish using only facts from {sourceLabel}, with an English translation so you understand every sentence.
      </EmptyState>
    );
  }

  const setAnswer = (i: number, k: "answer_fi" | "answer_en", v: string) =>
    setDraft((d) => d && { ...d, form_answers: d.form_answers.map((a, j) => (j === i ? { ...a, [k]: v } : a)) });

  return (
    <div className="space-y-6">
      <Notice tone="info" icon={<ShieldCheck className="size-4" />}>
        Written from {sourceLabel}. Read it carefully and change anything that isn&apos;t exactly right before you send it. Placeholders like
        <code className="mx-1 rounded bg-card px-1">[aloituspäivä]</code>need your input.
      </Notice>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Hakemus (Finnish)" description="This is what you send." action={<CopyButton text={draft.message_fi} />} />
          <div className="p-4">
            <Textarea lang="fi" rows={18} value={draft.message_fi} onChange={(e) => setDraft({ ...draft, message_fi: e.target.value })} aria-label="Finnish application" />
          </div>
        </Card>
        <Card>
          <CardHeader title="English explanation" description="So you understand every sentence." action={<CopyButton text={draft.message_en} />} />
          <div className="p-4">
            <Textarea rows={18} value={draft.message_en} onChange={(e) => setDraft({ ...draft, message_en: e.target.value })} aria-label="English translation" className="bg-sunken" />
          </div>
        </Card>
      </div>

      {draft.form_answers.length > 0 && (
        <Card>
          <CardHeader title="Application form answers" description="Short answers for common online form questions." />
          <ul className="divide-y divide-line">
            {draft.form_answers.map((a, i) => (
              <li key={i} className="space-y-3 px-5 py-4 sm:px-6">
                <p className="font-medium">{a.question}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted uppercase">Suomeksi</span><CopyButton text={a.answer_fi} /></div>
                    <Textarea lang="fi" rows={3} value={a.answer_fi} onChange={(e) => setAnswer(i, "answer_fi", e.target.value)} aria-label={`Finnish answer: ${a.question}`} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex h-9 items-center"><span className="text-xs font-semibold text-muted uppercase">In English</span></div>
                    <Textarea rows={3} value={a.answer_en} onChange={(e) => setAnswer(i, "answer_en", e.target.value)} aria-label={`English answer: ${a.question}`} className="bg-sunken" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="sticky bottom-20 z-10 flex flex-col gap-2 rounded-2xl border border-line bg-card/95 p-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between lg:bottom-4">
        <Button variant="ghost" onClick={generate}>
          <RefreshCw className="size-4" aria-hidden /> Regenerate
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row">
          {dirty && (
            <Button
              loading={saving}
              onClick={() =>
                startSave(async () => {
                  await saveApplicationAction(jobId, draft);
                  setSaved(draft);
                  toast.success("Application saved");
                })
              }
            >
              <Save className="size-4" aria-hidden /> Save changes
            </Button>
          )}
          <LinkButton href={`/jobs/${jobId}/interview`} variant={dirty ? "secondary" : "primary"}>
            Next: interview prep <ArrowRight className="size-4" aria-hidden />
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
