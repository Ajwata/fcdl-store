"use client";

import { useState } from "react";

export default function AdminSettingsPage() {
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
    </main>
  );
}
