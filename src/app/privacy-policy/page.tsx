import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCmsContent } from "@/lib/cms-content";

export const metadata = {
  title: "Політика конфіденційності | Football Club",
  description: "Політика обробки персональних даних користувачів сервісу",
};

export default async function PrivacyPolicyPage() {
  const cms = await getCmsContent();
  const policy = cms.documents.privacyPolicyPage;

  return (
    <>
      <SiteHeader navigationItems={cms.navigationItems} />
      <main className="page-shell flex-1">
        <section className="section-block mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="rounded-[28px] border border-[var(--blue-100)] bg-[linear-gradient(135deg,#f6fbff_0%,#eef5ff_42%,#f0f8f4_100%)] p-6 shadow-[0_18px_44px_rgba(8,26,51,0.08)] sm:p-8">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--green-700)]">{policy.badge}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">
              {policy.title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              {policy.description}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {policy.sections.map((item, index) => (
              <article
                key={item.title}
                className="rounded-[22px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_14px_34px_rgba(8,26,51,0.07)]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--green-700)]">Розділ {String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-2 text-xl font-bold text-[var(--blue-950)]">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter
        footerNavLinks={cms.footerNavLinks}
        footerDocLinks={cms.footerDocLinks}
        footerSocialLinks={cms.footerSocialLinks}
      />
    </>
  );
}
