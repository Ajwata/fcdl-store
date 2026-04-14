"use client";

import { useEffect, useRef, useState } from "react";

import type { StatItem } from "@/data/cms-defaults";

const DEFAULT_STATS: StatItem[] = [
  {
    targetValue: 1280,
    decimals: 0,
    suffix: "+",
    outOf: "",
    label: "бронювань",
    description: "Успішних бронювань з моменту запуску сервісу",
    isThousands: true,
  },
  {
    targetValue: 740,
    decimals: 0,
    suffix: "+",
    outOf: "",
    label: "клієнтів",
    description: "Команд і гравців що обрали наш майданчик",
    isThousands: false,
  },
  {
    targetValue: 4.9,
    decimals: 1,
    suffix: "",
    outOf: "/ 5",
    label: "рейтинг",
    description: "Середня оцінка за якість поля та сервіс",
    isThousands: false,
  },
];

function formatCountValue(n: number, decimals: number, isThousands?: boolean): string {
  if (decimals > 0) return n.toFixed(decimals);
  const integer = Math.round(n);
  if (isThousands && integer >= 1000) {
    const thousands = Math.floor(integer / 1000);
    const rest = integer % 1000;
    return `${thousands}\u00a0${String(rest).padStart(3, "0")}`;
  }
  return String(integer);
}

function CountUp({
  target,
  decimals,
  suffix,
  outOf,
  isThousands,
  active,
}: {
  target: number;
  decimals: number;
  suffix: string;
  outOf: string;
  isThousands: boolean;
  active: boolean;
}) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const duration = 1800;
    let startTime: number | null = null;

    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(eased * target);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setCount(target);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target]);

  const display = formatCountValue(count, decimals, isThousands);

  return (
    <span className="font-display stats-number">
      {display}
      {suffix && <span className="stats-suffix">{suffix}</span>}
      {outOf && <span className="stats-out-of">{outOf}</span>}
    </span>
  );
}

export function StatsSection({ items, badge, title, description }: { items?: StatItem[]; badge?: string; title?: string; description?: string }) {
  const stats = items && items.length > 0 ? items : DEFAULT_STATS;
  const eyebrow = badge || "Цифри говорять";
  const heading = title || "Успіх у деталях";
  const sectionDescription = description || "";
  const sectionRef = useRef<HTMLElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} id="stats" className="stats-section">
      <div className="stats-inner">
        <div className="stats-header">
          <span className="stats-eyebrow">{eyebrow}</span>
          <h2 className="stats-title font-display">{heading}</h2>
          {sectionDescription && <p className="mt-3 max-w-2xl text-sm text-white/80">{sectionDescription}</p>}
        </div>

        <div className="stats-grid">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="stats-item"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="stats-item-inner">
                <div className="stats-value-row">
                  <CountUp
                    target={stat.targetValue}
                    decimals={stat.decimals}
                    suffix={stat.suffix}
                    outOf={stat.outOf}
                    isThousands={stat.isThousands}
                    active={triggered}
                  />
                </div>
                <p className="stats-label">{stat.label}</p>
                <p className="stats-desc">{stat.description}</p>
              </div>

              {i < stats.length - 1 && <div className="stats-divider" aria-hidden />}
            </div>
          ))}
        </div>
      </div>

      <div className="stats-bg-dot-grid" aria-hidden />
      <div className="stats-bg-glow-left" aria-hidden />
      <div className="stats-bg-glow-right" aria-hidden />
    </section>
  );
}
