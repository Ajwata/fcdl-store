import type { Metadata } from "next";

import { BookingShell } from "@/components/booking/booking-shell";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Бронювання | FCDL.STORE",
  description: "Вибір дати, сектора і слота для бронювання футбольного поля.",
};

export default function BookingPage() {
  return (
    <>
      <SiteHeader />
      <main className="page-shell flex-1">
        <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
          <div className="rounded-[38px] border border-white/60 bg-white/72 p-6 shadow-[0_24px_80px_rgba(8,26,51,0.08)] backdrop-blur-xl lg:p-8">
            <BookingShell />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}