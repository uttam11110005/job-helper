export const metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-4xl font-semibold">Privacy notice</h1>
      <p className="mt-3 text-sm text-muted">Draft for MVP — requires specialist GDPR legal review before public launch.</p>
      <div className="mt-8 space-y-6 text-[16px] leading-relaxed text-ink-2">
        <Section title="What we process">Your account details (name, email), your profile, CVs you upload or paste, job ads and screenshots you submit, and the analyses, tailored CVs and applications created from them. CVs and screenshots are personal data and treated as such.</Section>
        <Section title="Why">Only to provide the service you asked for: analysing job ads, comparing them with your CV, and generating application material. We collect nothing beyond what these features need.</Section>
        <Section title="AI processing">When AI mode is enabled, job text, screenshots and CV content are sent to our AI provider (OpenAI) solely to generate your results. They are not used to sell to anyone.</Section>
        <Section title="Retention">Data is kept while your account exists. You can delete individual jobs at any time, and deleting your account permanently removes all your data and uploaded files immediately.</Section>
        <Section title="Your rights">You can download all your data (Settings → Export my data) and delete your account (Settings → Delete account). We never sell CVs or application content.</Section>
        <Section title="Security">Passwords are hashed (scrypt), sessions are http-only cookies, and every record and file is isolated per user.</Section>
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-1.5">{children}</p>
    </section>
  );
}
