import { describe, expect, it } from "vitest";
import {
  BEAT_STEPS,
  emptyBeatPattern,
  MAX_BPM,
  MIN_BPM,
  normalizeBeatState,
  stepDurationSeconds,
} from "@/lib/audio/raplab-808";

describe("RapLab 808 ayarları", () => {
  it("bozuk depolama verisini güvenli varsayılanlara çevirir", () => {
    const state = normalizeBeatState({
      bpm: 999,
      volume: -2,
      pattern: { kick: [true] },
    });

    expect(state.bpm).toBe(MAX_BPM);
    expect(state.volume).toBe(0);
    expect(state.pattern.kick).toHaveLength(BEAT_STEPS);
  });

  it("tempo süresini sekizlik adımlara göre hesaplar", () => {
    expect(stepDurationSeconds(120)).toBe(0.25);
    expect(stepDurationSeconds(1)).toBe(stepDurationSeconds(MIN_BPM));
  });

  it("temiz desen satırlarını birbirinden bağımsız üretir", () => {
    const pattern = emptyBeatPattern();
    pattern.kick[0] = true;

    expect(pattern.kick[0]).toBe(true);
    expect(pattern.snare[0]).toBe(false);
    expect(Object.values(pattern).every((row) => row.length === BEAT_STEPS)).toBe(true);
  });
});
