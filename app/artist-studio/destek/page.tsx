/** Destek — Şartname 13.1 */

import type { Metadata } from "next";
import { getStudioContext } from "../helpers";
import { StudioShell } from "@/components/studio/StudioShell";
import styles from "../studio.module.css";

export const metadata: Metadata = { title: "Destek — Artist Studio", robots: { index: false } };

const FAQ = [
  {
    q: "Gönderim neden yayımlanmıyor?",
    a: "Bütün medya dosyaları 'ready' durumuna gelmeden gönderi yayımlanmaz. Medya Kütüphanesi'nden dosya durumlarını kontrol et; başarısız yüklemeyi tekrar başlatabilirsin.",
  },
  {
    q: "Doğrulama rozetim kaldırılabilir mi?",
    a: "Rozet yalnızca platform yönetimi tarafından, hak ihlali veya sahiplik sorunu tespit edilirse kaldırılır. Böyle bir durumda sana denetim kaydıyla birlikte bildirim yapılır.",
  },
  {
    q: "Ekip üyem yanlışlıkla gönderi silebilir mi?",
    a: "Hayır. Silme izni (delete_posts) ayrı bir yetkidir ve yalnızca sen verirsen etkinleşir. Silme işlemleri soft delete'tir ve kayıt altında tutulur.",
  },
  {
    q: "Takipçi listemi neden göremiyorum?",
    a: "Kullanıcı gizliliği gereği sanatçılara tekil takipçi verisi gösterilmez; yalnızca toplu sayılar ve analizler sunulur.",
  },
];

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ sanatci?: string }>;
}) {
  const { sanatci } = await searchParams;
  const ctx = await getStudioContext(sanatci);

  return (
    <StudioShell
      artist={ctx.artist}
      managedArtists={ctx.managedArtists}
      activePath="/destek"
      title="Destek"
      subtitle="Sık sorulanlar ve iletişim"
    >
      <div style={{ display: "grid", gap: "var(--space-4)", maxWidth: 760 }}>
        {FAQ.map((item) => (
          <details key={item.q} className={styles.panel}>
            <summary style={{ fontWeight: 700, cursor: "pointer" }}>{item.q}</summary>
            <p style={{ marginTop: "var(--space-3)", color: "var(--color-text-secondary)", lineHeight: 1.7, fontSize: "var(--font-sm)" }}>
              {item.a}
            </p>
          </details>
        ))}
        <div className={styles.panel}>
          <h3 style={{ marginBottom: "var(--space-2)" }}>Hâlâ yardım mı lazım?</h3>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-sm)" }}>
            Sanatçı destek hattı: <strong>destek@raplab.example</strong> — mesajına profil
            adresini (/sanatci/{ctx.artist.slug}) eklemeyi unutma.
          </p>
        </div>
      </div>
    </StudioShell>
  );
}
