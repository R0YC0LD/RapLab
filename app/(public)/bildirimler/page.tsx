/** Bildirimler — Şartname 24 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  Hourglass,
  Megaphone,
  Mic2,
  Radio,
  Satellite,
  TriangleAlert,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { listNotifications, markAllRead } from "@/features/notifications/service";
import { getSessionUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/EmptyState";
import ui from "@/components/ui/ui.module.css";

export const metadata: Metadata = { title: "Bildirimler" };

const TYPE_ICONS: Record<string, LucideIcon> = {
  artist_new_post: Radio,
  artist_new_announcement: Megaphone,
  artist_countdown_started: Hourglass,
  artist_application_update: Mic2,
  artist_team_invite: UsersRound,
  moderation_warning: TriangleAlert,
  system_announcement: Satellite,
};

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris?geri=/bildirimler");

  const notifications = await listNotifications(user);
  // Sayfa görüntülenince tümü okundu işaretlenir
  await markAllRead(user);

  return (
    <div className="container page-enter" style={{ padding: "var(--space-12) var(--space-6)", maxWidth: 720 }}>
      <h1 className={ui.sectionTitle}>
        Bildirimler <span>{notifications.length} kayıt</span>
      </h1>

      {notifications.length === 0 ? (
        <EmptyState
          title="Henüz bildirimin yok"
          description="Takip ettiğin sanatçılar paylaşım yaptığında burada göreceksin."
        />
      ) : (
        <div style={{ display: "grid", gap: "var(--space-3)" }}>
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.notification_type] ?? Bell;
            return (
              <Link
                key={n.id}
                href={n.action_url || "/"}
                style={{
                  display: "flex",
                  gap: "var(--space-4)",
                  padding: "var(--space-5)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border-soft)",
                  background: n.is_read ? "var(--color-bg-secondary)" : "var(--color-bg-elevated)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 38,
                    height: 38,
                    flex: "0 0 38px",
                    display: "grid",
                    placeItems: "center",
                    border: "1px solid var(--color-border-soft)",
                    borderRadius: "var(--radius-sm)",
                    color: n.is_read ? "var(--color-text-muted)" : "var(--artist-accent)",
                  }}
                >
                  <Icon size={19} strokeWidth={1.8} />
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: n.is_read ? 500 : 700 }}>{n.title}</p>
                  <p style={{ color: "var(--color-text-secondary)", fontSize: "var(--font-sm)" }}>{n.body}</p>
                  <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-xs)", marginTop: 4 }}>
                    {new Date(n.created_at).toLocaleString("tr-TR", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {!n.is_read && (
                  <span
                    aria-label="Okunmamış"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--artist-accent)",
                      marginTop: 8,
                      flexShrink: 0,
                    }}
                  />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
