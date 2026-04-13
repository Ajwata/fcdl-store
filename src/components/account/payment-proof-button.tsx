"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PaymentRequisites } from "@/data/cms-defaults";

type PaymentProofButtonProps = {
  bookingId: string;
  paymentRequisites: PaymentRequisites;
  disabled?: boolean;
};

export function PaymentProofButton({ bookingId, paymentRequisites, disabled = false }: PaymentProofButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setError("");
      setStatus(`${label} скопійовано`);
    } catch {
      setStatus("");
      setError("Не вдалося скопіювати");
    }
  };

  const submitReceipt = async (file: File) => {
    setBusy(true);
    setError("");
    setStatus("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/account/bookings/${bookingId}/payment-proof`, {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Не вдалося відправити квитанцію");
        return;
      }

      setStatus("Квитанцію завантажено. Статус: перевірка оплати.");
      router.refresh();
    } catch {
      setError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOpen(true);
            setStatus("");
            setError("");
          }}
          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] ${disabled ? "cursor-not-allowed bg-slate-200 text-slate-400" : "bg-[var(--green-700)] text-white hover:bg-[var(--green-800)]"}`}
        >
          Отримати реквізити
        </button>
        {status && <p className="text-xs font-semibold text-emerald-700">{status}</p>}
        {error && <p className="text-xs font-semibold text-rose-700">{error}</p>}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,26,51,0.65)] px-4 py-6">
          <div className="w-full max-w-xl rounded-[24px] border border-[var(--blue-100)] bg-white p-5 shadow-[0_24px_60px_rgba(8,26,51,0.18)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--green-700)]">Оплата</p>
                <h3 className="mt-1 text-xl font-bold text-[var(--blue-950)]">Реквізити для переказу</h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--blue-200)] bg-white text-[var(--blue-900)]"
                aria-label="Закрити"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-2 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-4 text-sm text-[var(--blue-900)]">
              <div className="flex items-start justify-between gap-3">
                <p><span className="font-semibold">Отримувач:</span> {paymentRequisites.recipient}</p>
                <button type="button" onClick={() => void copyToClipboard(paymentRequisites.recipient, "Отримувач")} className="rounded-full border border-[var(--blue-200)] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]">Копіювати</button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p><span className="font-semibold">IBAN:</span> {paymentRequisites.iban}</p>
                <button type="button" onClick={() => void copyToClipboard(paymentRequisites.iban, "IBAN")} className="rounded-full border border-[var(--blue-200)] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]">Копіювати</button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p><span className="font-semibold">Банк:</span> {paymentRequisites.bank}</p>
                <button type="button" onClick={() => void copyToClipboard(paymentRequisites.bank, "Банк")} className="rounded-full border border-[var(--blue-200)] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]">Копіювати</button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <p><span className="font-semibold">Призначення:</span> {paymentRequisites.purpose}</p>
                <button type="button" onClick={() => void copyToClipboard(paymentRequisites.purpose, "Призначення")} className="rounded-full border border-[var(--blue-200)] bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]">Копіювати</button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--blue-100)] bg-white p-4">
              <p className="text-sm font-semibold text-[var(--blue-950)]">Після оплати надішліть квитанцію</p>
              <label className={`mt-3 inline-flex cursor-pointer items-center justify-center rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] ${disabled || busy ? "cursor-not-allowed bg-slate-200 text-slate-400" : "bg-[var(--green-700)] text-white hover:bg-[var(--green-800)]"}`}>
                {busy ? "Завантаження..." : "Відправити квитанцію"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={disabled || busy}
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.currentTarget.value = "";
                    if (!file) return;
                    void submitReceipt(file);
                  }}
                />
              </label>
              {status && <p className="mt-2 text-xs font-semibold text-emerald-700">{status}</p>}
              {error && <p className="mt-2 text-xs font-semibold text-rose-700">{error}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
