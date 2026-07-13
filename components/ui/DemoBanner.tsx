import styles from "./ui.module.css";

/**
 * Demo modu bandı — Şartname 37: hiçbir özellik "çalışıyor gibi" gösterilmez.
 * Supabase yapılandırması olmadan uygulama kurgusal verilerle çalışır ve
 * bu durum kullanıcıya açıkça bildirilir.
 */
export function DemoBanner() {
  return (
    <div className={styles.demoBanner} role="status">
      <strong>DEMO MODU</strong> — Kurgusal verilerle çalışıyorsun. Gerçek kayıt, giriş ve medya
      yükleme için <code>.env.local</code> dosyasında Supabase anahtarlarını tanımla.
    </div>
  );
}
