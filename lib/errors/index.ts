/**
 * Hata yönetimi — Şartname Bölüm 27
 * Teknik hatalar kullanıcıya gösterilmez; her hata kaydında request_id bulunur.
 */

import type { ApiFailure, ApiSuccess } from "@/types";

/* 27.1 Hata kodları */
export const ErrorCodes = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_INVALID: "AUTH_INVALID",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  ARTIST_NOT_VERIFIED: "ARTIST_NOT_VERIFIED",
  POST_NOT_FOUND: "POST_NOT_FOUND",
  POST_NOT_PUBLISHED: "POST_NOT_PUBLISHED",
  DUPLICATE_LIKE: "DUPLICATE_LIKE",
  DUPLICATE_FOLLOW: "DUPLICATE_FOLLOW",
  INVALID_MEDIA: "INVALID_MEDIA",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  UPLOAD_FAILED: "UPLOAD_FAILED",
  PROCESSING_FAILED: "PROCESSING_FAILED",
  RATE_LIMITED: "RATE_LIMITED",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/* 27.2 Kullanıcı dostu Türkçe mesajlar */
export const userMessages: Record<ErrorCode, string> = {
  AUTH_REQUIRED: "Bu işlem için giriş yapman gerekiyor.",
  AUTH_INVALID: "Giriş bilgileri doğrulanamadı. Lütfen tekrar dene.",
  EMAIL_NOT_VERIFIED: "Devam etmek için e-posta adresini doğrulaman gerekiyor.",
  PERMISSION_DENIED: "Bu alana erişim yetkin yok.",
  ARTIST_NOT_VERIFIED: "Bu işlem yalnızca doğrulanmış sanatçılar için geçerli.",
  POST_NOT_FOUND: "İçerik bulunamadı.",
  POST_NOT_PUBLISHED: "Bu gönderi henüz yayımlanmamış.",
  DUPLICATE_LIKE: "Bu gönderiyi zaten beğendin.",
  DUPLICATE_FOLLOW: "Bu sanatçıyı zaten takip ediyorsun.",
  INVALID_MEDIA: "Bu dosya türü desteklenmiyor.",
  FILE_TOO_LARGE: "Dosya boyutu izin verilen sınırın üzerinde.",
  UPLOAD_FAILED: "Yükleme tamamlanamadı. Lütfen tekrar dene.",
  PROCESSING_FAILED: "Medya işlenirken bir sorun oluştu.",
  RATE_LIMITED: "Çok fazla işlem yaptın. Lütfen biraz bekle.",
  VALIDATION_FAILED: "Gönderdiğin bilgilerde düzeltilmesi gereken alanlar var.",
  SERVICE_UNAVAILABLE: "Sistem geçici olarak kullanılamıyor.",
  UNKNOWN_ERROR: "Beklenmeyen bir sistem sorunu oluştu.",
};

/** HTTP durum kodu eşlemesi */
const httpStatus: Record<ErrorCode, number> = {
  AUTH_REQUIRED: 401,
  AUTH_INVALID: 401,
  EMAIL_NOT_VERIFIED: 403,
  PERMISSION_DENIED: 403,
  ARTIST_NOT_VERIFIED: 403,
  POST_NOT_FOUND: 404,
  POST_NOT_PUBLISHED: 404,
  DUPLICATE_LIKE: 409,
  DUPLICATE_FOLLOW: 409,
  INVALID_MEDIA: 422,
  FILE_TOO_LARGE: 413,
  UPLOAD_FAILED: 502,
  PROCESSING_FAILED: 502,
  RATE_LIMITED: 429,
  VALIDATION_FAILED: 422,
  SERVICE_UNAVAILABLE: 503,
  UNKNOWN_ERROR: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(code: ErrorCode, fieldErrors?: Record<string, string>, message?: string) {
    super(message ?? userMessages[code]);
    this.name = "ApiError";
    this.code = code;
    this.status = httpStatus[code];
    this.fieldErrors = fieldErrors;
  }
}

export function newRequestId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/* 23. API cevap zarfı: success / data / error.code / error.message / error.field_errors / request_id */

export function apiSuccess<T>(data: T, requestId?: string): ApiSuccess<T> {
  return { success: true, data, error: null, request_id: requestId ?? newRequestId() };
}

export function apiFailure(error: unknown, requestId?: string): { body: ApiFailure; status: number } {
  const request_id = requestId ?? newRequestId();
  if (error instanceof ApiError) {
    return {
      body: {
        success: false,
        data: null,
        error: {
          code: error.code,
          message: error.message,
          field_errors: error.fieldErrors,
        },
        request_id,
      },
      status: error.status,
    };
  }
  // Teknik hata detayları asla kullanıcıya sızdırılmaz — 27.2
  console.error(`[raplab][${request_id}]`, error);
  return {
    body: {
      success: false,
      data: null,
      error: { code: ErrorCodes.UNKNOWN_ERROR, message: userMessages.UNKNOWN_ERROR },
      request_id,
    },
    status: 500,
  };
}
