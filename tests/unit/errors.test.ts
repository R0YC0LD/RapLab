/** Unit testler — Şartname 27: hata zarfı, kodlar ve kullanıcı mesajları */

import { describe, expect, it } from "vitest";
import { ApiError, apiFailure, apiSuccess, ErrorCodes, userMessages } from "@/lib/errors";

describe("API cevap zarfı (23)", () => {
  it("başarı zarfı istenen alanları içerir", () => {
    const res = apiSuccess({ x: 1 });
    expect(res.success).toBe(true);
    expect(res.data).toEqual({ x: 1 });
    expect(res.error).toBeNull();
    expect(res.request_id).toBeTruthy();
  });

  it("ApiError doğru koda ve HTTP durumuna eşlenir", () => {
    const { body, status } = apiFailure(new ApiError(ErrorCodes.DUPLICATE_LIKE));
    expect(status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("DUPLICATE_LIKE");
    // 27.2: kullanıcıya teknik mesaj değil Türkçe mesaj gösterilir
    expect(body.error.message).toBe("Bu gönderiyi zaten beğendin.");
    expect(body.request_id).toBeTruthy();
  });

  it("bilinmeyen hata teknik detay sızdırmaz", () => {
    const { body, status } = apiFailure(new Error("duplicate key value violates unique constraint"));
    expect(status).toBe(500);
    expect(body.error.code).toBe("UNKNOWN_ERROR");
    expect(body.error.message).not.toContain("duplicate key");
  });

  it("bütün hata kodlarının kullanıcı mesajı vardır (27.1)", () => {
    for (const code of Object.values(ErrorCodes)) {
      expect(userMessages[code]).toBeTruthy();
    }
    expect(Object.values(ErrorCodes)).toHaveLength(17);
  });

  it("rate limit 429 döner", () => {
    const { status } = apiFailure(new ApiError(ErrorCodes.RATE_LIMITED));
    expect(status).toBe(429);
  });
});
