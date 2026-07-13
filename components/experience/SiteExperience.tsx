"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./experience.module.css";

type UiSound = "tap" | "navigate" | "success";

const LIVE_PATHS = new Set(["/", "/kesfet", "/son-paylasimlar", "/yaklasanlar", "/bildirimler"]);
const SOUND_STORAGE_KEY = "raplab-ui-sound";
const LIVE_REFRESH_MS = 60_000;

export function SiteExperience() {
  const pathname = usePathname();
  const router = useRouter();
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const lastRefreshRef = useRef(0);

  const ensureAudio = useCallback(() => {
    if (!audioContextRef.current) {
      if (typeof AudioContext === "undefined") return null;
      let context: AudioContext;
      try {
        context = new AudioContext({ latencyHint: "interactive", sampleRate: 48_000 });
      } catch {
        context = new AudioContext({ latencyHint: "interactive" });
      }
      const master = context.createGain();
      master.gain.value = 0.18;
      master.connect(context.destination);
      audioContextRef.current = context;
      masterGainRef.current = master;
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback(
    (kind: UiSound) => {
      const context = ensureAudio();
      const output = masterGainRef.current;
      if (!context || !output) return;
      if (context.state === "suspended") void context.resume();

      const tone = (
        frequency: number,
        endFrequency: number,
        duration: number,
        delay = 0,
        volume = 0.42
      ) => {
        const start = context.currentTime + delay;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = kind === "success" ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain);
        gain.connect(output);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
      };

      if (kind === "navigate") {
        tone(330, 392, 0.075, 0, 0.28);
        tone(494, 587, 0.085, 0.035, 0.2);
      } else if (kind === "success") {
        tone(440, 523, 0.11, 0, 0.28);
        tone(660, 784, 0.14, 0.055, 0.2);
      } else {
        tone(620, 480, 0.055, 0, 0.24);
      }
    },
    [ensureAudio]
  );

  useEffect(() => {
    let stored = false;
    try {
      stored = window.localStorage.getItem(SOUND_STORAGE_KEY) === "on";
    } catch {
      // Kısıtlı depolama modunda ses tercihi yalnızca bu sekmede yaşar.
    }
    if (stored) window.setTimeout(() => setSoundEnabled(true), 0);
    return () => {
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      masterGainRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!soundEnabled) return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest<HTMLElement>("a[href], button, [role='button']");
      if (
        !interactive ||
        interactive.hasAttribute("data-sound-control") ||
        interactive.matches(":disabled, [aria-disabled='true']") ||
        interactive.closest("audio, video")
      ) {
        return;
      }
      const requested = interactive.dataset.uiSound as UiSound | undefined;
      playSound(requested ?? (interactive.matches("a[href]") ? "navigate" : "tap"));
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [playSound, soundEnabled]);

  useEffect(() => {
    if (!LIVE_PATHS.has(pathname)) return;
    lastRefreshRef.current = Date.now();

    const refresh = () => {
      const now = Date.now();
      if (
        document.visibilityState !== "visible" ||
        !navigator.onLine ||
        now - lastRefreshRef.current < LIVE_REFRESH_MS
      ) {
        return;
      }
      lastRefreshRef.current = now;
      startRefresh(() => router.refresh());
    };

    const interval = window.setInterval(refresh, LIVE_REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [pathname, router]);

  async function toggleSound() {
    const next = !soundEnabled;
    if (next) {
      const context = ensureAudio();
      if (!context) return;
      if (context.state === "suspended") await context.resume();
      setSoundEnabled(true);
      try {
        window.localStorage.setItem(SOUND_STORAGE_KEY, "on");
      } catch {
        // Tercih kalıcılaştırılamasa da mevcut sekmede ses çalışır.
      }
      playSound("success");
      return;
    }
    playSound("tap");
    setSoundEnabled(false);
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, "off");
    } catch {
      // Kısıtlı depolama modu.
    }
  }

  return (
    <>
      <div
        key={pathname}
        className={`${styles.routePulse} ${isRefreshing ? styles.routePulseRefreshing : ""}`}
        aria-hidden="true"
      >
        <span />
      </div>
      <button
        type="button"
        className={`${styles.soundToggle} ${soundEnabled ? styles.soundToggleActive : ""}`}
        onClick={toggleSound}
        data-sound-control
        aria-pressed={soundEnabled}
        aria-label={soundEnabled ? "Arayüz seslerini kapat" : "Arayüz seslerini aç"}
        title={soundEnabled ? "Arayüz seslerini kapat" : "Arayüz seslerini aç"}
      >
        <span aria-hidden="true">♪</span>
        {!soundEnabled && <i aria-hidden="true" />}
      </button>
      <span className="sr-only" aria-live="polite">
        {isRefreshing ? "İçerik güncelleniyor" : ""}
      </span>
    </>
  );
}
