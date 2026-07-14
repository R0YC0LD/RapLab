"use client";

/* eslint-disable @next/next/no-img-element -- Blob on izlemeleri Next Image optimizasyonundan gecmez. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { uploadFormWithTimeout, validateImageSelection } from "@/lib/uploads/client";
import styles from "../sanatsal.module.css";

export function FanArtComposer({ artists, demoMode }: { artists: { id: string; stage_name: string; slug: string }[]; demoMode: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    const imageError = validateImageSelection(file, 12 * 1024 * 1024);
    if (imageError) { setMessage(imageError); return; }
    setBusy(true);
    const form = new FormData(event.currentTarget);
    form.set("file", file);
    try {
      const { json } = await uploadFormWithTimeout("/api/fan-art", form, 90_000);
      if (!json.success) throw new Error(json.error?.message ?? "Paylaşım tamamlanamadı.");
      router.push("/sanatsal");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bağlantı sorunu.");
    } finally { setBusy(false); }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}>İlgili sanatçı
        <select name="artist_id" className={styles.input} required>{artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.stage_name} (#{artist.slug})</option>)}</select>
      </label>
      <label className={styles.field}>Görsel
        <input className={styles.input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" required disabled={demoMode} onChange={(event) => {
          if (preview) URL.revokeObjectURL(preview);
          const next = event.target.files?.[0] ?? null;
          setFile(next);
          setPreview(next ? URL.createObjectURL(next) : null);
        }} />
      </label>
      {preview && <div className={styles.artFrame} style={{ maxWidth: 420 }}><img className={styles.artImage} src={preview} alt="Paylaşım ön izlemesi" /></div>}
      <label className={styles.field}>Kısa not
        <textarea name="caption" className={styles.input} maxLength={600} rows={4} placeholder="Çalışmanın fikrini veya tekniğini anlat." />
      </label>
      <label className={styles.field}>Hashtagler
        <input name="hashtags" className={styles.input} maxLength={240} placeholder="#dijitalçizim #kapaktasarımı" />
        <span style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>Sanatçı etiketi ve #fanart otomatik eklenir. En fazla 10 etiket.</span>
      </label>
      <div className={styles.notice}>Yalnızca kendi ürettiğin görseli paylaş. Yorumlar kapalıdır; topluluk eserleri yalnızca beğeniyle destekler.</div>
      {message && <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>{message}</p>}
      <Button type="submit" loading={busy} disabled={demoMode || !file}>Sanatsal&apos;da paylaş</Button>
    </form>
  );
}
