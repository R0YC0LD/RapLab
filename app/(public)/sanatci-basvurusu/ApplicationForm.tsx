"use client";

/**
 * Başvuru formu — Şartname 12.1 alanları + şeffaflık iyileştirmeleri:
 * - Süreç, başvuru GÖNDERİLMEDEN ÖNCE adım adım anlatılır (şeffaf sistem)
 * - Geçici kimlik fotoğrafı: özel bucket'a yüklenir, süper yönetici yalnızca
 *   BİR KEZ süreli bağlantıyla görebilir, erişim loglanır
 * - Ses beyanı: "RapLab'e sanatçı üyeliği yapmak istiyorum" kaydı (teyit)
 */

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "var(--color-bg-elevated)",
  border: "1px solid var(--color-border-soft)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-primary)",
  width: "100%",
};

const PROCESS_STEPS = [
  ["Başvuruyu doldur", "Sahne adın, tanıtımın, resmî bağlantıların; kimlik fotoğrafın ve sesli beyanın."],
  ["İnceleme", "Moderasyon ekibi bağlantılarını doğrular. Kimlik fotoğrafını yalnızca süper yönetici, yalnızca BİR KEZ, 60 saniyelik özel bağlantıyla görebilir — her erişim kayıt altına alınır."],
  ["Karar", "Onay yalnızca yönetici tarafından verilir. Ret durumunda gerekçesi sana açıkça iletilir; ek bilgi istenirse bildirim alırsın."],
  ["Profil açılışı", "Onayla birlikte doğrulanmış sanatçı profilin ve Artist Studio panelin otomatik açılır; bildirim gönderilir."],
] as const;

/* ---------- Ses beyanı kaydedici ---------- */

function VoiceRecorder({
  onRecorded,
  disabled,
}: {
  onRecorded: (blob: Blob | null) => void;
  disabled: boolean;
}) {
  const [state, setState] = useState<"idle" | "recording" | "recorded" | "unsupported" | "denied">("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof MediaRecorder === "undefined") {
      const unsupportedTimer = window.setTimeout(() => setState("unsupported"), 0);
      return () => window.clearTimeout(unsupportedTimer);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecorded(blob);
        setState("recorded");
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= 29) stop(); // en fazla 30 sn beyan
          return s + 1;
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
    return (
      <p style={{ color: "var(--color-warning)", fontSize: "var(--font-sm)" }}>
        Tarayıcın ses kaydını desteklemiyor; güncel bir tarayıcı kullan.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <p style={{ fontSize: "var(--font-sm)", color: "var(--color-text-secondary)" }}>
        Mikrofona şu cümleyi söyle:{" "}
        <strong style={{ color: "var(--color-text-primary)" }}>
          &quot;RapLab&apos;e sanatçı üyeliği yapmak istiyorum.&quot;
        </strong>{" "}
        (en fazla 30 sn)
      </p>
      {state === "denied" && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>
          Mikrofon izni verilmedi. Tarayıcı ayarlarından izin verip tekrar dene.
        </p>
      )}
      <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center", flexWrap: "wrap" }}>
        {state !== "recording" && state !== "recorded" && (
          <Button type="button" variant="secondary" onClick={start} disabled={disabled}>
            🎙 Kaydı başlat
          </Button>
        )}
        {state === "recording" && (
          <>
            <Button type="button" variant="danger" onClick={stop}>
              ⏹ Durdur ({seconds} sn)
            </Button>
            <span aria-live="polite" style={{ color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>
              ● Kayıt yapılıyor…
            </span>
          </>
        )}
        {state === "recorded" && audioUrl && (
          <>
            <audio controls src={audioUrl} style={{ height: 40 }} />
            <Button type="button" variant="ghost" onClick={reset}>
              Yeniden kaydet
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Ana form ---------- */

export function ApplicationForm({ demoMode }: { demoMode: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [uploadPhase, setUploadPhase] = useState<string | null>(null);

  async function uploadVerification(kind: "identity" | "voice", data: Blob): Promise<string> {
    const fd = new FormData();
    const filename = kind === "identity" ? "kimlik.jpg" : "beyan.webm";
    fd.append(
      "file",
      new File([data], filename, {
        type: data.type || (kind === "voice" ? "audio/webm" : "image/jpeg"),
      })
    );
    fd.append("kind", kind);
    const res = await fetch("/api/verification/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error?.field_errors?.file ?? json.error?.message ?? "Yükleme başarısız.");
    }
    return json.data.storage_path as string;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setErrors({});
    setMessage(null);
    const fd = new FormData(e.currentTarget);

    try {
      // 1) Doğrulama medyalarını özel bucket'a yükle (21.5 akışı)
      let identityPath: string | undefined;
      let voicePath: string | undefined;
      if (!demoMode) {
        if (identityFile) {
          setUploadPhase("Kimlik fotoğrafı güvenli alana yükleniyor…");
          identityPath = await uploadVerification("identity", identityFile);
        }
        if (voiceBlob) {
          setUploadPhase("Ses beyanı güvenli alana yükleniyor…");
          voicePath = await uploadVerification("voice", voiceBlob);
        }
      }
      setUploadPhase(null);

      const socials = String(fd.get("official_social_links") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const distribution = String(fd.get("distribution_links") ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      // 2) Başvuruyu gönder
      const res = await fetch("/api/artist-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage_name: fd.get("stage_name"),
          legal_name: fd.get("legal_name"),
          contact_email: fd.get("contact_email"),
          phone_optional: fd.get("phone_optional") || undefined,
          artist_description: fd.get("artist_description"),
          official_social_links: socials,
          distribution_links: distribution,
          label_name_optional: fd.get("label_name_optional") || undefined,
          applicant_relationship: fd.get("applicant_relationship"),
          rights_declaration: fd.get("rights_declaration") === "on",
          additional_notes: fd.get("additional_notes") || undefined,
          identity_document_path: identityPath,
          voice_declaration_path: voicePath,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setState("sent");
      } else {
        setState("error");
        setMessage(json.error?.message ?? "Başvuru gönderilemedi.");
        setErrors(json.error?.field_errors ?? {});
      }
    } catch (err) {
      setUploadPhase(null);
      setState("error");
      setMessage(err instanceof Error ? err.message : "Bağlantı sorunu. Tekrar dene.");
    }
  }

  if (state === "sent") {
    return (
      <div
        role="status"
        style={{
          padding: "var(--space-8)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-success)",
        }}
      >
        <h2 style={{ marginBottom: "var(--space-2)", color: "var(--color-success)" }}>Başvurun alındı ✓</h2>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Durumunu Hesap sayfandan takip edebilirsin. İnceleme tamamlandığında bildirim
          alacaksın; ek bilgi gerekirse buradan iletilecek.
        </p>
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] ? (
      <span style={{ color: "var(--color-danger)", fontSize: "var(--font-xs)" }}>{errors[k]}</span>
    ) : null;

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: "var(--space-5)" }}>
      {/* ŞEFFAFLIK: süreç, gönderimden önce anlatılır */}
      <section
        aria-labelledby="surec-baslik"
        style={{
          padding: "var(--space-6)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border-soft)",
          background: "var(--color-bg-secondary)",
        }}
      >
        <h2 id="surec-baslik" style={{ fontSize: "var(--font-lg)", marginBottom: "var(--space-4)" }}>
          Süreç nasıl ilerleyecek?
        </h2>
        <ol style={{ margin: 0, paddingLeft: "1.3em", display: "grid", gap: "var(--space-3)" }}>
          {PROCESS_STEPS.map(([title, desc]) => (
            <li key={title}>
              <strong>{title}.</strong>{" "}
              <span style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-sm)" }}>{desc}</span>
            </li>
          ))}
        </ol>
        <p style={{ marginTop: "var(--space-4)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
          Gizlilik: Kimlik fotoğrafın ve ses beyanın herkese kapalı özel bir depoda tutulur;
          hiçbir zaman profilde veya arayüzde görünmez. Kimlik fotoğrafına yalnızca süper
          yönetici, yalnızca bir defa erişebilir ve bu erişim silinemez denetim kaydına işlenir.
          Not: tek seferlik görüntüleme ve filigran caydırıcıdır; hiçbir web sitesi cihaz
          düzeyinde ekran görüntüsünü teknik olarak tümüyle engelleyemez — bu yüzden erişimi
          kişiye, süreye ve tek sefere kilitliyor, her adımı kayıt altına alıyoruz.
        </p>
      </section>

      {state === "error" && message && (
        <p
          role="alert"
          style={{
            padding: "var(--space-4)",
            border: "1px solid var(--color-danger)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-danger)",
            fontSize: "var(--font-sm)",
          }}
        >
          {message}
        </p>
      )}

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Sahne adı *
        <input name="stage_name" required maxLength={80} style={inputStyle} />
        {err("stage_name")}
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Yasal ad soyad *
        <input name="legal_name" required maxLength={160} style={inputStyle} />
        {err("legal_name")}
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
          İletişim e-postası *
          <input name="contact_email" type="email" required style={inputStyle} />
          {err("contact_email")}
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
          Telefon (isteğe bağlı)
          <input name="phone_optional" type="tel" maxLength={40} style={inputStyle} />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Sanatçı tanıtımı * <span style={{ color: "var(--color-text-muted)" }}>(en az 20 karakter)</span>
        <textarea
          name="artist_description"
          required
          minLength={20}
          maxLength={4000}
          rows={5}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        {err("artist_description")}
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Resmî sosyal medya bağlantıları{" "}
        <span style={{ color: "var(--color-text-muted)" }}>(her satıra bir URL)</span>
        <textarea name="official_social_links" rows={3} placeholder="https://..." style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Dağıtım / müzik platformu bağlantıları{" "}
        <span style={{ color: "var(--color-text-muted)" }}>(her satıra bir URL)</span>
        <textarea name="distribution_links" rows={3} placeholder="https://..." style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
        <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
          Label (isteğe bağlı)
          <input name="label_name_optional" maxLength={120} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
          Başvuran ilişkisi *
          <select name="applicant_relationship" required style={inputStyle} defaultValue="artist">
            <option value="artist">Sanatçının kendisi</option>
            <option value="manager">Menajer</option>
            <option value="label">Label temsilcisi</option>
            <option value="team_member">Ekip üyesi</option>
          </select>
        </label>
      </div>

      {/* Geçici kimlik fotoğrafı */}
      <div style={{ padding: "var(--space-5)", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border-strong)" }}>
        <p style={{ fontWeight: 600, marginBottom: 6 }}>Geçici kimlik fotoğrafı *</p>
        <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>
          Kimliğinin ön yüzünün net bir fotoğrafı (JPEG/PNG/WebP, en fazla 8 MB). Yalnızca
          doğrulama için kullanılır; tek seferlik görüntülemeden sonra erişim kapanır.
        </p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required={!demoMode}
          disabled={demoMode}
          onChange={(e) => setIdentityFile(e.target.files?.[0] ?? null)}
          style={{ fontSize: "var(--font-sm)" }}
        />
        {identityFile && (
          <p style={{ fontSize: "var(--font-xs)", color: "var(--color-success)", marginTop: 6 }}>
            ✓ {identityFile.name} ({(identityFile.size / 1_000_000).toFixed(1).replace(".", ",")} MB) —
            gönderimde güvenli alana yüklenecek
          </p>
        )}
      </div>

      {/* Ses beyanı */}
      <div style={{ padding: "var(--space-5)", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border-strong)" }}>
        <p style={{ fontWeight: 600, marginBottom: 6 }}>Sesli beyan *</p>
        <VoiceRecorder onRecorded={setVoiceBlob} disabled={demoMode} />
      </div>

      {demoMode && (
        <p style={{ fontSize: "var(--font-xs)", color: "var(--color-warning)" }}>
          Demo modunda dosya/ses yüklemesi kapalıdır; başvuru bu alanlar olmadan kaydedilir.
        </p>
      )}

      <label style={{ display: "flex", gap: 10, fontSize: "var(--font-sm)", alignItems: "flex-start" }}>
        <input name="rights_declaration" type="checkbox" required style={{ marginTop: 3 }} />
        <span>
          Bu başvuruda verdiğim bilgilerin doğru olduğunu, sahne adı ve içerikler üzerindeki
          hakların bana (veya temsil ettiğim sanatçıya) ait olduğunu beyan ederim. *
        </span>
      </label>

      {uploadPhase && (
        <p role="status" style={{ color: "var(--color-info)", fontSize: "var(--font-sm)" }}>
          ⏳ {uploadPhase}
        </p>
      )}

      <Button type="submit" loading={state === "sending"} disabled={!demoMode && (!identityFile || !voiceBlob)}>
        Başvuruyu gönder
      </Button>
      {!demoMode && (!identityFile || !voiceBlob) && (
        <p style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
          Göndermek için kimlik fotoğrafı ve sesli beyan gerekli.
        </p>
      )}
    </form>
  );
}
