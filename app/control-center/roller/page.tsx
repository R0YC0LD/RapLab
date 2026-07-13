/** Roller ve Yetkiler — Şartname 5 yetki matrisi birebir */

import type { Metadata } from "next";
import { PERMISSION_MATRIX, type MatrixAction } from "@/lib/permissions";
import { CCShell } from "@/components/admin/CCShell";
import { requireCC } from "../helpers";
import styles from "../cc.module.css";

export const metadata: Metadata = { title: "Roller — Control Center", robots: { index: false } };

const ACTION_LABEL: Record<MatrixAction, string> = {
  view_public_profiles: "Açık profilleri görme",
  like_post: "Gönderi beğenme",
  follow_artist: "Sanatçı takip etme",
  create_post: "Gönderi oluşturma",
  edit_post: "Gönderi düzenleme",
  hide_post: "Gönderi gizleme",
  design_profile: "Profil tasarımı",
  view_analytics: "Analizleri görme",
  verify_artist: "Sanatçı doğrulama",
  suspend_user: "Kullanıcı askıya alma",
  create_admin: "Yönetici oluşturma",
  system_settings: "Sistem ayarları",
  view_audit_log: "Audit log görüntüleme",
  delete_audit_log: "Audit log silme",
};

const VALUE_LABEL: Record<string, string> = {
  yes: "Evet",
  no: "Hayır",
  own: "Kendi",
  delegated: "İzne bağlı",
  limited: "Sınırlı",
  review: "İnceleme",
  temporary: "Geçici",
  as_needed: "Gerektiğinde",
};

const COLUMNS = [
  { key: "visitor", label: "Ziyaretçi" },
  { key: "user", label: "Kullanıcı" },
  { key: "artist", label: "Sanatçı" },
  { key: "team", label: "Ekip" },
  { key: "moderator", label: "Moderatör" },
  { key: "admin", label: "Yönetici" },
  { key: "super_admin", label: "Süper Yönetici" },
] as const;

export default async function RolesPage() {
  await requireCC();

  return (
    <CCShell
      activeHref="/control-center/roller"
      title="Roller ve Yetkiler"
      subtitle="Şartname 5. bölümdeki yetki matrisi — kod tabanındaki tek doğruluk kaynağından üretilir"
    >
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">İşlem</th>
              {COLUMNS.map((c) => (
                <th key={c.key} scope="col">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(Object.keys(PERMISSION_MATRIX) as MatrixAction[]).map((action) => (
              <tr key={action}>
                <td style={{ fontWeight: 600 }}>{ACTION_LABEL[action]}</td>
                {COLUMNS.map((c) => {
                  const value = PERMISSION_MATRIX[action][c.key];
                  return (
                    <td
                      key={c.key}
                      style={{
                        color:
                          value === "no"
                            ? "var(--color-text-muted)"
                            : value === "yes"
                              ? "var(--color-success)"
                              : "var(--color-warning)",
                      }}
                    >
                      {VALUE_LABEL[value]}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ marginTop: "var(--space-5)", fontSize: "var(--font-xs)", color: "var(--color-text-muted)" }}>
        Bu matris arayüz kararları içindir; asıl güvenlik veritabanı RLS politikalarıyla uygulanır
        (Değişmez Kural 20). Audit log silme yetkisi hiçbir rolde yoktur.
      </p>
    </CCShell>
  );
}
