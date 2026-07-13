/**
 * Unit testler — Şartname 29.1:
 * kullanıcı adı doğrulama, slug üretimi, gönderi karakter sınırı,
 * dosya türü kontrolü, tarih/link yardımcıları
 */

import { describe, expect, it } from "vitest";
import {
  AUDIO_TEASER_MAX_SECONDS,
  containsHtml,
  createPostSchema,
  extractSafeLinks,
  mediaKindForMime,
  mediaStoragePath,
  normalizeHashtags,
  POST_BODY_MAX,
  RESERVED_USERNAMES,
  slugify,
  validateMediaFile,
  validateUsername,
  VIDEO_MAX_SECONDS,
} from "@/lib/validation";

describe("Sanatsal hashtag normalizasyonu", () => {
  it("işaretleri temizler, Türkçe etiketleri korur ve tekrarları kaldırır", () => {
    expect(normalizeHashtags("#DijitalÇizim #dijitalçizim, #SemaK geçersiz-etiket"))
      .toEqual(["dijitalçizim", "semak"]);
  });
});

describe("kullanıcı adı doğrulama (11.2)", () => {
  it("geçerli adları kabul eder", () => {
    expect(validateUsername("deniz.06").valid).toBe(true);
    expect(validateUsername("rap_sever").valid).toBe(true);
    expect(validateUsername("abc").valid).toBe(true);
    expect(validateUsername("a".repeat(24)).valid).toBe(true);
  });

  it("3 karakterden kısa ve 24'ten uzun adları reddeder", () => {
    expect(validateUsername("ab").valid).toBe(false);
    expect(validateUsername("a".repeat(25)).valid).toBe(false);
  });

  it("büyük harf, boşluk ve Türkçe karakterleri reddeder", () => {
    expect(validateUsername("Deniz").valid).toBe(false);
    expect(validateUsername("deniz 06").valid).toBe(false);
    expect(validateUsername("dençiz").valid).toBe(false);
  });

  it("rezerve isimleri reddeder", () => {
    for (const name of ["admin", "raplab", "support", "moderator"]) {
      expect(validateUsername(name).valid).toBe(false);
      expect(RESERVED_USERNAMES).toContain(name);
    }
  });
});

describe("slug üretimi", () => {
  it("Türkçe karakterleri dönüştürür", () => {
    expect(slugify("Gölge 06")).toBe("golge-06");
    expect(slugify("Beton Çiçeği")).toBe("beton-cicegi");
    expect(slugify("ŞİİR & IŞIK")).toBe("siir-isik");
  });

  it("özel karakterleri temizler ve 100 karakterle sınırlar", () => {
    expect(slugify("a!!!b???c")).toBe("a-b-c");
    expect(slugify("x".repeat(200)).length).toBeLessThanOrEqual(100);
  });
});

describe("gönderi doğrulama (8.1)", () => {
  it("800 karakter sınırını uygular", () => {
    const ok = createPostSchema.safeParse({ post_type: "text", body: "a".repeat(POST_BODY_MAX) });
    expect(ok.success).toBe(true);
    const fail = createPostSchema.safeParse({ post_type: "text", body: "a".repeat(POST_BODY_MAX + 1) });
    expect(fail.success).toBe(false);
  });

  it("HTML içeriğini reddeder (26.1)", () => {
    expect(containsHtml("<script>alert(1)</script>")).toBe(true);
    expect(containsHtml("normal metin <b>kalın</b>")).toBe(true);
    expect(containsHtml("2 < 3 ve 5 > 4")).toBe(false);
    const res = createPostSchema.safeParse({ post_type: "text", body: "<img src=x>" });
    expect(res.success).toBe(false);
  });

  it("boş metin gönderisini reddeder", () => {
    const res = createPostSchema.safeParse({ post_type: "text", body: "   " });
    expect(res.success).toBe(false);
  });

  it("zamanlanmış gönderide tarih ister", () => {
    const res = createPostSchema.safeParse({
      post_type: "text",
      body: "selam",
      publish_mode: "schedule",
    });
    expect(res.success).toBe(false);
  });

  it("geri sayımda bitiş tarihi ister", () => {
    const res = createPostSchema.safeParse({ post_type: "countdown", title: "x", body: "y" });
    expect(res.success).toBe(false);
    const ok = createPostSchema.safeParse({
      post_type: "countdown",
      title: "x",
      body: "y",
      meta: { countdown_ends_at: new Date().toISOString() },
    });
    expect(ok.success).toBe(true);
  });
});

describe("medya doğrulama (21)", () => {
  it("MIME türlerini sınıflandırır", () => {
    expect(mediaKindForMime("image/webp")).toBe("image");
    expect(mediaKindForMime("video/mp4")).toBe("video");
    expect(mediaKindForMime("audio/wav")).toBe("audio");
    expect(mediaKindForMime("application/pdf")).toBeNull();
  });

  it("boyut ve süre sınırlarını uygular", () => {
    expect(
      validateMediaFile({ mime_type: "image/jpeg", file_size_bytes: 13 * 1024 * 1024 }).valid
    ).toBe(false);
    expect(
      validateMediaFile({ mime_type: "image/jpeg", file_size_bytes: 1024, width: 9000 }).valid
    ).toBe(false);
    expect(
      validateMediaFile({
        mime_type: "video/mp4",
        file_size_bytes: 1024,
        duration_seconds: VIDEO_MAX_SECONDS + 1,
      }).valid
    ).toBe(false);
    expect(
      validateMediaFile({
        mime_type: "audio/mpeg",
        file_size_bytes: 1024,
        duration_seconds: AUDIO_TEASER_MAX_SECONDS + 1,
      }).valid
    ).toBe(false);
    expect(
      validateMediaFile({ mime_type: "audio/mpeg", file_size_bytes: 1024, duration_seconds: 45 }).valid
    ).toBe(true);
  });

  it("21.4 dosya yolu şablonunu üretir", () => {
    expect(mediaStoragePath("a1", "p1", "m1", "webp")).toBe("artists/a1/posts/p1/m1.webp");
    expect(mediaStoragePath("a1", "p1", "m1", ".mp4")).toBe("artists/a1/posts/p1/m1.mp4");
  });
});

describe("güvenli bağlantı algılama", () => {
  it("http(s) bağlantılarını çıkarır", () => {
    expect(extractSafeLinks("bak: https://ornek.dev ve http://test.dev")).toHaveLength(2);
    expect(extractSafeLinks("javascript:alert(1)")).toHaveLength(0);
  });
});
