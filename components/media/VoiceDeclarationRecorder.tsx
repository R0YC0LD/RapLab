"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const PREFERRED_RECORDING_TYPES = [
  "audio/webm;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm",
] as const;

export function VoiceDeclarationRecorder({
  prompt,
  onRecorded,
  disabled = false,
  maxSeconds = 30,
}: {
  prompt: string;
  onRecorded: (blob: Blob | null) => void;
  disabled?: boolean;
  maxSeconds?: number;
}) {
  const [state, setState] = useState<"idle" | "recording" | "recorded" | "unsupported" | "denied">("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof MediaRecorder === "undefined") {
      const timer = window.setTimeout(() => setState("unsupported"), 0);
      return () => window.clearTimeout(timer);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, [audioUrl]);

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1 },
          sampleRate: { ideal: 48_000 },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType = PREFERRED_RECORDING_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 256_000,
      });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        onRecorded(blob);
        setState("recorded");
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start(250);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((value) => {
          if (value >= maxSeconds - 1) stop();
          return value + 1;
        });
      }, 1000);
      setState("recording");
    } catch {
      setState("denied");
    }
  }

  function reset() {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    onRecorded(null);
    setState("idle");
    setSeconds(0);
  }

  if (state === "unsupported") {
    return <p style={{ color: "var(--color-warning)", fontSize: "var(--font-sm)" }}>Tarayıcın ses kaydını desteklemiyor; güncel bir tarayıcı kullan.</p>;
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <p style={{ fontSize: "var(--font-sm)", color: "var(--color-text-secondary)" }}>
        Mikrofona şu beyanı söyle: <strong style={{ color: "var(--color-text-primary)" }}>&quot;{prompt}&quot;</strong> (en fazla {maxSeconds} sn)
      </p>
      {state === "denied" && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>
          Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verip tekrar dene.
        </p>
      )}
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
        {state !== "recording" && state !== "recorded" && (
          <Button type="button" variant="secondary" onClick={start} disabled={disabled}>Kaydı başlat</Button>
        )}
        {state === "recording" && (
          <>
            <Button type="button" variant="danger" onClick={stop}>Durdur ({seconds} sn)</Button>
            <span aria-live="polite" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>Kayıt yapılıyor</span>
          </>
        )}
        {state === "recorded" && audioUrl && (
          <>
            <audio controls src={audioUrl} style={{ height: 40, maxWidth: "100%" }} />
            <Button type="button" variant="ghost" onClick={reset}>Yeniden kaydet</Button>
          </>
        )}
      </div>
    </div>
  );
}
