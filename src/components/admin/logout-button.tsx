"use client";

type LogoutButtonProps = {
  compact?: boolean;
};

export function LogoutButton({ compact = false }: LogoutButtonProps) {
  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/login");
  };

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center gap-3 text-left text-sm font-medium transition ${
        compact
          ? "rounded-full px-3 py-1.5 text-red-700 hover:bg-red-100"
          : "w-full rounded-xl px-3 py-2.5 text-white/75 hover:bg-red-500/15 hover:text-red-300"
      }`}
    >
      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Вийти
    </button>
  );
}
