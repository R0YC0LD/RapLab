"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TURKEY_CITIES } from "@/lib/turkey/cities";
import styles from "./city-editor.module.css";

export function CityEditor({ artistId, currentCity }: { artistId: string; currentCity: string | null }) {
  const router = useRouter();
  const [city, setCity] = useState(currentCity ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function saveCity() {
    if (!city || city === currentCity) return;
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/artists/${artistId}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.field_errors?.city ?? result.error?.message ?? "Şehir kaydedilemedi.");
      }
      setMessage({ tone: "success", text: "Şehir güncellendi. Vatan haritasına işlendi." });
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Şehir kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.editor}>
      <div className={styles.heading}>
        <MapPin size={18} aria-hidden="true" />
        <div>
          <strong>Vatan haritasındaki şehir</strong>
          <span>Sanatçı profilinin sahneyle bağ kurduğu ili seç.</span>
        </div>
      </div>
      <div className={styles.controls}>
        <label>
          <span className="sr-only">Şehir</span>
          <select value={city} onChange={(event) => setCity(event.target.value)}>
            <option value="" disabled>Şehir seç</option>
            {TURKEY_CITIES.map((item) => (
              <option key={item.id} value={item.name}>
                {String(item.plate).padStart(2, "0")} · {item.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="button" onClick={saveCity} loading={saving} disabled={!city || city === currentCity}>
          <Save size={16} aria-hidden="true" />
          Kaydet
        </Button>
      </div>
      {message && (
        <p className={message.tone === "success" ? styles.success : styles.error} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}
