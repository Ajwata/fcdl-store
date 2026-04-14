"use client";

import { useState } from "react";

type PhoneChangeStep = "idle" | "send" | "verify" | "done";

type AccountProfileEditorProps = {
  initialName: string;
  initialPhone: string;
  initialAvatarUrl?: string;
};

function normalizeAvatarUrl(value: string | null | undefined): string {
  const avatar = (value ?? "").trim();
  if (!avatar) return "";
  if (/^https?:\/\//i.test(avatar) || avatar.startsWith("/")) return avatar;
  if (avatar.startsWith("uploads/")) return `/${avatar}`;
  if (/^avatar-.+\.(png|jpe?g|webp|gif)$/i.test(avatar)) return `/uploads/avatars/${avatar}`;
  return `/${avatar}`;
}

export function AccountProfileEditor({ initialName, initialPhone, initialAvatarUrl }: AccountProfileEditorProps) {
  const [profileName, setProfileName] = useState(initialName);
  const [profilePhone, setProfilePhone] = useState(initialPhone);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(normalizeAvatarUrl(initialAvatarUrl));
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  // Phone change state
  const [phoneStep, setPhoneStep] = useState<PhoneChangeStep>("idle");
  const [newPhone, setNewPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const onRequestPhoneChange = async () => {
    setPhoneError("");
    setPhoneBusy(true);
    try {
      const response = await fetch("/api/account/phone-change/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setPhoneError(result.error ?? "Помилка відправки SMS");
        return;
      }
      setPhoneStep("verify");
    } catch {
      setPhoneError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const onVerifyPhoneChange = async () => {
    setPhoneError("");
    setPhoneBusy(true);
    try {
      const response = await fetch("/api/account/phone-change/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: newPhone, code: smsCode }),
      });
      const result = (await response.json()) as { error?: string; user?: { phone: string } };
      if (!response.ok) {
        setPhoneError(result.error ?? "Невірний код");
        return;
      }
      setProfilePhone(result.user?.phone ?? newPhone);
      setPhoneStep("done");
      setSmsCode("");
    } catch {
      setPhoneError("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setPhoneBusy(false);
    }
  };

  const onSaveProfile = async () => {
    setStatusMessage("");
    setProfileSaving(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          avatarUrl: profileAvatarUrl,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatusMessage(result.error ?? "Не вдалося оновити профіль");
        return;
      }
      setStatusMessage("Профіль оновлено.");
    } catch {
      setStatusMessage("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setProfileSaving(false);
    }
  };

  const onUploadAvatar = async (file: File) => {
    setStatusMessage("");
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/account/avatar", {
        method: "POST",
        body: formData,
      });

      const result = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !result.url) {
        setStatusMessage(result.error ?? "Не вдалося завантажити аватар");
        return;
      }

      setProfileAvatarUrl(normalizeAvatarUrl(result.url));
      setStatusMessage("Аватар завантажено. Натисніть 'Зберегти', щоб підтвердити зміни.");
    } catch {
      setStatusMessage("Помилка мережі. Спробуйте ще раз.");
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-[var(--blue-100)] bg-white p-6 shadow-[0_16px_40px_rgba(8,26,51,0.1)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--blue-700)]">Ваш профіль</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[220px_1fr]">
          <div className="space-y-3 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-4">
            <img
              src={profileAvatarUrl || "/window.svg"}
              alt="Аватар"
              className="mx-auto h-28 w-28 rounded-full border-4 border-white object-cover shadow-md"
              onError={(event) => {
                if (event.currentTarget.src.endsWith("/window.svg")) return;
                event.currentTarget.src = "/window.svg";
              }}
            />
            <label className="inline-flex w-full cursor-pointer items-center justify-center rounded-full border border-[var(--blue-200)] bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-900)]">
              {avatarUploading ? "Завантаження..." : "Змінити аватар"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={avatarUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onUploadAvatar(file);
                }}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-700)]">Ім'я</label>
              <input
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                className="w-full rounded-xl border border-[var(--blue-200)] bg-white px-3 py-2.5 text-sm text-[var(--blue-950)] outline-none ring-[var(--green-700)] focus:ring-2"
                placeholder="Ваше ім'я"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-700)]">Телефон</label>
              <input
                value={profilePhone}
                readOnly
                className="w-full rounded-xl border border-[var(--blue-100)] bg-[var(--blue-50)] px-3 py-2.5 text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-slate-400">Це ваш логін. Для зміни номера зверніться до адміністратора.</p>
            </div>

              {phoneStep === "idle" && (
                <button
                  type="button"
                  onClick={() => { setPhoneStep("send"); setPhoneError(""); setNewPhone(""); }}
                  className="mt-1 rounded-full border border-[var(--blue-200)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-900)] transition hover:bg-[var(--blue-50)]"
                >
                  Змінити номер телефону
                </button>
              )}

              {phoneStep === "done" && (
                <p className="mt-1 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  Номер успішно змінено на {profilePhone}
                </p>
              )}

              {(phoneStep === "send" || phoneStep === "verify") && (
                <div className="mt-2 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-700)]">Зміна номера телефону</p>

                  {phoneStep === "send" && (
                    <>
                      <p className="text-xs text-slate-500">Вкажіть новий номер — ми надішлемо SMS з кодом підтвердження.</p>
                      <input
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        placeholder="+380..."
                        className="w-full rounded-xl border border-[var(--blue-200)] bg-white px-3 py-2.5 text-sm text-[var(--blue-950)] outline-none ring-[var(--green-700)] focus:ring-2"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={phoneBusy}
                          onClick={onRequestPhoneChange}
                          className="rounded-full bg-[var(--blue-900)] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] !text-white transition hover:bg-[var(--blue-800)] disabled:opacity-60"
                        >
                          {phoneBusy ? "Надсилання..." : "Надіслати код"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPhoneStep("idle"); setPhoneError(""); }}
                          className="rounded-full border border-[var(--blue-200)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-900)] transition hover:bg-[var(--blue-50)]"
                        >
                          Скасувати
                        </button>
                      </div>
                    </>
                  )}

                  {phoneStep === "verify" && (
                    <>
                      <p className="text-xs text-slate-500">
                        Код відправлено на <strong>{newPhone}</strong>. Введіть його нижче.
                      </p>
                      <input
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full rounded-xl border border-[var(--blue-200)] bg-white px-3 py-2.5 text-lg font-bold text-center tracking-[0.3em] text-[var(--blue-950)] outline-none ring-[var(--green-700)] focus:ring-2"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={phoneBusy || smsCode.length !== 6}
                          onClick={onVerifyPhoneChange}
                          className="rounded-full bg-[var(--green-700)] px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] !text-white transition hover:bg-[var(--green-800)] disabled:opacity-60"
                        >
                          {phoneBusy ? "Перевірка..." : "Підтвердити"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPhoneStep("send"); setSmsCode(""); setPhoneError(""); }}
                          className="rounded-full border border-[var(--blue-200)] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-[var(--blue-900)] transition hover:bg-[var(--blue-50)]"
                        >
                          Інший номер
                        </button>
                      </div>
                    </>
                  )}

                  {phoneError && (
                    <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{phoneError}</p>
                  )}
                </div>
              )}

            <button
              type="button"
              onClick={onSaveProfile}
              disabled={profileSaving}
              className="rounded-full bg-[var(--green-700)] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--green-800)] disabled:opacity-60"
            >
              {profileSaving ? "Збереження..." : "Зберегти зміни"}
            </button>
          </div>
        </div>

        {statusMessage && (
          <p className="mt-4 rounded-2xl border border-[var(--blue-100)] bg-[var(--blue-50)] px-4 py-3 text-sm font-semibold text-[var(--blue-900)]">
            {statusMessage}
          </p>
        )}
      </div>
    </section>
  );
}
