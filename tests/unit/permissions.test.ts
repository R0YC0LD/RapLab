/**
 * Unit testler — Şartname 29.1: rol kontrolü, izin kontrolü
 * ve 5. bölüm yetki matrisinin birebir doğrulanması
 */

import { describe, expect, it } from "vitest";
import {
  canApproveArtistApplication,
  canCreateAdmin,
  canCreatePostForArtist,
  canAccessControlCenter,
  DEFAULT_ROLE_PERMISSIONS,
  matrixAllows,
  memberHasPermission,
  PERMISSION_MATRIX,
  roleAtLeast,
} from "@/lib/permissions";
import type { ArtistMember } from "@/types";

const member = (over: Partial<ArtistMember>): ArtistMember => ({
  id: "m1",
  artist_id: "a1",
  user_id: "u1",
  member_role: "content_manager",
  permissions: ["manage_posts", "publish_posts"],
  status: "active",
  invited_by: "u0",
  accepted_at: null,
  created_at: "",
  updated_at: "",
  ...over,
});

describe("rol sıralaması", () => {
  it("rol hiyerarşisini doğru karşılaştırır", () => {
    expect(roleAtLeast("super_admin", "admin")).toBe(true);
    expect(roleAtLeast("moderator", "admin")).toBe(false);
    expect(roleAtLeast("user", "user")).toBe(true);
  });
});

describe("yetki matrisi (Şartname 5) birebir", () => {
  it("ziyaretçi yalnızca açık profilleri görebilir", () => {
    expect(matrixAllows("view_public_profiles", "visitor")).toBe(true);
    expect(matrixAllows("like_post", "visitor")).toBe(false);
    expect(matrixAllows("follow_artist", "visitor")).toBe(false);
  });

  it("normal kullanıcı gönderi oluşturamaz (Değişmez Kural 1)", () => {
    expect(PERMISSION_MATRIX.create_post.user).toBe("no");
    expect(PERMISSION_MATRIX.edit_post.user).toBe("no");
  });

  it("yönetici oluşturma yalnızca süper yönetici", () => {
    expect(PERMISSION_MATRIX.create_admin.admin).toBe("no");
    expect(PERMISSION_MATRIX.create_admin.super_admin).toBe("yes");
    expect(canCreateAdmin("admin")).toBe(false);
    expect(canCreateAdmin("super_admin")).toBe(true);
  });

  it("audit log HİÇBİR rol tarafından silinemez", () => {
    for (const role of ["visitor", "user", "artist", "team", "moderator", "admin", "super_admin"] as const) {
      expect(PERMISSION_MATRIX.delete_audit_log[role]).toBe("no");
    }
  });

  it("moderatör doğrulamayı yalnızca inceler, onaylayamaz (4.6)", () => {
    expect(PERMISSION_MATRIX.verify_artist.moderator).toBe("review");
    expect(canApproveArtistApplication("moderator")).toBe(false);
    expect(canApproveArtistApplication("admin")).toBe(true);
  });
});

describe("ekip izinleri (13.8)", () => {
  it("aktif olmayan üyelik izin vermez", () => {
    expect(memberHasPermission(member({ status: "invited" }), "manage_posts")).toBe(false);
    expect(memberHasPermission(member({ status: "revoked" }), "manage_posts")).toBe(false);
    expect(memberHasPermission(null, "manage_posts")).toBe(false);
  });

  it("sahip her izne sahiptir", () => {
    expect(memberHasPermission(member({ member_role: "owner", permissions: [] }), "manage_team")).toBe(true);
  });

  it("izin listesi dışındaki işlem reddedilir", () => {
    expect(memberHasPermission(member({}), "delete_posts")).toBe(false);
    expect(memberHasPermission(member({}), "publish_posts")).toBe(true);
  });

  it("analiz görüntüleyici yalnızca analiz görür", () => {
    expect(DEFAULT_ROLE_PERMISSIONS.analytics_viewer).toEqual(["view_analytics"]);
  });
});

describe("gönderi oluşturma kuralları (Kural 9–11)", () => {
  it("doğrulanmamış sanatçı profili için paylaşım engellenir", () => {
    expect(
      canCreatePostForArtist({
        role: "artist",
        membership: member({ member_role: "owner" }),
        artistVerified: false,
      })
    ).toBe(false);
  });

  it("üyeliği olmayan sanatçı başka profilde paylaşamaz", () => {
    expect(canCreatePostForArtist({ role: "artist", membership: null, artistVerified: true })).toBe(false);
  });

  it("yetkili ekip üyesi paylaşabilir", () => {
    expect(
      canCreatePostForArtist({ role: "user", membership: member({}), artistVerified: true })
    ).toBe(true);
  });
});

describe("panel erişimi", () => {
  it("control center moderatör ve üstüne açık", () => {
    expect(canAccessControlCenter("user")).toBe(false);
    expect(canAccessControlCenter("artist")).toBe(false);
    expect(canAccessControlCenter("moderator")).toBe(true);
    expect(canAccessControlCenter("super_admin")).toBe(true);
  });
});
