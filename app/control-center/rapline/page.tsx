/** RapLine yönetimi — Şartname 14.6: sıra değiştirme */

import type { Metadata } from "next";
import { demoState } from "@/lib/database/demo-store";
import { isDemoMode } from "@/lib/env";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import { RapLineOrderEditor } from "./RapLineOrderEditor";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "RapLine — Control Center", robots: { index: false } };

export default async function RapLineAdminPage() {
  await requireCC();
  const s = isDemoMode() ? demoState() : null;

  if (!s) {
    return (
      <CCShell activeHref="/control-center/rapline" title="RapLine" subtitle="Sıralama yönetimi">
        <p className={styles.panel} style={{ color: "var(--color-text-secondary)" }}>
          RapLine sırası Supabase modunda homepage_config üzerinden yönetilir.
        </p>
      </CCShell>
    );
  }

  const byId = new Map(s.artists.map((a) => [a.id, a]));
  const ordered = s.raplineOrder
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map((a) => ({ id: a!.id, stage_name: a!.stage_name }));

  return (
    <CCShell
      activeHref="/control-center/rapline"
      title="RapLine"
      subtitle="Ana sayfadaki sanatçı şeridinin sırasını belirle"
    >
      <RapLineOrderEditor initialOrder={ordered} />
    </CCShell>
  );
}
