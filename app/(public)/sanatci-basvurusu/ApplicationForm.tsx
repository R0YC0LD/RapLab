"use client";

/**
 * Başvuru formu — Şartname 12.1 alanları:
 * stage_name, legal_name, contact_email, phone_optional, artist_description,
 * official_social_links, distribution_links, label_name_optional,
 * applicant_relationship, identity_document, authorization_document_optional,
 * rights_declaration, additional_notes
 */

import { useState } from "react";
import { Button } from "@/components/ui/Button";

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  background: "var(--color-bg-elevated)",
  border: "1px solid var(--color-border-soft)",
  borderRadius: "var(--radius-sm)",
  color: "var(--color-text-primary)",
  width: "100%",
};

export function ApplicationForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setErrors({});
    const fd = new FormData(e.currentTarget);

    const socials = String(fd.get("official_social_links") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const distribution = String(fd.get("distribution_links") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
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
    } catch {
      setState("error");
      setMessage("Bağlantı sorunu. Tekrar dene.");
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
          color: "var(--color-success)",
        }}
      >
        <h2 style={{ marginBottom: "var(--space-2)" }}>Başvurun alındı ✓</h2>
        <p style={{ color: "var(--color-text-secondary)" }}>
          Durumunu Hesap sayfandan takip edebilirsin. Eksik belge olursa bildirim göndereceğiz.
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
      {state === "error" && message && (
        <p role="alert" style={{ padding: "var(--space-4)", border: "1px solid var(--color-danger)", borderRadius: "var(--radius-sm)", color: "var(--color-danger)", fontSize: "var(--font-sm)" }}>
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
        <textarea name="artist_description" required minLength={20} maxLength={4000} rows={5} style={{ ...inputStyle, resize: "vertical" }} />
        {err("artist_description")}
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Resmî sosyal medya bağlantıları <span style={{ color: "var(--color-text-muted)" }}>(her satıra bir URL)</span>
        <textarea name="official_social_links" rows={3} placeholder="https://..." style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Dağıtım / müzik platformu bağlantıları <span style={{ color: "var(--color-text-muted)" }}>(her satıra bir URL)</span>
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

      <div
        style={{
          padding: "var(--space-4)",
          borderRadius: "var(--radius-sm)",
          border: "1px dashed var(--color-border-strong)",
          fontSize: "var(--font-sm)",
          color: "var(--color-text-secondary)",
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Kimlik ve yetki belgeleri</p>
        <p>
          Belge yükleme, başvurun ön incelemeden geçtikten sonra sana gönderilecek güvenli ve
          süreli bir bağlantı üzerinden yapılır. Belgeler özel bir depoda tutulur ve asla
          herkese açık olmaz.
        </p>
      </div>

      <label style={{ display: "grid", gap: 6, fontSize: "var(--font-sm)" }}>
        Ek notlar (isteğe bağlı)
        <textarea name="additional_notes" maxLength={2000} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </label>

      <label style={{ display: "flex", gap: 10, fontSize: "var(--font-sm)", alignItems: "flex-start" }}>
        <input name="rights_declaration" type="checkbox" required style={{ marginTop: 3 }} />
        <span>
          Bu başvuruda verdiğim bilgilerin doğru olduğunu, sahne adı ve içerikler üzerindeki
          hakların bana (veya temsil ettiğim sanatçıya) ait olduğunu beyan ederim. *
        </span>
      </label>

      <Button type="submit" loading={state === "sending"}>
        Başvuruyu gönder
      </Button>
    </form>
  );
}
