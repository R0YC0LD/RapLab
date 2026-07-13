"use client";

/**
 * Gönderi oluşturucu — Şartname 13.3:
 * Masaüstü üç sütun: türler | editör | canlı ön izleme + ayarlar.
 * 13.4 alanları: post_type, title, body, visibility, is_pinned, publish_mode,
 * scheduled_at, allow_external_share, notify_followers, media_items.
 * 8.1: metin ≤ 800 karakter, HTML kabul edilmez.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { POST_BODY_MAX, containsHtml } from "@/lib/validation";
import styles from "../studio.module.css";

const POST_TYPES = [
  { key: "text", label: "Metin", hint: "En fazla 800 karakter, düz metin" },
  { key: "image", label: "Tek Görsel", hint: "Bir görsel + açıklama + alt metin" },
  { key: "gallery", label: "Galeri", hint: "En fazla 6 görsel" },
  { key: "video", label: "Video", hint: "En fazla 90 saniye" },
  { key: "audio_teaser", label: "Kısa Ses", hint: "En fazla 60 saniye önizleme" },
  { key: "announcement", label: "Duyuru", hint: "Başlık, tarih, yer/bağlantı" },
  { key: "countdown", label: "Geri Sayım", hint: "Sunucu saatine bağlı sayaç" },
  { key: "project", label: "Proje", hint: "Uzun soluklu proje duyurusu" },
] as const;

type PostTypeKey = (typeof POST_TYPES)[number]["key"];
const MEDIA_TYPES: PostTypeKey[] = ["image", "gallery", "video", "audio_teaser"];

export function Composer({
  artistId,
  artistName,
  artistAvatar,
  audioEnabled,
  videoEnabled,
  schedulingEnabled,
  demoMode,
}: {
  artistId: string;
  artistName: string;
  artistAvatar: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  schedulingEnabled: boolean;
  demoMode: boolean;
}) {
  const router = useRouter();
  const [postType, setPostType] = useState<PostTypeKey>("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<"public" | "followers" | "unlisted">("public");
  const [isPinned, setIsPinned] = useState(false);
  const [publishMode, setPublishMode] = useState<"now" | "schedule" | "draft">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [allowShare, setAllowShare] = useState(true);
  const [notifyFollowers, setNotifyFollowers] = useState(true);
  const [countdownEndsAt, setCountdownEndsAt] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const isMediaType = MEDIA_TYPES.includes(postType);
  const typeDisabled = (key: PostTypeKey) =>
    (key === "audio_teaser" && !audioEnabled) || (key === "video" && !videoEnabled);

  const htmlWarning = containsHtml(body);
  const overLimit = body.length > POST_BODY_MAX;

  async function submit() {
    setState("sending");
    setMessage(null);
    try {
      const res = await fetch(`/api/artists/${artistId}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_type: postType,
          title: title || null,
          body: body || null,
          visibility,
          is_pinned: isPinned,
          publish_mode: publishMode,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          allow_external_share: allowShare,
          notify_followers: notifyFollowers,
          media_items: [],
          meta:
            postType === "countdown" && countdownEndsAt
              ? { countdown_ends_at: new Date(countdownEndsAt).toISOString() }
              : (postType === "announcement" || postType === "project") && (eventDate || eventLocation)
                ? { event_date: eventDate || undefined, event_location: eventLocation || undefined }
                : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setState("done");
        setTimeout(() => router.push(`/artist-studio/gonderiler?sanatci=${artistId}`), 900);
      } else {
        setState("error");
        const fields = json.error?.field_errors
          ? Object.values(json.error.field_errors as Record<string, string>).join(" ")
          : "";
        setMessage(`${json.error?.message ?? "Gönderi oluşturulamadı."} ${fields}`.trim());
      }
    } catch {
      setState("error");
      setMessage("Bağlantı sorunu. Tekrar dene.");
    }
  }

  return (
    <div className={styles.composer}>
      {/* Sol: gönderi türleri */}
      <div className={styles.typeList} role="radiogroup" aria-label="Gönderi türü">
        {POST_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            role="radio"
            aria-checked={postType === t.key}
            disabled={typeDisabled(t.key)}
            className={`${styles.typeButton} ${postType === t.key ? styles.typeButtonActive : ""}`}
            onClick={() => setPostType(t.key)}
            style={typeDisabled(t.key) ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
          >
            <span style={{ fontWeight: 700, display: "block" }}>{t.label}</span>
            <span style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
              {typeDisabled(t.key) ? "Özellik bayrağıyla kapalı" : t.hint}
            </span>
          </button>
        ))}
      </div>

      {/* Orta: içerik editörü */}
      <div className={styles.panel}>
        <label className={styles.field}>
          Başlık {postType === "announcement" || postType === "countdown" || postType === "project" ? "*" : "(isteğe bağlı)"}
          <input className={styles.input} value={title} onChange={(e) => setTitle(e.target.value.slice(0, 160))} maxLength={160} />
        </label>

        <label className={styles.field}>
          Metin
          <textarea
            className={styles.input}
            rows={7}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ resize: "vertical" }}
            aria-describedby="karakter-sayaci"
          />
          <span
            id="karakter-sayaci"
            style={{
              fontSize: "var(--font-xs)",
              color: overLimit ? "var(--color-danger)" : "var(--color-text-muted)",
              textAlign: "right",
            }}
          >
            {body.length} / {POST_BODY_MAX}
          </span>
          {htmlWarning && (
            <span role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-xs)" }}>
              HTML içeriği kabul edilmez; düz metin kullan.
            </span>
          )}
        </label>

        {postType === "countdown" && (
          <label className={styles.field}>
            Geri sayım bitiş tarihi *
            <input
              type="datetime-local"
              className={styles.input}
              value={countdownEndsAt}
              onChange={(e) => setCountdownEndsAt(e.target.value)}
            />
          </label>
        )}

        {(postType === "announcement" || postType === "project") && (
          <>
            <label className={styles.field}>
              Etkinlik / yayın tarihi
              <input type="date" className={styles.input} value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </label>
            <label className={styles.field}>
              Yer veya bağlantı
              <input className={styles.input} value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} maxLength={200} />
            </label>
          </>
        )}

        {isMediaType && (
          <div
            style={{
              padding: "var(--space-5)",
              border: "1px dashed var(--color-border-strong)",
              borderRadius: "var(--radius-md)",
              textAlign: "center",
              color: "var(--color-text-muted)",
              fontSize: "var(--font-sm)",
            }}
          >
            {demoMode ? (
              <>
                Demo modunda medya yükleme kapalıdır. Supabase Storage yapılandırıldığında bu
                alan imzalı yükleme akışını kullanır (Şartname 21.5) ve medya <em>ready</em>{" "}
                olmadan gönderi yayımlanmaz.
              </>
            ) : (
              <>Dosyaları buraya sürükle veya seç. Medya işlenmeden gönderi yayımlanmaz.</>
            )}
          </div>
        )}
      </div>

      {/* Sağ: canlı ön izleme + ayarlar */}
      <div style={{ display: "grid", gap: "var(--space-5)" }}>
        <div className={styles.panel}>
          <h3 style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "var(--space-4)" }}>
            Canlı Ön İzleme
          </h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: "var(--space-3)" }}>
            <Avatar src={artistAvatar} alt={artistName} size={36} />
            <div>
              <p style={{ fontWeight: 700, fontSize: "var(--font-sm)" }}>{artistName}</p>
              <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>şimdi</p>
            </div>
          </div>
          {title && <p style={{ fontWeight: 700, marginBottom: 6 }}>{title}</p>}
          <p style={{ fontSize: "var(--font-sm)", color: "var(--color-text-secondary)", whiteSpace: "pre-wrap" }}>
            {body || <span style={{ color: "var(--color-text-muted)" }}>Metin burada görünecek…</span>}
          </p>
        </div>

        <div className={styles.panel}>
          <h3 style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "var(--space-4)" }}>
            Ayarlar
          </h3>

          <label className={styles.field}>
            Görünürlük
            <select className={styles.input} value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}>
              <option value="public">Herkese açık</option>
              <option value="followers">Yalnızca takipçiler</option>
              <option value="unlisted">Liste dışı (bağlantıyla)</option>
            </select>
          </label>

          <label className={styles.field}>
            Yayım modu
            <select className={styles.input} value={publishMode} onChange={(e) => setPublishMode(e.target.value as typeof publishMode)}>
              <option value="now">Şimdi yayımla</option>
              <option value="schedule" disabled={!schedulingEnabled}>
                Zamanla{!schedulingEnabled ? " (kapalı)" : ""}
              </option>
              <option value="draft">Taslak olarak kaydet</option>
            </select>
          </label>

          {publishMode === "schedule" && (
            <label className={styles.field}>
              Yayım tarihi *
              <input type="datetime-local" className={styles.input} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </label>
          )}

          <label style={{ display: "flex", gap: 10, fontSize: "var(--font-sm)", marginBottom: "var(--space-3)", alignItems: "center" }}>
            <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} />
            Profilde sabitle
          </label>
          <label style={{ display: "flex", gap: 10, fontSize: "var(--font-sm)", marginBottom: "var(--space-3)", alignItems: "center" }}>
            <input type="checkbox" checked={allowShare} onChange={(e) => setAllowShare(e.target.checked)} />
            Dış paylaşıma izin ver
          </label>
          <label style={{ display: "flex", gap: 10, fontSize: "var(--font-sm)", marginBottom: "var(--space-5)", alignItems: "center" }}>
            <input type="checkbox" checked={notifyFollowers} onChange={(e) => setNotifyFollowers(e.target.checked)} />
            Takipçilere bildirim gönder
          </label>

          {state === "error" && message && (
            <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)", marginBottom: "var(--space-3)" }}>
              {message}
            </p>
          )}
          {state === "done" && (
            <p role="status" style={{ color: "var(--color-success)", fontSize: "var(--font-sm)", marginBottom: "var(--space-3)" }}>
              Gönderi kaydedildi ✓
            </p>
          )}

          <Button
            onClick={submit}
            loading={state === "sending"}
            disabled={overLimit || htmlWarning || (postType === "countdown" && !countdownEndsAt)}
            style={{ width: "100%" }}
          >
            {publishMode === "draft" ? "Taslağı kaydet" : publishMode === "schedule" ? "Zamanla" : "Yayımla"}
          </Button>
        </div>
      </div>
    </div>
  );
}
