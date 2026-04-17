"use client";

import { useCallback, useEffect, useState } from "react";

import { formatDateTimeUk } from "@/lib/date-format";

type AdminUser = {
  id: string;
  login: string;
  name: string;
  role: "superadmin" | "manager";
  createdAt: string;
};

export function AdminUsersManager() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users");
      const result = (await response.json()) as { users?: AdminUser[]; error?: string };
      if (!response.ok) {
        setStatus(result.error ?? "Не вдалося завантажити користувачів");
        return;
      }
      setUsers(result.users ?? []);
    } catch {
      setStatus("Помилка мережі");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const createManager = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, login, password }),
      });

      const result = (await response.json()) as { user?: AdminUser; error?: string };
      if (!response.ok || !result.user) {
        setStatus(result.error ?? "Не вдалося створити менеджера");
        return;
      }

      const createdUser = result.user;
      setUsers((prev) => [...prev, createdUser]);
      setName("");
      setLogin("");
      setPassword("");
      setStatus("Менеджера створено");
    } catch {
      setStatus("Помилка мережі");
    } finally {
      setSaving(false);
    }
  };

  const deleteManager = async (user: AdminUser) => {
    if (user.role !== "manager") {
      setStatus("Можна видаляти лише менеджерів");
      return;
    }

    const confirmed = window.confirm(`Видалити менеджера ${user.name} (${user.login})?`);
    if (!confirmed) return;

    setDeletingId(user.id);
    setStatus("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus(result.error ?? "Не вдалося видалити менеджера");
        return;
      }

      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      setStatus("Менеджера видалено");
    } catch {
      setStatus("Помилка мережі");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Створити менеджера</h2>
        <p className="mt-1 text-sm text-slate-500">Головний адміністратор може видавати доступ менеджерам.</p>

        <form onSubmit={createManager} className="mt-4 grid gap-3 md:grid-cols-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ім'я"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-[var(--green-700)]"
            required
          />
          <input
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="Логін (latin, 3-32)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-[var(--green-700)]"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Пароль (мін. 8 символів)"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-[var(--green-700)]"
            required
          />
          <button
            type="submit"
            disabled={saving}
            className="md:col-span-3 rounded-xl bg-[var(--green-700)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--green-800)] disabled:opacity-60"
          >
            {saving ? "Створення..." : "Створити менеджера"}
          </button>
        </form>

        {status && <p className="mt-3 text-sm font-semibold text-slate-700">{status}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-800">Користувачі адмінки</h2>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Завантаження...</p>
        ) : users.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">Користувачів не знайдено</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-3">Ім'я</th>
                  <th className="px-4 py-3">Логін</th>
                  <th className="px-4 py-3">Роль</th>
                  <th className="px-4 py-3">Створено</th>
                  <th className="px-4 py-3">Дії</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-3 font-medium text-slate-800">{user.name}</td>
                    <td className="px-4 py-3 text-slate-600">{user.login}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${user.role === "superadmin" ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {user.role === "superadmin" ? "Головний адмін" : "Менеджер"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTimeUk(user.createdAt)}</td>
                    <td className="px-4 py-3">
                      {user.role === "manager" ? (
                        <button
                          type="button"
                          onClick={() => {
                            void deleteManager(user);
                          }}
                          disabled={deletingId === user.id}
                          className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-60"
                        >
                          {deletingId === user.id ? "Видалення..." : "Видалити"}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
