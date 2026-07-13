import { describe, expect, it } from "vitest";
import { safeRelativePath } from "@/lib/auth/redirects";

describe("kimlik doğrulama yönlendirmeleri", () => {
  it("site içi yolu ve sorguyu korur", () => {
    expect(safeRelativePath("/hesap?dogrulandi=1")).toBe("/hesap?dogrulandi=1");
  });

  it("protokole bağlı açık yönlendirmeyi reddeder", () => {
    expect(safeRelativePath("//example.com/hesap")).toBe("/");
    expect(safeRelativePath("https://example.com")).toBe("/");
  });

  it("boş değerde güvenli varsayılana döner", () => {
    expect(safeRelativePath(null, "/giris")).toBe("/giris");
  });
});
