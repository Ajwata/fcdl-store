import Image from "next/image";

import logoImage from "@/img/logo.jpg";

type SitePreloaderProps = {
  fullscreen?: boolean;
};

export function SitePreloader({ fullscreen = true }: SitePreloaderProps) {
  return (
    <div
      className={`flex items-center justify-center ${fullscreen ? "min-h-screen" : "min-h-[320px]"}`}
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(57,153,107,0.14), transparent 45%), radial-gradient(circle at 80% 30%, rgba(16,36,58,0.14), transparent 48%), #f3f7fb",
      }}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--green-700)]" />
          <div className="absolute inset-2 overflow-hidden rounded-2xl border border-white/70 bg-white shadow-lg">
            <Image
              src={logoImage}
              alt="FCDL.STORE"
              fill
              sizes="80px"
              className="object-cover"
              priority
            />
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--green-700)]">FCDL.STORE</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">Завантаження...</p>
        </div>
      </div>
    </div>
  );
}
