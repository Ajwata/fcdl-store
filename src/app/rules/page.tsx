import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCmsContent } from "@/lib/cms-content";

export const metadata = {
  title: "Правила | Football Club",
  description: "Правила користування сервісом та бронювання футбольного поля",
};

export default async function RulesPage() {
  const cms = await getCmsContent();
  const rules = [
    {
      title: "Загальні умови користування",
      text: "Використовуючи сайт та особистий кабінет, ви погоджуєтесь з правилами бронювання, оплати й скасування записів.",
    },
    {
      title: "Обов'язки клієнта",
      text: "Клієнт зобов'язується вказувати коректні контактні дані, своєчасно приходити на матч та дотримуватись правил поведінки на території комплексу.",
    },
    {
      title: "Оновлення умов",
      text: "Адміністрація може змінювати розклад, тарифи й правила користування сервісом з попереднім оновленням інформації на сайті.",
    },
    {
      title: "Обмеження",
      text: "Забороняється передавати доступ третім особам, використовувати сервіс для шахрайських дій або навмисно створювати фіктивні бронювання.",
    },
  ];

  return (
    <>
      <SiteHeader navigationItems={cms.navigationItems} />
      <main className="page-shell flex-1">
        <section className="section-block mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
          <div className="rounded-[28px] border border-[var(--blue-100)] bg-[linear-gradient(140deg,#f7fbff_0%,#edf5ff_48%,#e8f3f0_100%)] p-6 shadow-[0_18px_44px_rgba(8,26,51,0.08)] sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_260px] lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--green-700)]">Документи</p>
                <h1 className="mt-3 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">
                  Правила
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                  На цій сторінці зібрані основні правила користування сервісом і майданчиком. Текст сформований у
                  простому форматі, щоб ви могли швидко знайти ключові пункти.
                </p>
              </div>

              <div className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--blue-700)]">Оновлено</p>
                <p className="mt-2 text-sm font-semibold text-[var(--blue-950)]">{new Date().toLocaleDateString("uk-UA")}</p>
                <p className="mt-3 text-xs leading-6 text-slate-500">Якщо потрібне уточнення, зверніться до адміністратора через контакти у футері.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {rules.map((item, index) => (
              <article
                key={item.title}
                className="rounded-[22px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_14px_34px_rgba(8,26,51,0.07)]"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--green-700)]">Пункт {String(index + 1).padStart(2, "0")}</p>
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
