/** Özellik Bayrakları — Şartname 14.7: değişiklikler audit log'a yazılır */

import type { Metadata } from "next";
import { getFeatureFlags } from "@/features/moderation/service";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import { FlagToggles } from "./FlagToggles";

export const metadata: Metadata = { title: "Özellik Bayrakları — Control Center", robots: { index: false } };

export default async function FlagsPage() {
  const user = await requireCC();
  const flags = await getFeatureFlags();
  const canEdit = user.profile.role === "super_admin";

  return (
    <CCShell
      activeHref="/control-center/ozellik-bayraklari"
      title="Özellik Bayrakları"
      subtitle={
        canEdit
          ? "Platform özelliklerini aç/kapat — her değişiklik audit log'a yazılır"
          : "Bayrakları yalnızca süper yönetici değiştirebilir; sen görüntüleyebilirsin"
      }
    >
      <FlagToggles flags={flags} canEdit={canEdit} />
    </CCShell>
  );
}
