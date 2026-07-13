# Edge Functions

Şartname 21.5 medya işleme hattı için ayrılmıştır:

- `process-media` — MIME/imza doğrulama, boyut türevleri (küçük/orta/büyük),
  video poster üretimi, ses waveform verisi, EXIF temizliği, zararlı içerik taraması.
  İşlem bitince `post_media.processing_status` → `ready`.
- `cleanup-orphans` — `cleanup_orphan_media()` RPC'sini zamanlanmış çağırır (Şartname 28).

Fonksiyonlar `supabase functions deploy <ad>` ile yayımlanır.
