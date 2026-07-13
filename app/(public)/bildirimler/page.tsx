/** Bildirimler — Şartname 24 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listNotifications, markAllRead } from "@/features/notifications/service";
import { getSessionUser } from "@/lib/auth/session";
import { EmptyState } from "@/components/ui/EmptyState";
import ui from "@/components/ui/ui.module.css";

export const metadata: Metadata = { title: "Bildirimler" };

const TYPE_ICONS: Record<string, string> = {
  artist_new_post: "📢",
  artist_new_announcement: "📣",
  artist_countdown_started: "⏳",
  artist_application_update: "🎤",
  artist_team_invite: "👥",
  moderation_warning: "⚠️",
  system_announcement: "🛰️",
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
          {notifications.map((n) => (
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
              <span style={{ fontSize: 22 }} aria-hidden="true">
                {TYPE_ICONS[n.notification_type] ?? "🔔"}
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
          ))}
        </div>
      )}
    </div>
  );
}
