"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AudioLines,
  Pause,
  Play,
  Power,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { BrandSticker, type BrandStickerName } from "@/components/brand/BrandSticker";
import {
  BEAT_INSTRUMENTS,
  BEAT_STEPS,
  emptyBeatPattern,
  MAX_BPM,
  MIN_BPM,
  normalizeBeatState,
  RapLab808Engine,
  stepDurationSeconds,
  type BeatInstrument,
  type BeatPattern,
} from "@/lib/audio/raplab-808";
import styles from "./experience.module.css";

type UiSound = "tap" | "success";

const LIVE_PATHS = new Set(["/", "/kesfet", "/son-paylasimlar", "/yaklasanlar", "/bildirimler"]);
const BEAT_LAB_PATHS = new Set([
  "/kesfet",
  "/sanatcilar",
  "/sanatsal",
  "/son-paylasimlar",
  "/yaklasanlar",
  "/raplab-ozel",
]);
const SOUND_STORAGE_KEY = "raplab-ui-sound";
const BEAT_STORAGE_KEY = "raplab-808-state-v1";
const LIVE_REFRESH_MS = 60_000;
const SCHEDULE_AHEAD_SECONDS = 0.1;
const SCHEDULER_INTERVAL_MS = 25;
const DEFAULT_BEAT_STATE = normalizeBeatState(null);

const INSTRUMENT_META: Record<
  BeatInstrument,
  { label: string; sticker: BrandStickerName }
> = {
  kick: { label: "KICK", sticker: "machine" },
  snare: { label: "SNARE", sticker: "boombox" },
  hat: { label: "HI-HAT", sticker: "cassette" },
  bass: { label: "808", sticker: "vinyl" },
};

function isBeatInstrument(value: string | undefined): value is BeatInstrument {
  return Boolean(value && BEAT_INSTRUMENTS.includes(value as BeatInstrument));
}

export function SiteExperience() {
  const pathname = usePathname();
  const router = useRouter();
  const beatLabEnabled = BEAT_LAB_PATHS.has(pathname);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);
  const [bpm, setBpm] = useState(DEFAULT_BEAT_STATE.bpm);
  const [volume, setVolume] = useState(DEFAULT_BEAT_STATE.volume);
  const [pattern, setPattern] = useState<BeatPattern>(() => normalizeBeatState(null).pattern);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [isRefreshing, startRefresh] = useTransition();
  const engineRef = useRef<RapLab808Engine | null>(null);
  const soundEnabledRef = useRef(false);
  const playingRef = useRef(false);
  const bpmRef = useRef(bpm);
  const patternRef = useRef(pattern);
  const schedulerRef = useRef<number | null>(null);
  const visualTimersRef = useRef<Set<number>>(new Set());
  const transportRef = useRef({ nextStepTime: 0, step: 0, startedAt: 0 });
  const lastRefreshRef = useRef(0);

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new RapLab808Engine();
    return engineRef.current;
  }, []);

  const rememberSoundPreference = useCallback((enabled: boolean) => {
    soundEnabledRef.current = enabled;
    setSoundEnabled(enabled);
    try {
      window.localStorage.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // Kısıtlı depolama modunda tercih yalnızca bu sekmede yaşar.
    }
  }, []);

  const clearVisualTimers = useCallback(() => {
    for (const timer of visualTimersRef.current) window.clearTimeout(timer);
    visualTimersRef.current.clear();
  }, []);

  const stopTransport = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setActiveStep(-1);
    if (schedulerRef.current !== null) window.clearInterval(schedulerRef.current);
    schedulerRef.current = null;
    clearVisualTimers();
  }, [clearVisualTimers]);

  const scheduleAhead = useCallback(() => {
    const engine = engineRef.current;
    const context = engine?.ensureContext();
    if (!engine || !context || !playingRef.current) return;

    while (transportRef.current.nextStepTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const step = transportRef.current.step;
      const at = transportRef.current.nextStepTime;

      for (const instrument of BEAT_INSTRUMENTS) {
        if (patternRef.current[instrument][step]) {
          const accent = step === 0 ? 1.08 : 0.88;
          engine.trigger(instrument, at, accent, step);
        }
      }

      const delay = Math.max(0, (at - context.currentTime) * 1000);
      const timer = window.setTimeout(() => {
        visualTimersRef.current.delete(timer);
        if (playingRef.current) setActiveStep(step);
      }, delay);
      visualTimersRef.current.add(timer);

      transportRef.current.nextStepTime += stepDurationSeconds(bpmRef.current);
      transportRef.current.step = (step + 1) % BEAT_STEPS;
    }
  }, []);

  const startTransport = useCallback(async () => {
    if (playingRef.current) return;
    const engine = getEngine();
    const context = await engine.activate();
    if (!context) return;
    engine.setVolume(volume);
    rememberSoundPreference(true);
    playingRef.current = true;
    setIsPlaying(true);
    transportRef.current = {
      nextStepTime: context.currentTime + 0.055,
      step: 0,
      startedAt: context.currentTime + 0.055,
    };
    scheduleAhead();
    schedulerRef.current = window.setInterval(scheduleAhead, SCHEDULER_INTERVAL_MS);
  }, [getEngine, rememberSoundPreference, scheduleAhead, volume]);

  const triggerBeat = useCallback(
    async (instrument: BeatInstrument, quantized = playingRef.current) => {
      const engine = getEngine();
      const context = await engine.activate();
      if (!context) return;
      engine.setVolume(volume);

      let at: number | undefined;
      if (quantized && transportRef.current.startedAt > 0) {
        const duration = stepDurationSeconds(bpmRef.current);
        const elapsed = Math.max(0, context.currentTime - transportRef.current.startedAt);
        at = transportRef.current.startedAt + (Math.floor(elapsed / duration) + 1) * duration;
      }
      engine.trigger(instrument, at, 0.92, transportRef.current.step);
    },
    [getEngine, volume]
  );

  const playUiSound = useCallback(
    async (kind: UiSound) => {
      const engine = getEngine();
      const context = await engine.activate();
      if (!context) return;
      engine.setVolume(volume);
      const now = context.currentTime + 0.005;

      if (kind === "success") {
        engine.trigger("snare", now, 0.72);
        engine.trigger("hat", now + 0.075, 0.74);
      } else {
        engine.trigger("hat", now, 0.42);
      }
    },
    [getEngine, volume]
  );

  useEffect(() => {
    const preferenceTimer = window.setTimeout(() => {
      try {
        const saved = window.localStorage.getItem(BEAT_STORAGE_KEY);
        const normalized = normalizeBeatState(saved ? JSON.parse(saved) : null);
        setBpm(normalized.bpm);
        setVolume(normalized.volume);
        setPattern(normalized.pattern);
        bpmRef.current = normalized.bpm;
        patternRef.current = normalized.pattern;

        const storedSound = window.localStorage.getItem(SOUND_STORAGE_KEY) === "on";
        soundEnabledRef.current = storedSound;
        setSoundEnabled(storedSound);
      } catch {
        // Bozuk veya erişilemeyen tercih verisinde güvenli varsayılanlar kullanılır.
      }
      setHasLoadedPreferences(true);
    }, 0);

    return () => {
      window.clearTimeout(preferenceTimer);
      if (schedulerRef.current !== null) window.clearInterval(schedulerRef.current);
      clearVisualTimers();
      engineRef.current?.close();
      engineRef.current = null;
    };
  }, [clearVisualTimers]);

  useEffect(() => {
    if (!hasLoadedPreferences) return;
    try {
      window.localStorage.setItem(BEAT_STORAGE_KEY, JSON.stringify({ bpm, volume, pattern }));
    } catch {
      // Kısıtlı depolama modu.
    }
  }, [bpm, hasLoadedPreferences, pattern, volume]);

  useEffect(() => {
    if (beatLabEnabled) return;
    const timer = window.setTimeout(() => {
      setPanelOpen(false);
      stopTransport();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [beatLabEnabled, stopTransport]);

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

      const instrument = interactive.dataset.beatInstrument;
      if (!isBeatInstrument(instrument)) return;
      void triggerBeat(instrument);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [soundEnabled, triggerBeat]);

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
    if (!soundEnabledRef.current) {
      const context = await getEngine().activate();
      if (!context) return;
      getEngine().setVolume(volume);
      rememberSoundPreference(true);
      void playUiSound("success");
      return;
    }

    void triggerBeat("hat", false);
    stopTransport();
    rememberSoundPreference(false);
  }

  function updateBpm(next: number) {
    const safe = Math.min(MAX_BPM, Math.max(MIN_BPM, next));
    bpmRef.current = safe;
    setBpm(safe);
  }

  function updateVolume(next: number) {
    const safe = Math.min(1, Math.max(0, next));
    setVolume(safe);
    getEngine().setVolume(safe);
  }

  function toggleStep(instrument: BeatInstrument, index: number) {
    setPattern((current) => {
      const next = {
        ...current,
        [instrument]: current[instrument].map((enabled, step) =>
          step === index ? !enabled : enabled
        ),
      };
      patternRef.current = next;
      return next;
    });
    if (!soundEnabledRef.current) rememberSoundPreference(true);
    void triggerBeat(instrument, false);
  }

  function clearPattern() {
    const next = emptyBeatPattern();
    patternRef.current = next;
    setPattern(next);
    void playUiSound("tap");
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

      {beatLabEnabled && panelOpen && (
        <section
          id="raplab-808-panel"
          className={styles.beatPanel}
          aria-label="RapLab 808 ritim stüdyosu"
        >
          <header className={styles.beatHeader}>
            <BrandSticker name="machine" size={54} />
            <div className={styles.beatIdentity}>
              <strong>RAPLAB 808</strong>
              <span className={soundEnabled ? styles.liveState : undefined}>
                {isPlaying ? "CANLI" : soundEnabled ? "HAZIR" : "SESSİZ"}
              </span>
            </div>
            <div className={styles.beatActions}>
              <button
                type="button"
                className={`${styles.iconControl} ${soundEnabled ? styles.iconControlActive : ""}`}
                onClick={toggleSound}
                data-sound-control
                aria-pressed={soundEnabled}
                aria-label={soundEnabled ? "Sesi kapat" : "Sesi aç"}
                title={soundEnabled ? "Sesi kapat" : "Sesi aç"}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                type="button"
                className={`${styles.iconControl} ${isPlaying ? styles.transportActive : ""}`}
                onClick={() => (isPlaying ? stopTransport() : void startTransport())}
                data-sound-control
                aria-label={isPlaying ? "Ritmi durdur" : "Ritmi başlat"}
                title={isPlaying ? "Ritmi durdur" : "Ritmi başlat"}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
              </button>
              <button
                type="button"
                className={styles.iconControl}
                onClick={clearPattern}
                data-sound-control
                aria-label="Ritmi temizle"
                title="Ritmi temizle"
              >
                <RotateCcw size={18} />
              </button>
              <button
                type="button"
                className={styles.iconControl}
                onClick={() => setPanelOpen(false)}
                data-sound-control
                aria-label="808 stüdyosunu kapat"
                title="Kapat"
              >
                <X size={19} />
              </button>
            </div>
          </header>

          <div className={styles.transportStrip}>
            <label className={styles.tempoControl}>
              <span>BPM</span>
              <input
                type="range"
                min={MIN_BPM}
                max={MAX_BPM}
                value={bpm}
                onChange={(event) => updateBpm(Number(event.target.value))}
                data-sound-control
              />
              <output>{bpm}</output>
            </label>
            <label className={styles.volumeControl}>
              <Volume2 size={15} aria-hidden="true" />
              <span className="sr-only">Ses seviyesi</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => updateVolume(Number(event.target.value))}
                data-sound-control
              />
            </label>
          </div>

          <div className={styles.sequencer}>
            {BEAT_INSTRUMENTS.map((instrument) => (
              <div className={styles.instrumentRow} key={instrument}>
                <button
                  type="button"
                  className={styles.instrumentTrigger}
                  onClick={() => {
                    if (!soundEnabledRef.current) rememberSoundPreference(true);
                    void triggerBeat(instrument, false);
                  }}
                  data-sound-control
                  aria-label={`${INSTRUMENT_META[instrument].label} sesini çal`}
                >
                  <BrandSticker name={INSTRUMENT_META[instrument].sticker} size={30} />
                  <span>{INSTRUMENT_META[instrument].label}</span>
                </button>
                <div className={styles.steps}>
                  {pattern[instrument].map((enabled, index) => (
                    <button
                      type="button"
                      key={`${instrument}-${index}`}
                      className={`${styles.step} ${enabled ? styles.stepEnabled : ""} ${activeStep === index ? styles.stepCurrent : ""}`}
                      onClick={() => toggleStep(instrument, index)}
                      data-sound-control
                      aria-pressed={enabled}
                      aria-label={`${INSTRUMENT_META[instrument].label}, ${index + 1}. adım`}
                    >
                      <span />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.navSync} aria-hidden="true">
            <AudioLines size={15} />
            <span>NAV SYNC</span>
            <i className={isPlaying ? styles.navSyncActive : undefined} />
          </div>
        </section>
      )}

      {beatLabEnabled && !panelOpen && (
        <button
          type="button"
          className={`${styles.beatLauncher} ${soundEnabled ? styles.beatLauncherActive : ""}`}
          onClick={() => setPanelOpen(true)}
          data-sound-control
          aria-expanded="false"
          aria-controls="raplab-808-panel"
          aria-label="808 stüdyosunu aç"
          title="RapLab 808"
        >
          <BrandSticker name="machine" size={46} />
          <span>
            <strong>808 LAB</strong>
            <small>{isPlaying ? `${bpm} BPM` : soundEnabled ? "HAZIR" : "SESSİZ"}</small>
          </span>
          <Power size={15} aria-hidden="true" />
        </button>
      )}

      <span className="sr-only" aria-live="polite">
        {isRefreshing ? "İçerik güncelleniyor" : isPlaying ? `Ritim ${bpm} BPM hızında çalıyor` : ""}
      </span>
    </>
  );
}
