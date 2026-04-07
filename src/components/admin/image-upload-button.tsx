"use client";

import { useRef, useState } from "react";

type ImageUploadButtonProps = {
  onUploaded: (url: string) => void;
};

export function ImageUploadButton({ onUploaded }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (result.url) {
        onUploaded(result.url);
      } else {
        setError(result.error ?? "Помилка завантаження");
      }
    } catch {
      setError("Помилка мережі");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="rounded-[10px] border border-[var(--blue-200)] bg-[var(--blue-50)] px-3 py-2 text-xs font-semibold text-[var(--blue-700)] transition hover:bg-[var(--blue-100)] disabled:opacity-50"
      >
        {uploading ? "..." : "Завантажити"}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
