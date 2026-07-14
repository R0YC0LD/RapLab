import { describe, expect, it } from "vitest";
import {
  TURKEY_CITIES,
  TURKEY_REGIONS,
  cityDescription,
  findTurkeyCity,
} from "@/lib/turkey/cities";

describe("Türkiye şehir veri seti", () => {
  it("81 benzersiz il ve plaka içerir", () => {
    expect(TURKEY_CITIES).toHaveLength(81);
    expect(new Set(TURKEY_CITIES.map((city) => city.id)).size).toBe(81);
    expect(new Set(TURKEY_CITIES.map((city) => city.plate)).size).toBe(81);
    expect(TURKEY_CITIES.map((city) => city.plate).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 81 }, (_, index) => index + 1)
    );
  });

  it("Türkçe karakterleri ve yaygın şehir takma adlarını eşleştirir", () => {
    expect(findTurkeyCity("İstanbul")?.id).toBe("istanbul");
    expect(findTurkeyCity("Şanlıurfa")?.id).toBe("sanliurfa");
    expect(findTurkeyCity("K. Maraş")?.id).toBe("kahramanmaras");
    expect(findTurkeyCity("İçel")?.id).toBe("mersin");
    expect(findTurkeyCity("Gaziantep / TR")?.id).toBe("gaziantep");
  });

  it("şehir açıklamasını bölge bilgisiyle üretir", () => {
    const city = findTurkeyCity("İzmir")!;
    const description = cityDescription(city);
    expect(description).toContain(city.name);
    expect(description).toContain(TURKEY_REGIONS[city.region].label);
  });
});
