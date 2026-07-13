import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listActiveArtists } from "@/features/artists/service";
import { getMyFanVerification } from "@/features/fan-art/service";
import { getSessionUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/env";
import { FanArtComposer } from "./FanArtComposer";
import styles from "../sanatsal.module.css";

export const metadata: Metadata = { title: "Eser Paylaş - Sanatsal" };

export default async function FanArtSharePage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris?geri=/sanatsal/paylas");
  const verification = await getMyFanVerification(user.id);
  if (verification?.status !== "approved") redirect("/sanatsal/fan-ol");
  const artists = await listActiveArtists(user.id);
  return <div className="container page-enter"><header className={styles.header}><div><h1 className="type-display" style={{ fontSize: "var(--font-2xl)", marginBottom: 10 }}>Eser Paylaş</h1><p className={styles.intro}>Çiziminin gerçek sahibini seç, çalışmanı temiz ve yüksek çözünürlükte yükle.</p></div></header><FanArtComposer artists={artists.map(({ id, stage_name, slug }) => ({ id, stage_name, slug }))} demoMode={isDemoMode()} /></div>;
}
