/**
 * Doğrulama kuralları
 * Şartname 11.2 (kullanıcı adı), 8.1 (gönderi sınırları), 21 (medya sınırları)
 */

import { z } from "zod";

/* ---------- 11.2 Kullanıcı adı kuralları ---------- */

/** admin, support, raplab, moderator gibi sistem adları rezerve edilir */
export const RESERVED_USERNAMES = [
  "admin",
  "administrator",
  "support",
  "raplab",
  "moderator",
  "mod",
  "system",
  "root",
  "superadmin",
  "super_admin",
  "control-center",
  "controlcenter",
  "artist-studio",
  "artiststudio",
  "api",
  "help",
  "destek",
  "yonetici",
  "sanatci",
] as const;

/** 3–24 karakter; küçük harf, sayı, nokta ve alt çizgi; boşluk yok */
export const USERNAME_REGEX = /^[a-z0-9._]{3,24}$/;

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (username.length < 3 || username.length > 24) {
    return { valid: false, error: "Kullanıcı adı 3–24 karakter olmalı." };
  }
  if (/\s/.test(username)) {
    return { valid: false, error: "Kullanıcı adında boşluk bulunamaz." };
  }
  if (!USERNAME_REGEX.test(username)) {
    return {
      valid: false,
      error: "Yalnızca küçük harf, sayı, nokta ve alt çizgi kullanılabilir.",
    };
  }
  if ((RESERVED_USERNAMES as readonly string[]).includes(username)) {
    return { valid: false, error: "Bu kullanıcı adı sistem tarafından rezerve edilmiş." };
  }
  return { valid: true };
}

/* ---------- Slug üretimi ---------- */

const TURKISH_MAP: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i",
  ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
};

export function slugify(input: string): string {
  return input
    .split("")
    .map((ch) => TURKISH_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

/* ---------- 11.1 Kayıt şeması ---------- */

export const registrationSchema = z
  .object({
    email: z.string().email("Geçerli bir e-posta adresi gir."),
    password: z.string().min(8, "Parola en az 8 karakter olmalı."),
    password_confirmation: z.string(),
    username: z.string().refine((u) => validateUsername(u).valid, {
      message: "Kullanıcı adı kurallara uymuyor.",
    }),
    display_name: z.string().min(1, "Görünen ad gerekli.").max(60),
    terms_accepted: z.literal(true, {
      errorMap: () => ({ message: "Kullanım koşullarını kabul etmelisin." }),
    }),
    privacy_accepted: z.literal(true, {
      errorMap: () => ({ message: "Gizlilik politikasını kabul etmelisin." }),
    }),
    marketing_consent: z.boolean(),
  })
  .refine((d) => d.password === d.password_confirmation, {
    message: "Parolalar eşleşmiyor.",
    path: ["password_confirmation"],
  });

/* ---------- 8.1 Gönderi sınırları ---------- */

export const POST_BODY_MAX = 800;
export const POST_TITLE_MAX = 160;
export const GALLERY_MAX_IMAGES = 6;
export const VIDEO_MAX_SECONDS = 90;
export const AUDIO_TEASER_MAX_SECONDS = 60;

export const postTypeEnum = z.enum([
  "text",
  "image",
  "gallery",
  "video",
  "audio_teaser",
  "announcement",
  "countdown",
  "project",
]);

export const postVisibilityEnum = z.enum(["public", "followers", "unlisted"]);
export const publishModeEnum = z.enum(["now", "schedule", "draft"]);

/** HTML kabul edilmez — düz metin zorunlu (26.1) */
export function containsHtml(text: string): boolean {
  return /<[a-z/!][^>]*>/i.test(text);
}

/* 13.4 Gönderi ayarları */
export const createPostSchema = z
  .object({
    post_type: postTypeEnum,
    title: z.string().max(POST_TITLE_MAX, `Başlık en fazla ${POST_TITLE_MAX} karakter.`).optional().nullable(),
    body: z
      .string()
      .max(POST_BODY_MAX, `Gönderi metni en fazla ${POST_BODY_MAX} karakter.`)
      .refine((b) => !containsHtml(b), { message: "HTML içeriği kabul edilmez." })
      .optional()
      .nullable(),
    visibility: postVisibilityEnum.default("public"),
    is_pinned: z.boolean().default(false),
    publish_mode: publishModeEnum.default("now"),
    scheduled_at: z.string().datetime().optional().nullable(),
    allow_external_share: z.boolean().default(true),
    notify_followers: z.boolean().default(true),
    media_items: z.array(z.string().uuid()).max(GALLERY_MAX_IMAGES).default([]),
    meta: z
      .object({
        countdown_ends_at: z.string().datetime().optional(),
        event_date: z.string().optional(),
        event_location: z.string().max(200).optional(),
        event_url: z.string().url().optional(),
        status_label: z.string().max(40).optional(),
      })
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.post_type === "text" && !data.body?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["body"], message: "Metin gönderisi boş olamaz." });
    }
    if (data.publish_mode === "schedule" && !data.scheduled_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduled_at"],
        message: "Zamanlanmış gönderi için tarih seçmelisin.",
      });
    }
    if (data.post_type === "countdown" && !data.meta?.countdown_ends_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["meta"],
        message: "Geri sayım için bitiş tarihi gerekli.",
      });
    }
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;

/* ---------- 21. Medya sınırları ---------- */

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm"] as const;
export const AUDIO_MIME_TYPES = ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav"] as const;

export const IMAGE_MAX_BYTES = 12 * 1024 * 1024; // 12 MB
export const IMAGE_MAX_DIMENSION = 8000; // 8000×8000 piksel
export const VIDEO_MAX_BYTES = 120 * 1024 * 1024; // 120 MB

export type MediaKind = "image" | "video" | "audio";

export function mediaKindForMime(mime: string): MediaKind | null {
  if ((IMAGE_MIME_TYPES as readonly string[]).includes(mime)) return "image";
  if ((VIDEO_MIME_TYPES as readonly string[]).includes(mime)) return "video";
  if ((AUDIO_MIME_TYPES as readonly string[]).includes(mime)) return "audio";
  return null;
}

export function validateMediaFile(input: {
  mime_type: string;
  file_size_bytes: number;
  width?: number;
  height?: number;
  duration_seconds?: number;
}): { valid: boolean; error?: string } {
  const kind = mediaKindForMime(input.mime_type);
  if (!kind) return { valid: false, error: "Bu dosya türü desteklenmiyor." };

  if (kind === "image") {
    if (input.file_size_bytes > IMAGE_MAX_BYTES)
      return { valid: false, error: "Görsel en fazla 12 MB olabilir." };
    if (
      (input.width && input.width > IMAGE_MAX_DIMENSION) ||
      (input.height && input.height > IMAGE_MAX_DIMENSION)
    )
      return { valid: false, error: "Görsel en fazla 8000×8000 piksel olabilir." };
  }

  if (kind === "video") {
    if (input.file_size_bytes > VIDEO_MAX_BYTES)
      return { valid: false, error: "Video en fazla 120 MB olabilir." };
    if (input.duration_seconds && input.duration_seconds > VIDEO_MAX_SECONDS)
      return { valid: false, error: "Video en fazla 90 saniye olabilir." };
  }

  if (kind === "audio") {
    if (input.duration_seconds && input.duration_seconds > AUDIO_TEASER_MAX_SECONDS)
      return { valid: false, error: "Ses ön izlemesi en fazla 60 saniye olabilir." };
  }

  return { valid: true };
}

/* 21.4 Dosya yolu: artists/{artist_id}/posts/{post_id}/{media_id}.{extension} */
export function mediaStoragePath(artistId: string, postId: string, mediaId: string, ext: string): string {
  return `artists/${artistId}/posts/${postId}/${mediaId}.${ext.replace(/^\./, "")}`;
}

/* ---------- Sanatsal ---------- */

export const FAN_ART_CAPTION_MAX = 600;
export const FAN_ART_HASHTAG_MAX = 10;
export const FAN_ART_HASHTAG_REGEX = /^[\p{L}\p{N}_]{2,30}$/u;

export function normalizeHashtags(input: string | string[]): string[] {
  const parts = Array.isArray(input) ? input : input.split(/[\s,]+/);
  return [...new Set(
    parts
      .map((tag) => tag.trim().replace(/^#+/, "").toLocaleLowerCase("tr-TR"))
      .filter((tag) => FAN_ART_HASHTAG_REGEX.test(tag))
  )].slice(0, FAN_ART_HASHTAG_MAX);
}

export const fanArtMetadataSchema = z.object({
  artist_id: z.string().uuid("Geçerli bir sanatçı seç."),
  caption: z.string().max(FAN_ART_CAPTION_MAX).optional().default(""),
  hashtags: z.union([z.string(), z.array(z.string())]).transform(normalizeHashtags),
});

/* ---------- 25. Arama ---------- */

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_DEBOUNCE_MS = 300; // 250–350 ms aralığı

/* ---------- Güvenli bağlantı algılama (8.1 metin gönderisi) ---------- */

export function extractSafeLinks(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/g) ?? [];
  return matches.filter((url) => {
    try {
      const u = new URL(url);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  });
}
