"use client";

import { useState } from "react";

type Props = {
  hasPassword: boolean;
};

export function AccountPasswordEditor({ hasPassword: initialHasPassword }: Props) {
  const [hasPassword, setHasPassword] = useState(initialHasPassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (newPassword.length < 8) {
      setError("Пароль повинен містити щонайменше 8 символів");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Паролі не співпадають");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string> = { newPassword };
      if (hasPassword) body.currentPassword = currentPassword;

      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Не вдалося зберегти пароль");
        return;
      }

      setSuccess(true);
      setHasPassword(true);
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

  return (
    <div className="rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_24px_60px_rgba(8,26,51,0.08)] sm:p-8">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--blue-50)]">
          <svg className="h-5 w-5 text-[var(--blue-700)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-[var(--blue-950)]">Пароль для акаунту</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {hasPassword
              ? "Пароль встановлено. Ви можете змінити його нижче."
              : "Пароль ще не встановлено. Ви можете додати його для додаткового захисту."}
          </p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
          hasPassword
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
        }`}>
          {hasPassword ? "Встановлено" : "Не встановлено"}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        {/* Hidden phone for password managers */}
        <input type="text" name="username" autoComplete="username" className="hidden" readOnly />

        {hasPassword && (
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
              className="w-full rounded-xl border border-[var(--blue-100)] bg-[var(--blue-50)] px-4 py-2.5 text-sm text-[var(--blue-950)] focus:border-[var(--green-700)] focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            {hasPassword ? "Новий пароль" : "Пароль"}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Мінімум 8 символів"
            className="w-full rounded-xl border border-[var(--blue-100)] bg-[var(--blue-50)] px-4 py-2.5 text-sm text-[var(--blue-950)] placeholder:text-slate-400 focus:border-[var(--green-700)] focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Підтвердження пароля
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            className="w-full rounded-xl border border-[var(--blue-100)] bg-[var(--blue-50)] px-4 py-2.5 text-sm text-[var(--blue-950)] focus:border-[var(--green-700)] focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            ✓ Пароль {initialHasPassword ? "змінено" : "встановлено"} успішно
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[var(--green-700)] px-6 py-3 text-sm font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Збереження..." : hasPassword ? "Змінити пароль" : "Встановити пароль"}
        </button>
      </form>
    </div>
  );
}
