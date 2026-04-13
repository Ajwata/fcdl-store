import Image from "next/image";

import { type AdminContactCard } from "@/data/cms-defaults";
import logoImage from "@/img/logo.jpg";

type AdminContactsSectionProps = {
  contacts: AdminContactCard[];
};

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("380")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10, 12)}`;
  }
  return phone;
}

export function AdminContactsSection({ contacts }: AdminContactsSectionProps) {
  const contact = contacts[0];

  if (!contact) {
    return null;
  }

  const publicTitle = contact.name?.trim() || "Адміністрація поля";
  const publicDescription = contact.description?.trim() || "Єдиний контакт для бронювання, оплати та уточнення деталей матчу.";
  const publicPhoto = contact.photo?.trim() || logoImage;

  return (
    <section id="contacts" className="section-block mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
      <div className="overflow-hidden rounded-[34px] border border-[var(--blue-100)] bg-[linear-gradient(135deg,#f8fbff_0%,#eef7ff_58%,#f4fbf7_100%)] shadow-[0_24px_70px_rgba(8,26,51,0.1)]">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative p-8 sm:p-10 lg:p-12">
            <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-[var(--blue-200)]/40 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-36 w-36 rounded-full bg-[var(--green-200)]/50 blur-3xl" />
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--green-700)]">Контакти</p>
            <h2 className="mt-3 font-display text-4xl font-semibold uppercase leading-tight text-[var(--blue-950)] sm:text-5xl">
              Зв&apos;язок з адміністратором
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Якщо потрібна допомога з бронюванням, оплатою або зміною часу матчу, зв&apos;яжіться з адміністратором напряму.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4 rounded-[26px] border border-white/70 bg-white/90 p-4 shadow-[0_14px_40px_rgba(8,26,51,0.08)] backdrop-blur-sm sm:p-5">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)]">
                <Image
                  src={publicPhoto}
                  alt="Логотип адміністрації"
                  width={54}
                  height={54}
                  className="h-14 w-14 rounded-xl object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--blue-700)]">Єдиний контакт</p>
                <p className="mt-1 text-2xl font-bold text-[var(--blue-950)]">{publicTitle}</p>
                <p className="mt-1 text-sm text-slate-600">{publicDescription}</p>
              </div>
            </div>

            <a
              href={`tel:${contact.phone}`}
              className="mt-5 inline-flex rounded-full bg-[var(--green-700)] px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] !text-white transition hover:bg-[var(--green-800)]"
            >
              {formatPhone(contact.phone)}
            </a>
          </div>

          <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden bg-[linear-gradient(180deg,rgba(8,26,51,0.05),rgba(8,26,51,0.18))] lg:min-h-full">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(84,169,115,0.28),transparent_35%),radial-gradient(circle_at_70%_60%,rgba(87,148,255,0.22),transparent_38%)]" />
            <div className="relative flex h-40 w-40 items-center justify-center rounded-[32px] border border-white/60 bg-white/75 shadow-[0_20px_50px_rgba(8,26,51,0.12)] backdrop-blur-sm">
              <Image
                src={publicPhoto}
                alt="Логотип майданчика"
                width={110}
                height={110}
                className="h-28 w-28 rounded-[24px] object-cover"
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(8,26,51,0)_0%,rgba(8,26,51,0.82)_100%)] p-6 text-white sm:p-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">Єдиний контакт</p>
              <p className="mt-2 text-3xl font-bold">{publicTitle}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}