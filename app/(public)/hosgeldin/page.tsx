/** İlk giriş akışı — Şartname 11.3: kullanıcı adı, koşullar, ilgi duyulan sanatçılar */

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { listActiveArtists } from "@/features/artists/service";
import { isProfileComplete } from "@/lib/auth/profile-completion";
import { getSessionUser } from "@/lib/auth/session";
import ui from "@/components/ui/ui.module.css";
import { OnboardingClient } from "./OnboardingClient";

export const metadata: Metadata = { title: "Hoş Geldin" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  if (isProfileComplete(user.profile)) redirect("/");

  const artists = await listActiveArtists(user.id);

  return (
    <div className="container page-enter" style={{ padding: "var(--space-12) var(--space-6)", maxWidth: 680 }}>
      <h1 className={ui.sectionTitle}>
        Hoş geldin <span>hesabını tamamla</span>
      </h1>
      <OnboardingClient
        initialUsername={user.profile.username}
        initialDisplayName={user.profile.display_name}
        artists={artists.map((a) => ({
          id: a.id,
          stage_name: a.stage_name,
          slug: a.slug,
          profile_image_path: a.profile_image_path,
          followed: a.followed_by_me,
        }))}
      />
    </div>
  );
}
