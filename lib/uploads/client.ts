const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type UploadResponse<TData extends object> =
  | { success: true; data: TData; request_id?: string }
  | {
      success: false;
      error?: { message?: string; field_errors?: Record<string, string> };
      request_id?: string;
    };

export function validateImageSelection(file: File, maxBytes: number): string | null {
  if (!IMAGE_TYPES.has(file.type)) return "JPEG, PNG, WebP veya AVIF görseli seç.";
  if (file.size <= 0) return "Seçilen dosya boş.";
  if (file.size > maxBytes) {
    return `Görsel en fazla ${Math.round(maxBytes / 1024 / 1024)} MB olabilir.`;
  }
  return null;
}

export async function uploadFormWithTimeout<TData extends object = Record<string, never>>(
  url: string,
  form: FormData,
  timeoutMs = 45_000
): Promise<{ response: Response; json: UploadResponse<TData> }> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { method: "POST", body: form, signal: controller.signal });
    const text = await response.text();
    let json: UploadResponse<TData>;
    try {
      json = JSON.parse(text) as UploadResponse<TData>;
    } catch {
      json = { success: false, error: { message: "Sunucudan geçersiz yanıt alındı." } };
    }
    return { response, json };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Yükleme zaman aşımına uğradı. Bağlantını kontrol edip tekrar dene.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
