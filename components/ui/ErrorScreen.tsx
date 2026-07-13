/** Hata ekranları — Şartname 27.3: her ekran RapLab tasarımına uygun */

import Link from "next/link";

export const ERROR_SCREENS: Record<
  string,
  { code: string; title: string; description: string }
> = {
  "401": { code: "401", title: "Giriş gerekli", description: "Bu içeriği görmek için önce giriş yapmalısın." },
  "403": { code: "403", title: "Bu alana erişim yetkin yok", description: "Bu sayfa farklı bir rol veya izin gerektiriyor." },
  "404": { code: "404", title: "İçerik bulunamadı", description: "Aradığın sayfa taşınmış ya da hiç var olmamış olabilir." },
  "410": { code: "410", title: "İçerik kaldırılmış", description: "Bu içerik sahibi veya moderasyon tarafından kaldırıldı." },
  "429": { code: "429", title: "Çok fazla işlem yaptın", description: "Kısa bir süre bekleyip tekrar dene." },
  "500": { code: "500", title: "Beklenmeyen sistem sorunu", description: "Bir şeyler ters gitti. Ekibimiz bilgilendirildi." },
  "503": { code: "503", title: "Sistem geçici olarak kullanılamıyor", description: "Bakım veya yoğunluk nedeniyle kısa süreliğine hizmet veremiyoruz." },
};

export function ErrorScreen({
  code,
  requestId,
  action,
}: {
  code: keyof typeof ERROR_SCREENS | string;
  requestId?: string;
  action?: React.ReactNode;
}) {
  const screen = ERROR_SCREENS[code] ?? ERROR_SCREENS["500"];
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "var(--space-10) var(--space-6)",
        gap: "var(--space-4)",
      }}
      className="page-enter"
    >
      <p
        className="type-display"
        style={{
          fontSize: "var(--font-display-lg)",
          lineHeight: 1,
          background: "linear-gradient(180deg, var(--color-text-primary), transparent 160%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          opacity: 0.5,
        }}
        aria-hidden="true"
      >
        {screen.code}
      </p>
      <h1 style={{ fontSize: "var(--font-2xl)" }}>{screen.title}</h1>
      <p style={{ color: "var(--color-text-secondary)", maxWidth: "42ch" }}>{screen.description}</p>
      {requestId && (
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)" }}>
          Takip kodu: <code>{requestId}</code>
        </p>
      )}
      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
        {action ?? (
          <Link
            href={code === "401" ? "/giris" : "/"}
            style={{
              padding: "12px 28px",
              borderRadius: "var(--radius-pill)",
              background: "var(--artist-accent)",
              color: "#0a0a0c",
              fontWeight: 700,
            }}
          >
            {code === "401" ? "Giriş yap" : "Ana sayfaya dön"}
          </Link>
        )}
      </div>
    </div>
  );
}
