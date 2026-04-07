"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PayBookingButtonProps = {
  bookingId: string;
};

export function PayBookingButton({ bookingId }: PayBookingButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onPay = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/account/bookings/${bookingId}/pay`, { method: "POST" });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onPay}
      disabled={loading}
      className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-white disabled:opacity-60"
    >
      {loading ? "..." : "Оплатити"}
    </button>
  );
}
