/**
 * Bildirim servisi — Şartname 24
 * Her beğeni için ayrı bildirim gönderilmez; sanatçı panelinde gruplanır.
 */

import { demoState } from "@/lib/database/demo-store";
import { createSupabaseServerClient } from "@/lib/database/supabase-server";
import { isDemoMode } from "@/lib/env";
import type { Notification, SessionUser } from "@/types";

export async function listNotifications(viewer: SessionUser): Promise<Notification[]> {
  if (isDemoMode()) {
    return demoState()
      .notifications.filter((n) => n.recipient_user_id === viewer.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_user_id", viewer.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as Notification[];
}

export async function unreadCount(viewer: SessionUser): Promise<number> {
  if (isDemoMode()) {
    return demoState().notifications.filter(
      (n) => n.recipient_user_id === viewer.id && !n.is_read
    ).length;
  }
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", viewer.id)
    .eq("is_read", false);
  return count ?? 0;
}

export async function markAllRead(viewer: SessionUser): Promise<void> {
  const nowIso = new Date().toISOString();
  if (isDemoMode()) {
    for (const n of demoState().notifications) {
      if (n.recipient_user_id === viewer.id && !n.is_read) {
        n.is_read = true;
        n.read_at = nowIso;
      }
    }
    return;
  }
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: nowIso })
    .eq("recipient_user_id", viewer.id)
    .eq("is_read", false);
}
