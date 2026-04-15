"use client";

import { useState } from "react";
import Image from "next/image";

import logoImage from "@/img/logo.jpg";

export default function AdminLoginPage() {
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 pr-12 text-sm text-white placeholder-white/30 outline-none transition focus:ring-2 focus:ring-[var(--green-700)]"
              placeholder="Введіть пароль"
              required
            />
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                setShowPassword(true);
              }}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              onTouchStart={() => setShowPassword(true)}
              onTouchEnd={() => setShowPassword(false)}
              onTouchCancel={() => setShowPassword(false)}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  setShowPassword(true);
                }
              }}
              onKeyUp={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  setShowPassword(false);
                }
              }}
              onBlur={() => setShowPassword(false)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-white/25 bg-white/10 p-1.5 text-white"
              aria-label="Показати пароль під час утримання"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
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
