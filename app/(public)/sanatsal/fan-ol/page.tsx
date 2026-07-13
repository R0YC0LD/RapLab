import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listActiveArtists } from "@/features/artists/service";
import { getMyFanVerification } from "@/features/fan-art/service";
import { getSessionUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { StatusChip } from "@/components/ui/Badge";
import { FanVerificationForm } from "./FanVerificationForm";
import styles from "../sanatsal.module.css";

export const metadata: Metadata = { title: "Fan Doğrulaması - Sanatsal" };

export default async function FanVerificationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris?geri=/sanatsal/fan-ol");
  const [verification, artists] = await Promise.all([getMyFanVerification(user.id), listActiveArtists(user.id)]);
  return (
    <div className="container page-enter">
      <header className={styles.header}>
        <div><h1 className="type-display" style={{ fontSize: "var(--font-2xl)", marginBottom: 10 }}>Fan Doğrulaması</h1><p className={styles.intro}>Özgün üretimi koruyan tek seferlik başvuru. Gerçek ad veya kimlik belgesi istemiyoruz; bir örnek çalışma ve kendi sesinle sahiplik beyanı yeterli.</p></div>
      </header>
      {verification?.status === "approved" ? (
        <div className={styles.form}><StatusChip tone="success">Fan hesabın onaylı</StatusChip><p>Sanatsal alanında özgün çalışmalarını paylaşabilirsin.</p><Link className={`${styles.action} ${styles.primaryAction}`} href="/sanatsal/paylas">Eser paylaş</Link></div>
      ) : verification?.status === "pending" ? (
        <div className={styles.form}><StatusChip tone="info">İnceleniyor</StatusChip><p>Örnek çalışma ve sesli beyanın moderasyon sırasına alındı. Karar hesabına bildirim olarak gelecek.</p></div>
      ) : (
        <>
          {verification?.status === "rejected" && <div className={styles.form} style={{ marginBottom: 0 }}><StatusChip tone="warning">Yeniden başvuru gerekli</StatusChip><p>{verification.review_note || "Başvurundaki bilgiler doğrulanamadı."}</p></div>}
          <FanVerificationForm artists={artists.map((artist) => ({ id: artist.id, stage_name: artist.stage_name }))} demoMode={isDemoMode()} />
        </>
      )}
    </div>
  );
}
