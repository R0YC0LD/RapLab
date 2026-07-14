import type { Metadata } from "next";
import Link from "next/link";
import { listFanArt, getMyFanVerification } from "@/features/fan-art/service";
import { getSessionUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/EmptyState";
import { FanArtCard } from "./FanArtCard";
import styles from "./sanatsal.module.css";

export const metadata: Metadata = { title: "Sanatsal", description: "RapLab TR fanlarının özgün çizim ve grafik tasarım galerisi." };

export default async function FanArtPage() {
  const user = await getSessionUser();
  const [items, verification] = await Promise.all([
    listFanArt(user?.id ?? null),
    user ? getMyFanVerification(user.id) : null,
  ]);
  const shareHref = verification?.status === "approved" ? "/sanatsal/paylas" : "/sanatsal/fan-ol";
  return (
    <div className="container page-enter">
      <header className={styles.header}>
        <div>
          <h1 className="type-display" style={{ fontSize: "var(--font-3xl)", marginBottom: "var(--space-3)" }}>Sanatsal</h1>
          <p className={styles.intro}>Fanların kendi elleriyle ürettiği çizimler ve grafik çalışmalar. Her paylaşım doğrulanmış bir fan hesabından gelir; burada yorum yok, eser ve beğeni var.</p>
        </div>
        <div className={styles.actions}>
          <Link className={`${styles.action} ${styles.primaryAction}`} href={shareHref}>{verification?.status === "approved" ? "Eser paylaş" : "Fan ol ve paylaş"}</Link>
          {verification?.status === "pending" && <Link className={styles.action} href="/sanatsal/fan-ol">Başvuru inceleniyor</Link>}
        </div>
      </header>
      {items.length ? <div className={styles.grid}>{items.map((item) => <FanArtCard key={item.id} item={item} isAuthenticated={Boolean(user)} />)}</div> : <div style={{ padding: "var(--space-8) 0" }}><EmptyState title="Henüz Sanatsal paylaşım yok" description="İlk özgün çalışmayı paylaşan fan sen olabilirsin." /></div>}
    </div>
  );
}
