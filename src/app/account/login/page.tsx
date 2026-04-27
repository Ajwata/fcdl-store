"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "phone" | "code";
type AuthMode = "login" | "register";

type ReferralManager = {
  id: string;
  name: string;
};

export default function AccountLoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<Step>("phone");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralManagers, setReferralManagers] = useState<ReferralManager[]>([]);
  const [selectedReferralManagerId, setSelectedReferralManagerId] = useState<string>("none");

  const [resendIn, setResendIn] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/account";
  const redirectTo = redirectParam.startsWith("/") && !redirectParam.startsWith("//")
    ? redirectParam
    : "/account";

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => {
      setResendIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    let cancelled = false;

    const loadReferralManagers = async () => {
      try {
        const response = await fetch("/api/referral-managers", { cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as { managers?: ReferralManager[] };
        if (cancelled) return;
        setReferralManagers(Array.isArray(result.managers) ? result.managers : []);
      } catch {
        if (cancelled) return;
      }
    };

    void loadReferralManagers();
    return () => {
      cancelled = true;
    };
  }, []);

  const phoneDigitsCount = useMemo(() => phone.replace(/\D/g, "").length, [phone]);

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 12);
    if (!digits) return "";
    if (digits.startsWith("380")) {
      return `+${digits}`;
    }
    if (digits.startsWith("0")) {
      return `+38${digits}`;
    }
    return `+${digits}`;
  };

  const sendCode = async () => {
    if (resendIn > 0) {
      setError(`Повторна відправка через ${resendIn} с`);
      return;
    }

    if (mode === "register") {
      if (password.trim().length < 8) {
        setError("Для реєстрації потрібен пароль мінімум 8 символів");
        return;
      }
      if (password !== confirmPassword) {
        setError("Паролі не співпадають");
        return;
      }
      if (!acceptedTerms) {
        setError("Підтвердіть правила та політику");
        return;
      }
    }

    setError("");
    setStatus("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mode: "register", password }),
      });
      const result = (await response.json()) as { error?: string; phone?: string };

      if (!response.ok) {
        setError(result.error ?? "Не вдалося відправити код");
        return;
      }

      setStatus(`Код відправлено на ${result.phone}`);
      setResendIn(60);
      setStep("code");
    } catch {
      setError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    setError("");
    setStatus("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code,
          name,
          mode: "register",
          password,
          acceptedTerms,
          referredByManagerId: selectedReferralManagerId !== "none" ? selectedReferralManagerId : undefined,
        }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Невірний код");
        return;
      }

      setStatus("Вхід виконано успішно");
      router.push(redirectTo);
    } catch {
      setError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  const loginWithPassword = async () => {
    if (!phone.trim()) {
      setError("Вкажіть номер телефону");
      return;
    }
    if (!password.trim()) {
      setError("Введіть пароль");
      return;
    }

    setError("");
    setStatus("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(result.error ?? "Не вдалося увійти");
        return;
      }

      setStatus("Вхід виконано успішно");
      router.push(redirectTo);
    } catch {
      setError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell min-h-screen px-4 py-16 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_24px_60px_rgba(8,26,51,0.12)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--green-700)]">Кабінет клієнта</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--blue-950)]">{mode === "login" ? "Вхід" : "Реєстрація по SMS"}</h1>
        <p className="mt-2 text-sm text-slate-600">{mode === "login" ? "Увійдіть за номером телефону та паролем." : "Створіть акаунт за номером телефону та кодом з SMS."}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-2 text-xs font-semibold uppercase tracking-[0.12em]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setStep("phone");
              setCode("");
              setError("");
              setStatus("");
              setPassword("");
              setConfirmPassword("");
              setAcceptedTerms(false);
              setSelectedReferralManagerId("none");
            }}
            className={`rounded-xl px-3 py-2 text-center transition ${mode === "login" ? "bg-white text-[var(--blue-900)]" : "text-slate-500"}`}
          >
            Вхід
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setStep("phone");
              setCode("");
              setError("");
              setStatus("");
              setPassword("");
              setConfirmPassword("");
              setAcceptedTerms(false);
              setSelectedReferralManagerId("none");
            }}
            className={`rounded-xl px-3 py-2 text-center transition ${mode === "register" ? "bg-white text-[var(--blue-900)]" : "text-slate-500"}`}
          >
            Реєстрація
          </button>
        </div>

        {mode === "register" && (
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-2 text-xs font-semibold uppercase tracking-[0.12em]">
            <div className={`rounded-xl px-3 py-2 text-center ${step === "phone" ? "bg-white text-[var(--blue-900)]" : "text-slate-500"}`}>1. Телефон</div>
            <div className={`rounded-xl px-3 py-2 text-center ${step === "code" ? "bg-white text-[var(--blue-900)]" : "text-slate-500"}`}>2. SMS код</div>
          </div>
        )}

        {(mode === "login" || step === "phone") && (
          <div className="mt-6 space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Ім'я (необов'язково)</label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="w-full rounded-xl border border-[var(--blue-200)] px-3 py-2.5 text-sm outline-none ring-[var(--green-700)] focus:ring-2"
                    placeholder="Ваше ім'я"
                  />
                </div>
                <label className="flex items-start gap-2 rounded-xl border border-[var(--blue-100)] bg-[var(--blue-50)] px-3 py-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Погоджуюся з правилами користування та політикою конфіденційності</span>
                </label>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Хто вас привів? (перший і єдиний вибір)</label>
                  <select
                    value={selectedReferralManagerId}
                    onChange={(event) => setSelectedReferralManagerId(event.target.value)}
                    className="w-full rounded-xl border border-[var(--blue-200)] px-3 py-2.5 text-sm outline-none ring-[var(--green-700)] focus:ring-2"
                  >
                    <option value="none">Ніхто / самостійно</option>
                    {referralManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>{manager.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Номер телефону</label>
              <input
                value={phone}
                onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                className="w-full rounded-xl border border-[var(--blue-200)] px-3 py-2.5 text-sm outline-none ring-[var(--green-700)] focus:ring-2"
                placeholder="+380671234567"
              />
              <p className="mt-1 text-xs text-slate-500">Формат: +380XXXXXXXXX ({phoneDigitsCount}/12 цифр)</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Пароль</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-xl border border-[var(--blue-200)] px-3 py-2.5 pr-12 text-sm outline-none ring-[var(--green-700)] focus:ring-2"
                  placeholder={mode === "login" ? "Ваш пароль" : "Мінімум 8 символів"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
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
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-[var(--blue-200)] bg-white p-1.5 text-[var(--blue-900)]"
                  aria-label="Показати пароль під час утримання"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Підтвердіть пароль</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-xl border border-[var(--blue-200)] px-3 py-2.5 pr-12 text-sm outline-none ring-[var(--green-700)] focus:ring-2"
                    placeholder="Повторіть пароль"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      setShowConfirmPassword(true);
                    }}
                    onMouseUp={() => setShowConfirmPassword(false)}
                    onMouseLeave={() => setShowConfirmPassword(false)}
                    onTouchStart={() => setShowConfirmPassword(true)}
                    onTouchEnd={() => setShowConfirmPassword(false)}
                    onTouchCancel={() => setShowConfirmPassword(false)}
                    onKeyDown={(event) => {
                      if (event.key === " " || event.key === "Enter") {
                        event.preventDefault();
                        setShowConfirmPassword(true);
                      }
                    }}
                    onKeyUp={(event) => {
                      if (event.key === " " || event.key === "Enter") {
                        setShowConfirmPassword(false);
                      }
                    }}
                    onBlur={() => setShowConfirmPassword(false)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-[var(--blue-200)] bg-white p-1.5 text-[var(--blue-900)]"
                    aria-label="Показати підтвердження пароля під час утримання"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={mode === "login" ? loginWithPassword : sendCode}
              disabled={loading}
              className="w-full rounded-full bg-[var(--green-700)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--green-800)] disabled:opacity-60"
            >
              {loading ? "Обробка..." : mode === "login" ? "Увійти" : "Отримати код для реєстрації"}
            </button>
          </div>
        )}

        {mode === "register" && step === "code" && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Код з SMS</label>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-xl border border-[var(--blue-200)] px-3 py-2.5 text-sm outline-none ring-[var(--green-700)] focus:ring-2"
                placeholder="6 цифр"
                maxLength={6}
              />
            </div>

            <button
              type="button"
              onClick={verifyCode}
              disabled={loading}
              className="w-full rounded-full bg-[var(--blue-900)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--blue-800)] disabled:opacity-60"
            >
              {loading ? "Перевірка..." : "Зареєструватися"}
            </button>

            <button
              type="button"
              onClick={sendCode}
              disabled={loading || resendIn > 0}
              className="w-full rounded-full border border-[var(--blue-200)] bg-white px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[var(--blue-900)] disabled:opacity-60"
            >
              {resendIn > 0 ? `Повторно через ${resendIn} с` : "Надіслати код ще раз"}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
              }}
              className="w-full text-sm font-semibold text-[var(--blue-800)] underline"
            >
              Змінити номер
            </button>
          </div>
        )}

        {status && <p className="mt-4 text-sm font-semibold text-emerald-700">{status}</p>}
        {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </main>
  );
}
