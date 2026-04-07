"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Step = "phone" | "code";
type AuthMode = "login" | "register";

export default function AccountLoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [step, setStep] = useState<Step>("phone");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [devCodeHint, setDevCodeHint] = useState("");
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
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        setError("Для реєстрації вкажіть email");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        setError("Вкажіть коректний email");
        return;
      }
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
    } else {
      if (!password.trim()) {
        setError("Введіть пароль");
        return;
      }
    }

    setError("");
    setStatus("");
    setDevCodeHint("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, mode, password }),
      });
      const result = (await response.json()) as { error?: string; phone?: string; devCode?: string };

      if (!response.ok) {
        setError(result.error ?? "Не вдалося відправити код");
        return;
      }

      setStatus(`Код відправлено на ${result.phone}`);
      setResendIn(60);
      if (result.devCode) {
        setDevCodeHint(`Dev-код: ${result.devCode}`);
      }
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
          mode,
          email,
          password,
          acceptedTerms,
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

  return (
    <main className="page-shell min-h-screen px-4 py-16 sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_24px_60px_rgba(8,26,51,0.12)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--green-700)]">Кабінет клієнта</p>
        <h1 className="mt-2 text-3xl font-bold text-[var(--blue-950)]">{mode === "login" ? "Вхід по SMS" : "Реєстрація по SMS"}</h1>
        <p className="mt-2 text-sm text-slate-600">{mode === "login" ? "Увійдіть за номером телефону та кодом з SMS." : "Створіть акаунт за номером телефону та кодом з SMS."}</p>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-2 text-xs font-semibold uppercase tracking-[0.12em]">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setStep("phone");
              setCode("");
              setError("");
              setStatus("");
              setDevCodeHint("");
              setEmail("");
              setPassword("");
              setConfirmPassword("");
              setAcceptedTerms(false);
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
              setDevCodeHint("");
              setEmail("");
              setPassword("");
              setConfirmPassword("");
              setAcceptedTerms(false);
            }}
            className={`rounded-xl px-3 py-2 text-center transition ${mode === "register" ? "bg-white text-[var(--blue-900)]" : "text-slate-500"}`}
          >
            Реєстрація
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-2 text-xs font-semibold uppercase tracking-[0.12em]">
          <div className={`rounded-xl px-3 py-2 text-center ${step === "phone" ? "bg-white text-[var(--blue-900)]" : "text-slate-500"}`}>1. Телефон</div>
          <div className={`rounded-xl px-3 py-2 text-center ${step === "code" ? "bg-white text-[var(--blue-900)]" : "text-slate-500"}`}>2. SMS код</div>
        </div>

        {step === "phone" && (
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

                <div>
                  <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-[var(--blue-200)] px-3 py-2.5 text-sm outline-none ring-[var(--green-700)] focus:ring-2"
                    placeholder="you@email.com"
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
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--blue-200)] px-3 py-2.5 text-sm outline-none ring-[var(--green-700)] focus:ring-2"
                placeholder={mode === "login" ? "Ваш пароль" : "Мінімум 8 символів"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            {mode === "register" && (
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Підтвердіть пароль</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="w-full rounded-xl border border-[var(--blue-200)] px-3 py-2.5 text-sm outline-none ring-[var(--green-700)] focus:ring-2"
                  placeholder="Повторіть пароль"
                  autoComplete="new-password"
                />
              </div>
            )}

            <button
              type="button"
              onClick={sendCode}
              disabled={loading}
              className="w-full rounded-full bg-[var(--green-700)] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--green-800)] disabled:opacity-60"
            >
              {loading ? "Відправка..." : mode === "login" ? "Отримати код для входу" : "Отримати код для реєстрації"}
            </button>
          </div>
        )}

        {step === "code" && (
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
              {loading ? "Перевірка..." : mode === "login" ? "Увійти" : "Зареєструватися"}
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
        {devCodeHint && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">{devCodeHint}</p>}
      </div>
    </main>
  );
}
