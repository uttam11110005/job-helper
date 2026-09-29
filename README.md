# Job Helper

AI-powered job analysis, truthful CV tailoring and Finnish application assistant for immigrants in Finland — built from `Finnish_Job_Helper_Updated_BRD_v1.1.docx`.

## Run it

```bash
npm install
npm run dev        # http://localhost:3210
```

Production: `npm run build && npm start` (same port).

Port **3210** is used because 3100 was already taken by another local project.

### AI engine (free)

Recommended: **Google Gemini free tier** — no credit card.

1. Open https://aistudio.google.com/apikey and sign in with a Google account.
2. Click **Create API key**, copy it.
3. Paste it into `.env.local` as `GEMINI_API_KEY=...` and restart `npm run dev`.

Alternatives: `GROQ_API_KEY` (free, https://console.groq.com/keys) or `OPENAI_API_KEY` (paid). All use the same OpenAI-compatible client (`src/lib/ai/openai.ts`) with structured JSON output, automatic retry on free-tier rate limits, and response repair. With no key the app runs an offline **Demo** engine (keyword-based, much weaker; screenshot OCR runs in the browser).

### The flow

1. Upload CV → AI reads every section.
2. Add a job ad (text or screenshots).
3. Analysis → **Job match %**: ≥70% good match, 60–69% borderline, <60% “we recommend not applying” (required items weigh 80%, nice-to-haves 20%; guidance only).
4. **Match & rewrite** → pick CV type (Experience-focused / Career change, one is recommended) → one click rewrites headline, summary, experience points, relevant-only skills (and expertise areas for career change). Titles, employers, dates, education and languages are never changed; every skill is verified against the CV; anything unsupported is flagged.
5. **Check & finish** → review (violet = AI-written) → approve → choose template → download. Warns above 2 pages and can shorten automatically. Tentative ATS score shown throughout.

A local test account used during QA is listed in `scripts/test-account.txt`.

## What's implemented (BRD mapping)

| BRD | Where |
| --- | --- |
| §5 Job input: paste text or multiple screenshots, OCR, review/correct before analysis, reject unreadable | `/jobs/new`, `/jobs/[id]/review` |
| §6 CV upload (PDF/DOCX/TXT/paste), parse, review/edit, never overwrite (versioned) | `/onboarding`, `/profile` |
| §7 Analysis: meaning, duties, mandatory/preferred requirements, CEFR language, vocabulary | `/jobs/[id]/analysis` |
| §11 Match / Partial / Missing / Unknown with evidence; numeric score labelled "guidance indicator — not a hiring prediction" | analysis page |
| §8 CV gap analysis: strengths, gaps + advice, supported keywords, structure advice | `/jobs/[id]/tailor` |
| §8.2 Tailoring rules: accept / reject / edit each suggestion, **grounding guard** flags numbers or skills not in the CV, skills can only be reordered | `src/lib/ai/engine.ts` |
| Two CV strategies, recommended per job: **Experience-focused** (relevant experience, detailed jobs) and **Career change** (expertise areas that summarise experience, compact job timeline). **Tentative ATS score** (keywords, title, sections, contact, layout, dates) with before/after — an estimate, since real ATS scoring is proprietary | `/jobs/[id]/tailor`, `/jobs/[id]/cv`, `src/lib/ats.ts` |
| CV designs: **Classic** (photo circle, two columns) and **Colour sidebar** (colour block, photo, name band) + **ATS simple**; 6 accent colours; optional photo, key-strength areas, interests. PDF uses the chosen design; DOCX stays ATS single-column | `/jobs/[id]/cv` → Design |
| §9–10 Tailored CV: editor, preview, "what changed" diff vs original, multiple versions, ATS-readable DOCX + PDF export gated by a "reviewed & true" confirmation | `/jobs/[id]/cv` |
| §12 Finnish application + English explanation + form answers; interview questions & Finnish phrases — all from the approved tailored CV | `/jobs/[id]/application`, `/jobs/[id]/interview` |
| §13 Tracker: Saved / Applied / Interview / Offer / Rejected / Closed, dates, notes, linked CV version + application | `/tracker`, `/jobs/[id]/track` |
| §14 3 free analyses (1 job = 1 analysis; re-runs free), "2 of 3 remaining", exact upgrade message, €5.99/month recurring disclosures, receipt, renewal date, cancel/resume | header pill, `/checkout`, `/billing` |
| §20 Privacy: consent at signup, per-user isolation, JSON data export, full account deletion (incl. files) | `/settings`, `/privacy` |

## Stack

Next.js 16 (App Router, server actions) · React 19 · Tailwind CSS v4 · SQLite via Node's built-in `node:sqlite` (`data/app.db`) · scrypt password hashing + http-only session cookies · `unpdf` / `mammoth` for CV extraction · `docx` for export · Tesseract.js for offline OCR.

## Not production-ready yet

- **Payments are simulated — no money is collected anywhere.** Checkout only writes rows to the local SQLite database. `src/lib/billing.ts` + `src/app/actions/billing.ts` model the Stripe flow (customer, subscription, payment rows, auto-renewal, cancel at period end). Swap `checkoutAction` for Stripe Checkout + a webhook writing the same rows.
- **Storage is local** (`data/`). Move to Postgres/Supabase + object storage for deployment; queries are isolated in `src/lib/repo.ts` and `src/lib/db.ts`.
- The privacy notice is a draft and needs GDPR legal review (BRD §20).
- The demo engine is keyword-based; real quality needs the OpenAI key and Finnish-language QA (BRD §21).
