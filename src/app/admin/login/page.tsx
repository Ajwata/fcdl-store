"use client";

import { useState } from "react";
import Image from "next/image";

import logoImage from "@/img/logo.jpg";

export default function AdminLoginPage() {
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Невірний пароль");
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 overflow-hidden rounded-2xl border border-white/15 shadow-lg">
          <Image
            src={logoImage}
            alt="FCDL.STORE"
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <h1 className="text-2xl font-bold text-white">FCDL.STORE</h1>
        <p className="mt-1 text-sm text-white/40">Панель адміністратора</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
      >
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">Логін</label>
          <input
            type="text"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:ring-2 focus:ring-[var(--green-700)]"
            placeholder="admin"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">Пароль</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none transition focus:ring-2 focus:ring-[var(--green-700)]"
            placeholder="Введіть пароль"
            required
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--green-700)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--green-800)] disabled:opacity-60"
        >
          {loading ? "Вхід..." : "Увійти"}
        </button>
      </form>
    </div>
  );
}
