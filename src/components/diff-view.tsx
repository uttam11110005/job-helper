import { wordDiff } from "@/lib/diff";

export function DiffText({ a, b }: { a: string; b: string }) {
  const parts = wordDiff(a, b);
  return (
    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
      {parts.map((p, i) =>
        p.type === "same" ? (
          <span key={i}>{p.text}</span>
        ) : p.type === "add" ? (
          <ins key={i} className="rounded-[4px] bg-suggest-bg px-0.5 text-suggest no-underline">{p.text}</ins>
        ) : (
          <del key={i} className="rounded-[4px] bg-del px-0.5 text-muted decoration-missing/50">{p.text}</del>
        ),
      )}
    </p>
  );
}
