/**
 * Unit testler — 11.3 ilk giriş akışı:
 * OAuth callback yalnızca eksik profilleri onboarding'e göndermeli.
 */

import { describe, expect, it } from "vitest";
import { isProfileComplete } from "@/lib/auth/profile-completion";

describe("profil tamamlama kontrolü (11.3)", () => {
  it("geçici Google kullanıcı adını eksik profil sayar", () => {
    expect(isProfileComplete({ username: "uye_1234abcd", display_name: "Yeni Üye" })).toBe(false);
  });

  it("kullanıcı adı ve görünen adı belirlenmiş profili tamamlanmış sayar", () => {
    expect(isProfileComplete({ username: "r0yc0ld", display_name: "ROYCOLD" })).toBe(true);
  });

  it("boş görünen adı eksik profil sayar", () => {
    expect(isProfileComplete({ username: "r0yc0ld", display_name: " " })).toBe(false);
  });
});
