/**
 * E2E — Şartname 29.4: ziyaretçi akışları, mobil kullanım, giriş kapıları
 * (Demo modunda çalışır; Supabase modunda Google/e-posta akışları da koşar.)
 */

import { expect, test } from "@playwright/test";

test.describe("ziyaretçi (4.1)", () => {
  test("ana sayfa hero, RapLine ve akışı gösterir", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByLabel("RapLine — sanatçı şeridi")).toBeVisible();
  });

  test("sanatçı profili açılır ve sekmeler çalışır", async ({ page }) => {
    await page.goto("/sanatci/rayvold");
    await expect(page.getByRole("heading", { name: /ray vold/i })).toBeVisible();
    await page.getByRole("link", { name: "Hakkında" }).click();
    await expect(page).toHaveURL(/sekme=hakkinda/);
  });

  test("beğeni butonu girişe yönlendirir (4.1)", async ({ page }) => {
    await page.goto("/sanatci/rayvold");
    await page.getByRole("button", { name: "Beğen" }).first().click();
    await expect(page).toHaveURL(/\/giris/);
  });

  test("takip butonu girişe yönlendirir (4.1)", async ({ page }) => {
    await page.goto("/sanatci/nefes");
    await page.getByRole("button", { name: "Takip Et" }).first().click();
    await expect(page).toHaveURL(/\/giris/);
  });

  test("404 ekranı tasarıma uygun (27.3)", async ({ page }) => {
    const res = await page.goto("/olmayan-sayfa");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("İçerik bulunamadı")).toBeVisible();
  });

  test("arama en az iki karakter ister (25)", async ({ page }) => {
    await page.goto("/arama");
    await page.getByRole("searchbox").fill("k");
    await expect(page.getByText("Aranıyor…")).toHaveCount(0);
    await page.getByRole("searchbox").fill("karga");
    await expect(page.getByText(/Sanatçılar \(/)).toBeVisible({ timeout: 5000 });
  });

  test("Sanatsal galerisi açılır ve ziyaretçi beğenide girişe yönlenir", async ({ page }) => {
    await page.goto("/sanatsal");
    await expect(page.getByRole("heading", { name: "Sanatsal" })).toBeVisible();
    await expect(page.getByText(/@dinleyici\.06/).first()).toBeVisible();
    await page.getByRole("button", { name: "Beğen" }).first().click();
    await expect(page).toHaveURL(/\/giris/);
  });
});

test.describe("demo kullanıcı etkileşimleri", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/giris");
    await page.getByRole("button", { name: /Dinleyici/ }).click();
    await page.waitForURL("/");
  });

  test("giriş sonrası beğeni bırakılır ve ikinci tık kaldırır (9.1)", async ({ page }) => {
    await page.goto("/sanatci/nefes");
    const likeButton = page.getByRole("button", { name: "Beğen" }).first();
    await likeButton.click();
    await expect(page.getByRole("button", { name: "Beğeniyi kaldır" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Beğeniyi kaldır" }).first().click();
    await expect(page.getByRole("button", { name: "Beğen" }).first()).toBeVisible();
  });

  test("sanatçı takip edilir ve buton durumu değişir (10.2)", async ({ page }) => {
    await page.goto("/sanatci/karga");
    await page.getByRole("button", { name: "Takip Et" }).first().click();
    await expect(page.getByRole("button", { name: "Takip Ediliyor" }).first()).toBeVisible();
  });

  test("kullanıcı artist studio'ya giremez (4.2)", async ({ page }) => {
    await page.goto("/artist-studio");
    await expect(page.getByText("erişim yetkin yok")).toBeVisible();
  });

  test("kullanıcı control center'a giremez (4.2)", async ({ page }) => {
    await page.goto("/control-center");
    await expect(page.getByText("erişim yetkin yok")).toBeVisible();
  });
});

test.describe("sanatçı paneli (13)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/giris");
    await page.getByRole("button", { name: /Ray Vold/ }).click();
    await page.waitForURL("/");
  });

  test("genel bakış kartları görünür (13.2)", async ({ page }) => {
    await page.goto("/artist-studio");
    await expect(page.getByText("Toplam takipçi")).toBeVisible();
    await expect(page.getByText("Profil tamamlanma")).toBeVisible();
  });

  test("metin gönderisi oluşturulur (13.3)", async ({ page }) => {
    await page.goto("/artist-studio/yeni-gonderi");
    await page.getByRole("textbox").nth(1).fill("E2E test gönderisi — kurgusal içerik.");
    await page.getByRole("button", { name: "Yayımla" }).click();
    await expect(page.getByText("Gönderi kaydedildi ✓")).toBeVisible();
  });

  test("800 karakter sınırı yayımlamayı engeller (8.1)", async ({ page }) => {
    await page.goto("/artist-studio/yeni-gonderi");
    await page.getByRole("textbox").nth(1).fill("a".repeat(801));
    await expect(page.getByRole("button", { name: "Yayımla" })).toBeDisabled();
  });

  test("kendisiyle ilişkilendirilen fan sanatı Studio'da görünür", async ({ page }) => {
    await page.goto("/artist-studio/fan-sanati");
    await expect(page.getByRole("heading", { name: "Fan Sanatı" })).toBeVisible();
    await expect(page.getByText(/@dinleyici\.06/).first()).toBeVisible();
  });
});

test.describe("yönetici paneli (14)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/giris");
    await page.getByRole("button", { name: /Kurucu/ }).click();
    await page.waitForURL("/");
  });

  test("sistem özeti metrikleri görünür (14.2)", async ({ page }) => {
    await page.goto("/control-center");
    await expect(page.getByText("Toplam kullanıcı")).toBeVisible();
    await expect(page.getByText("Bekleyen başvuru")).toBeVisible();
  });

  test("başvuru onaylanır ve sanatçı oluşur (12.3)", async ({ page }) => {
    await page.goto("/control-center/basvurular");
    await page.getByRole("button", { name: /Onayla/ }).first().click();
    await expect(page.getByText("Onaylandı").first()).toBeVisible({ timeout: 5000 });
  });

  test("audit log görüntülenir ve silme arayüzü yoktur (15.10)", async ({ page }) => {
    await page.goto("/control-center/audit-log");
    await expect(page.getByText("Audit Log").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sil/i })).toHaveCount(0);
  });

  test("fan doğrulamaları yönetim ekranında listelenir", async ({ page }) => {
    await page.goto("/control-center/fan-dogrulamalari");
    await expect(page.getByRole("heading", { name: "Fan Doğrulamaları" })).toBeVisible();
    await expect(page.getByText("@dinleyici.06")).toBeVisible();
  });
});
