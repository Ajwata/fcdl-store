"use client";

import { useEffect, useState } from "react";

type PaymentWindowRule = {
  minDaysBeforeStart: number;
  maxDaysBeforeStart: number | null;
  paymentHours: number;
};

type PaymentSettings = {
  adminDecisionHours: number;
  paymentWindowRules: PaymentWindowRule[];
};

const defaultPaymentSettings: PaymentSettings = {
  adminDecisionHours: 12,
  paymentWindowRules: [
    { minDaysBeforeStart: 1, maxDaysBeforeStart: 2, paymentHours: 12 },
    { minDaysBeforeStart: 3, maxDaysBeforeStart: 5, paymentHours: 24 },
    { minDaysBeforeStart: 6, maxDaysBeforeStart: 9, paymentHours: 48 },
    { minDaysBeforeStart: 10, maxDaysBeforeStart: null, paymentHours: 72 },
  ],
};

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(defaultPaymentSettings);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadPaymentSettings = async () => {
      try {
        const response = await fetch("/api/admin/payment-settings", { cache: "no-store" });
        const data = (await response.json()) as { error?: string; settings?: PaymentSettings };
        if (cancelled) return;

        if (!response.ok || !data.settings) {
          setPaymentStatus(data.error ?? "Не вдалося завантажити правила оплати");
          return;
        }

        setPaymentSettings(data.settings);
      } catch {
        if (cancelled) return;
        setPaymentStatus("Помилка мережі при завантаженні правил оплати");
      } finally {
        if (cancelled) return;
        setPaymentLoading(false);
      }
    };

    void loadPaymentSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("Новий пароль повинен містити щонайменше 8 символів");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Паролі не співпадають");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не вдалося змінити пароль");
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setSuccess(false), 4000);
    } catch {
      setError("Помилка мережі");
    } finally {
      setSaving(false);
    }
  };

  const savePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentStatus("");

    if (paymentSettings.adminDecisionHours < 1) {
      setPaymentStatus("Час на рішення адміністратора має бути не менше 1 години");
      return;
    }

    const invalidRule = paymentSettings.paymentWindowRules.find((rule) =>
      rule.minDaysBeforeStart < 0 ||
      (rule.maxDaysBeforeStart !== null && rule.maxDaysBeforeStart < rule.minDaysBeforeStart) ||
      rule.paymentHours < 1,
    );
    if (invalidRule) {
      setPaymentStatus("Перевірте діапазони днів та години оплати у правилах");
      return;
    }

    setPaymentSaving(true);
    try {
      const response = await fetch("/api/admin/payment-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentSettings),
      });
      const data = (await response.json()) as { error?: string; settings?: PaymentSettings };
      if (!response.ok || !data.settings) {
        setPaymentStatus(data.error ?? "Не вдалося зберегти правила оплати");
        return;
      }

      setPaymentSettings(data.settings);
      setPaymentStatus("Правила оплати збережено");
    } catch {
      setPaymentStatus("Помилка мережі");
    } finally {
      setPaymentSaving(false);
    }
  };

  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--blue-950)]">Налаштування</h1>
        <p className="mt-1 text-sm text-slate-500">Безпека вашого облікового запису адміністратора.</p>
      </div>

      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-[var(--blue-950)]">Зміна пароля</h2>
        <p className="mb-5 text-sm text-slate-500">
          Мінімум 8 символів. Використовуйте великі та малі літери, цифри і спецсимволи.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Hidden username for password managers */}
          <input type="text" name="username" autoComplete="username" className="hidden" readOnly />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Поточний пароль
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-[var(--blue-950)] focus:border-[var(--green-700)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Новий пароль
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-[var(--blue-950)] focus:border-[var(--green-700)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Підтвердження нового пароля
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-[var(--blue-950)] focus:border-[var(--green-700)] focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
          {success && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              ✓ Пароль успішно змінено
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-[var(--green-700)] py-3 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Збереження..." : "Змінити пароль"}
          </button>
        </form>
      </div>

      <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-[var(--blue-950)]">Правила дедлайнів і оплати</h2>
        <p className="mb-5 text-sm text-slate-500">
          Налаштуйте час рішення адміністратора і вікна оплати залежно від кількості днів до старту гри. Правила однаково діють для готівки та оплати за реквізитами IBAN.
        </p>

        {paymentLoading ? (
          <p className="text-sm text-slate-500">Завантаження налаштувань...</p>
        ) : (
          <form onSubmit={savePaymentSettings} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Години на рішення адміністратора
              </label>
              <input
                type="number"
                min={1}
                value={paymentSettings.adminDecisionHours}
                onChange={(e) =>
                  setPaymentSettings((prev) => ({
                    ...prev,
                    adminDecisionHours: Number(e.target.value),
                  }))
                }
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-[var(--blue-950)] focus:border-[var(--green-700)] focus:outline-none"
              />
            </div>

            <div className="space-y-3">
              {paymentSettings.paymentWindowRules.map((rule, index) => (
                <div key={`${index}-${rule.minDaysBeforeStart}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Правило #{index + 1}</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Від (днів)
                      <input
                        type="number"
                        min={0}
                        value={rule.minDaysBeforeStart}
                        onChange={(e) => {
                          const paymentWindowRules = [...paymentSettings.paymentWindowRules];
                          paymentWindowRules[index] = {
                            ...rule,
                            minDaysBeforeStart: Number(e.target.value),
                          };
                          setPaymentSettings((prev) => ({ ...prev, paymentWindowRules }));
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[var(--blue-950)] focus:border-[var(--green-700)] focus:outline-none"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      До (днів)
                      <input
                        type="number"
                        min={0}
                        value={rule.maxDaysBeforeStart ?? ""}
                        onChange={(e) => {
                          const paymentWindowRules = [...paymentSettings.paymentWindowRules];
                          paymentWindowRules[index] = {
                            ...rule,
                            maxDaysBeforeStart: e.target.value === "" ? null : Number(e.target.value),
                          };
                          setPaymentSettings((prev) => ({ ...prev, paymentWindowRules }));
                        }}
                        placeholder="без межі"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[var(--blue-950)] focus:border-[var(--green-700)] focus:outline-none"
                      />
                    </label>
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Годин на оплату
                      <input
                        type="number"
                        min={1}
                        value={rule.paymentHours}
                        onChange={(e) => {
                          const paymentWindowRules = [...paymentSettings.paymentWindowRules];
                          paymentWindowRules[index] = {
                            ...rule,
                            paymentHours: Number(e.target.value),
                          };
                          setPaymentSettings((prev) => ({ ...prev, paymentWindowRules }));
                        }}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-[var(--blue-950)] focus:border-[var(--green-700)] focus:outline-none"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {paymentStatus && (
              <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-[var(--blue-900)]">
                {paymentStatus}
              </p>
            )}

            <button
              type="submit"
              disabled={paymentSaving}
              className="w-full rounded-xl bg-[var(--blue-900)] py-3 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
            >
              {paymentSaving ? "Збереження..." : "Зберегти правила оплати"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
