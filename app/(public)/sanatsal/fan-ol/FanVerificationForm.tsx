"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceDeclarationRecorder } from "@/components/media/VoiceDeclarationRecorder";
import { Button } from "@/components/ui/Button";
import { uploadFormWithTimeout, validateImageSelection } from "@/lib/uploads/client";
import styles from "../sanatsal.module.css";

export function FanVerificationForm({ artists, demoMode }: {
  artists: { id: string; stage_name: string }[];
  demoMode: boolean;
}) {
  const router = useRouter();
  const [artistId, setArtistId] = useState(artists[0]?.id ?? "");
  const [createdOn, setCreatedOn] = useState("");
  const [sample, setSample] = useState<File | null>(null);
  const [voice, setVoice] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const artistName = artists.find((artist) => artist.id === artistId)?.stage_name ?? "seçtiğim sanatçı";
  const prompt = useMemo(() => `Bu görseli ${artistName} için ${createdOn || "belirttiğim tarihte"} çizdim ve çalışma bana aittir.`, [artistName, createdOn]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sample || !voice) {
      setMessage("Örnek görsel ve sesli beyan gerekli.");
      return;
    }
    const imageError = validateImageSelection(sample, 12 * 1024 * 1024);
    if (imageError) { setMessage(imageError); return; }
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.append("artist_id", artistId);
    form.append("art_created_on", createdOn);
    form.append("ownership_declaration", "true");
    form.append("sample_art", sample);
    form.append("voice", new File([voice], voice.type.includes("mp4") ? "fan-beyani.m4a" : "fan-beyani.webm", { type: voice.type || "audio/webm" }));
    try {
      const { json } = await uploadFormWithTimeout("/api/fan-verifications", form, 90_000);
      if (!json.success) throw new Error(json.error?.message ?? "Başvuru gönderilemedi.");
      router.push("/sanatsal");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bağlantı sorunu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.notice}>Örnek görsel ve ses kaydı herkese açılmaz. Yalnızca moderasyon ekibi sahiplik beyanını incelemek için süreli bağlantıyla erişir; her erişim audit kaydına yazılır. Onaydan sonra paylaşacağın eserler Sanatsal akışında görünür.</div>
      <label className={styles.field}>Görseli kimin için çizdin?
        <select className={styles.input} value={artistId} onChange={(event) => { setArtistId(event.target.value); setVoice(null); }} required>
          {artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.stage_name}</option>)}
        </select>
      </label>
      <label className={styles.field}>Çizim tarihi
        <input className={styles.input} type="date" value={createdOn} max={new Date().toISOString().slice(0, 10)} onChange={(event) => { setCreatedOn(event.target.value); setVoice(null); }} required />
      </label>
      <label className={styles.field}>Sana ait örnek çalışma
        <input className={styles.input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={(event) => setSample(event.target.files?.[0] ?? null)} required disabled={demoMode} />
      </label>
      <div className={styles.field}>
        <span>Sesli sahiplik beyanı</span>
        <VoiceDeclarationRecorder key={prompt} prompt={prompt} onRecorded={setVoice} disabled={demoMode || !artistId || !createdOn} />
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "var(--font-sm)" }}>
        <input type="checkbox" required />
        <span>Yüklediğim görseli kendim ürettiğimi, üçüncü kişilerin telif veya kişilik haklarını ihlal etmediğini beyan ederim.</span>
      </label>
      {message && <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>{message}</p>}
      <Button type="submit" loading={busy} disabled={demoMode || !sample || !voice || !createdOn}>Fan doğrulamasına gönder</Button>
    </form>
  );
}
