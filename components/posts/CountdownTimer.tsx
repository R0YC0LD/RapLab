"use client";

/**
 * Geri sayım — Şartname 8.1: sunucu zamanına bağlı sayaç; süre dolduğunda
 * otomatik durum değişimi. Sunucudan gelen hedef zaman ve sunucu saati
 * arasındaki fark istemci saatinden bağımsız hesaplanır.
 */

import { useEffect, useState } from "react";
import styles from "./posts.module.css";

function diffParts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function CountdownTimer({
  endsAt,
  serverNow,
}: {
  endsAt: string;
  serverNow: string;
}) {
  // Sunucu-istemci saat farkı düzeltmesi
  const [offset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const [remaining, setRemaining] = useState(
    () => new Date(endsAt).getTime() - (Date.now() + offset)
  );

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(new Date(endsAt).getTime() - (Date.now() + offset));
    }, 1000);
    return () => clearInterval(t);
  }, [endsAt, offset]);

  if (remaining <= 0) {
    return (
      <div className={styles.countdown} role="status">
        <p style={{ fontWeight: 700, color: "var(--artist-accent)" }}>
          Süre doldu — yayında!
        </p>
      </div>
    );
  }

  const p = diffParts(remaining);
  const cells = [
    { value: p.days, label: "Gün" },
    { value: p.hours, label: "Saat" },
    { value: p.minutes, label: "Dakika" },
    { value: p.seconds, label: "Saniye" },
  ];

  return (
    <div className={styles.countdown} role="timer" aria-label="Geri sayım">
      {cells.map((c) => (
        <div key={c.label} className={styles.countdownCell}>
          <div className={styles.countdownValue}>{String(c.value).padStart(2, "0")}</div>
          <div className={styles.countdownLabel}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}
