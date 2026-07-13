/**
 * Integration testler — Şartname 29.2 (demo veri katmanı üzerinde):
 * beğeni ekleme/kaldırma, takip oluşturma/kaldırma, gönderi oluşturma,
 * sanatçı onayı, zamanlanmış gönderi, durum makinesi
 */

import { beforeEach, describe, expect, it } from "vitest";
import { addLike, removeLike } from "@/features/likes/service";
import { followArtist, unfollowArtist } from "@/features/follows/service";
import { canTransition, createPost, updatePostStatus } from "@/features/posts/service";
import { approveApplication, updateFeatureFlag } from "@/features/moderation/service";
import { createApplication } from "@/features/applications/service";
import { addFanArtLike, listFanArt, reviewFanVerification } from "@/features/fan-art/service";
import { demoState, resetDemoState } from "@/lib/database/demo-store";
import { ApiError } from "@/lib/errors";
import type { SessionUser } from "@/types";

function sessionFor(id: string): SessionUser {
  const profile = demoState().profiles.find((p) => p.id === id)!;
  return { id, email: `${profile.username}@demo.raplab.local`, profile };
}

beforeEach(() => {
  resetDemoState();
});

describe("beğeni sistemi (9, 22.4, 28)", () => {
  it("beğeni ekler ve sayacı artırır", async () => {
    const user = sessionFor("u-demo-user");
    const before = demoState().posts.find((p) => p.id === "p-nf-text")!.like_count;
    const res = await addLike("p-nf-text", user);
    expect(res.liked).toBe(true);
    expect(res.like_count).toBe(before + 1);
  });

  it("aynı gönderi iki kez beğenilemez (Kural 8)", async () => {
    const user = sessionFor("u-demo-user");
    await addLike("p-nf-text", user);
    await expect(addLike("p-nf-text", user)).rejects.toMatchObject({ code: "DUPLICATE_LIKE" });
  });

  it("beğeni kaldırma sayacı azaltır ve idempotenttir", async () => {
    const user = sessionFor("u-demo-user");
    await addLike("p-nf-text", user);
    const r1 = await removeLike("p-nf-text", user);
    expect(r1.liked).toBe(false);
    const r2 = await removeLike("p-nf-text", user);
    expect(r2.like_count).toBe(r1.like_count);
  });

  it("taslak gönderi beğenilemez (9.1)", async () => {
    const user = sessionFor("u-demo-user");
    await expect(addLike("p-rv-draft", user)).rejects.toMatchObject({ code: "POST_NOT_PUBLISHED" });
  });
});

describe("takip sistemi (10, 22.5)", () => {
  it("takip oluşturur ve tekrarını engeller", async () => {
    const user = sessionFor("u-demo-user");
    const res = await followArtist("a-karga", user);
    expect(res.following).toBe(true);
    await expect(followArtist("a-karga", user)).rejects.toMatchObject({ code: "DUPLICATE_FOLLOW" });
  });

  it("takibi bırakır", async () => {
    const user = sessionFor("u-demo-user");
    const res = await unfollowArtist("a-rayvold", user);
    expect(res.following).toBe(false);
  });

  it("askıya alınmış sanatçı takip edilemez (10.1)", async () => {
    const s = demoState();
    const artist = s.artists.find((a) => a.id === "a-karga")!;
    artist.profile_status = "suspended";
    const user = sessionFor("u-demo-user");
    await expect(followArtist("a-karga", user)).rejects.toBeInstanceOf(ApiError);
  });
});

describe("gönderi oluşturma (Kural 1, 9–11; 13.4)", () => {
  it("normal kullanıcı gönderi oluşturamaz", async () => {
    const user = sessionFor("u-demo-user");
    await expect(
      createPost("a-rayvold", basePost(), user)
    ).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("sanatçı sahibi kendi profilinde paylaşır", async () => {
    const artist = sessionFor("u-demo-artist");
    const post = await createPost("a-rayvold", basePost(), artist);
    expect(post.status).toBe("published");
    expect(post.published_at).toBeTruthy();
  });

  it("zamanlanmış gönderi scheduled durumunda oluşur", async () => {
    const artist = sessionFor("u-demo-artist");
    const post = await createPost(
      "a-rayvold",
      { ...basePost(), publish_mode: "schedule", scheduled_at: new Date(Date.now() + 86400000).toISOString() },
      artist
    );
    expect(post.status).toBe("scheduled");
    expect(post.published_at).toBeNull();
  });

  it("özellik bayrağı kapalıyken ses gönderisi engellenir (14.7)", async () => {
    const admin = sessionFor("u-demo-admin");
    await updateFeatureFlag("audio_teasers_enabled", false, admin);
    const artist = sessionFor("u-demo-artist");
    await expect(
      createPost("a-rayvold", { ...basePost(), post_type: "audio_teaser" }, artist)
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});

describe("gönderi durum makinesi (8.2)", () => {
  it("geçiş tablosunu uygular", () => {
    expect(canTransition("draft", "uploading")).toBe(true);
    expect(canTransition("published", "hidden")).toBe(true);
    expect(canTransition("hidden", "published")).toBe(true);
    expect(canTransition("draft", "published")).toBe(false);
    expect(canTransition("deleted", "published")).toBe(false);
    expect(canTransition("failed", "published")).toBe(false);
  });

  it("silme soft delete uygular", async () => {
    const artist = sessionFor("u-demo-artist");
    const post = await updatePostStatus("p-rv-studio", "deleted", artist);
    expect(post.status).toBe("deleted");
    expect(post.deleted_at).toBeTruthy();
    // Kayıt hâlâ depoda (soft delete)
    expect(demoState().posts.some((p) => p.id === "p-rv-studio")).toBe(true);
  });

  it("geçersiz geçiş reddedilir", async () => {
    const artist = sessionFor("u-demo-artist");
    await expect(updatePostStatus("p-rv-draft", "published", artist)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
    });
  });
});

describe("sanatçı başvurusu ve onayı (12)", () => {
  it("başvuru → yönetici onayı → sanatçı + ekip + rol + audit + bildirim", async () => {
    const applicant = sessionFor("u-demo-user");
    const app = await createApplication(
      {
        stage_name: "Test Mikrofon",
        legal_name: "Kurgusal Kişi",
        contact_email: "test@raplab.local",
        artist_description: "Yeterince uzun kurgusal bir sanatçı açıklaması.",
        official_social_links: [],
        distribution_links: [],
        applicant_relationship: "artist",
        rights_declaration: true,
      },
      applicant
    );
    expect(app.status).toBe("submitted");

    const admin = sessionFor("u-demo-admin");
    const result = await approveApplication(app.id, admin);
    expect(result.slug).toBe("test-mikrofon");

    const s = demoState();
    expect(s.artists.some((a) => a.id === result.artistId && a.verification_status === "approved")).toBe(true);
    expect(s.members.some((m) => m.artist_id === result.artistId && m.member_role === "owner")).toBe(true);
    expect(s.profiles.find((p) => p.id === "u-demo-user")!.role).toBe("artist");
    expect(s.auditLogs.some((l) => l.action === "artist_application.approved" && l.target_id === app.id)).toBe(true);
    expect(s.notifications.some((n) => n.recipient_user_id === "u-demo-user" && n.notification_type === "artist_application_update")).toBe(true);
  });

  it("moderatör başvuruyu onaylayamaz (4.6)", async () => {
    const mod = sessionFor("u-demo-mod");
    await expect(approveApplication("app-1", mod)).rejects.toMatchObject({ code: "PERMISSION_DENIED" });
  });

  it("aynı başvuru tekrar onaylandığında ikinci sanatçı oluşturmaz", async () => {
    const admin = sessionFor("u-demo-admin");
    const before = demoState().artists.length;
    const first = await approveApplication("app-1", admin);
    const second = await approveApplication("app-1", admin);
    expect(second).toEqual(first);
    expect(demoState().artists).toHaveLength(before + 1);
  });

  it("hak beyanı olmadan başvuru reddedilir", async () => {
    const applicant = sessionFor("u-demo-user");
    await expect(
      createApplication(
        {
          stage_name: "X",
          legal_name: "Y",
          contact_email: "x@raplab.local",
          artist_description: "Yeterince uzun kurgusal açıklama metni.",
          official_social_links: [],
          distribution_links: [],
          applicant_relationship: "artist",
          rights_declaration: false,
        },
        applicant
      )
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
  });
});

describe("Sanatsal fan akışı", () => {
  it("yayındaki çalışmaları güvenli fan ve sanatçı DTO'suyla listeler", async () => {
    const items = await listFanArt("u-demo-user");
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].fan.username).toBeTruthy();
    expect(items[0].artist.slug).toBeTruthy();
  });

  it("fan çalışması beğenisini tekil tutar", async () => {
    const user = sessionFor("u-demo-user");
    const result = await addFanArtLike("fa-rayvold-night", user);
    expect(result.liked).toBe(true);
    await expect(addFanArtLike("fa-rayvold-night", user)).rejects.toMatchObject({ code: "DUPLICATE_LIKE" });
  });

  it("fan kararını yalnızca yönetici verir ve audit yazar", async () => {
    const state = demoState();
    state.fanVerifications[0].status = "pending";
    await expect(reviewFanVerification("fv-demo-user", "approved", "", sessionFor("u-demo-mod")))
      .rejects.toMatchObject({ code: "PERMISSION_DENIED" });
    await reviewFanVerification("fv-demo-user", "approved", "", sessionFor("u-demo-admin"));
    expect(state.fanVerifications[0].status).toBe("approved");
    expect(state.auditLogs.some((log) => log.action === "fan_verification.approved")).toBe(true);
  });
});

describe("özellik bayrakları (14.7)", () => {
  it("yalnızca süper yönetici değiştirebilir ve audit yazılır", async () => {
    const mod = sessionFor("u-demo-mod");
    await expect(updateFeatureFlag("maintenance_mode", true, mod)).rejects.toMatchObject({
      code: "PERMISSION_DENIED",
    });

    const admin = sessionFor("u-demo-admin");
    const flags = await updateFeatureFlag("maintenance_mode", true, admin);
    expect(flags.maintenance_mode).toBe(true);
    expect(
      demoState().auditLogs.some((l) => l.action === "feature_flag.updated")
    ).toBe(true);
  });
});

function basePost() {
  return {
    post_type: "text" as const,
    title: null,
    body: "Kurgusal test gönderisi.",
    visibility: "public" as const,
    is_pinned: false,
    publish_mode: "now" as const,
    scheduled_at: null,
    allow_external_share: true,
    notify_followers: true,
    media_items: [],
    meta: null,
  };
}
