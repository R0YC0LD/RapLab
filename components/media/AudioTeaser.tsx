"use client";

/**
 * Kısa ses önizlemesi — Şartname 8.1:
 * - En fazla 60 saniye; ana müzik oynatıcısı OLUŞTURMAZ
 * - Gönderi kartının içinde oynar; küçük waveform bulunur
 * - Sayfadan çıkıldığında durur; aynı anda yalnızca BİR ses oynar
 */

import { useEffect, useRef, useState } from "react";
import styles from "@/components/posts/posts.module.css";

/** Aynı anda tek ses garantisi için global kayıt */
let activeAudio: HTMLAudioElement | null = null;

export function AudioTeaser({
  src,
  waveform,
  durationSeconds,
  title,
}: {
  src: string;
  waveform: number[] | null;
  durationSeconds: number | null;
  title: string | null;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  const bars = waveform && waveform.length > 0 ? waveform : Array.from({ length: 32 }, () => 0.5);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      // Sayfadan/karttan çıkınca durdur
      if (audio && !audio.paused) audio.pause();
      if (activeAudio === audio) activeAudio = null;
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    // Aynı anda yalnızca bir ses
    if (activeAudio && activeAudio !== audio) {
      activeAudio.pause();
    }
    activeAudio = audio;

    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setFailed(true));
  }

  return (
    <div className={styles.audioTeaser}>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          if (a.duration > 0) setProgress(a.currentTime / a.duration);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        className={styles.audioPlayButton}
        onClick={toggle}
        aria-label={playing ? "Duraklat" : `Ses önizlemesini oynat${title ? `: ${title}` : ""}`}
        disabled={failed}
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M4 2.5v11l9-5.5-9-5.5Z" />
          </svg>
        )}
      </button>

      <div className={styles.waveform} aria-hidden="true">
        {bars.map((v, i) => (
          <span
            key={i}
            className={`${styles.waveformBar} ${i / bars.length <= progress ? styles.waveformBarPlayed : ""}`}
            style={{ height: `${Math.max(12, v * 100)}%` }}
          />
        ))}
      </div>

      <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", flexShrink: 0 }}>
        {failed ? "Ses yüklenemedi" : durationSeconds ? `${Math.round(durationSeconds)} sn` : ""}
      </span>
    </div>
  );
}
