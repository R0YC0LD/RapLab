# RapLab Mimari Notları

Bu belge, `RapLab_Tam_Proje_Plani.txt` şartnamesinin kod tabanına nasıl eşlendiğini özetler.

## Katmanlar

```
app/            → Sayfalar ve API route'ları (Next.js App Router)
components/     → ui / navigation / artist / posts / media / studio / admin
features/       → auth, artists, posts, likes, follows, media, notifications,
                  moderation, applications — iş kuralları burada
lib/            → auth, database, permissions, validation, storage, errors,
                  analytics, theme, rate-limit, env
supabase/       → migrations (şema + RLS + fonksiyonlar), seed.sql, functions/
tests/          → unit, integration, rls (pgTAP), e2e (Playwright)
```

## Çalışma modları

`lib/env.ts` Supabase anahtarlarını arar:

- **Supabase modu** — gerçek Auth, PostgreSQL, RLS, Storage. Bütün servisler
  (`features/*/service.ts`) Supabase istemcisiyle çalışır; sayaçlar veritabanı
  trigger'larıyla güncellenir, kritik işlemler RPC'lerle tek transaksiyonda yapılır.
- **Demo modu** — anahtar yoksa devreye girer. `lib/database/demo-store.ts` bellek içi
  kurgusal veriyle aynı iş kurallarını (tekil beğeni, durum makinesi, rol denetimi,
  audit log) uygular. Arayüzde "DEMO MODU" bandı gösterilir; gerçek kayıt/yükleme
  gerektiren akışlar kapalı olduklarını açıkça söyler (Şartname 37 — sahte başarı yok).

## Güvenlik önceliği (Değişmez Kural 20)

Arayüzdeki her denetim yalnızca kullanıcı deneyimi içindir; bağlayıcı kurallar
veritabanındadır:

| Kural | Uygulama |
| --- | --- |
| Tek beğeni / tek takip | `post_likes`, `artist_follows` birleşik PRIMARY KEY |
| Sayı manipülasyonu | `like_count`/`follower_count` yalnızca trigger ile değişir |
| Normal kullanıcı paylaşamaz | `posts` INSERT policy → `member_has_permission()` |
| Sanatçı kendi profili | policy, gönderideki `artist_id` üyeliğini doğrular |
| Rol yükseltme | `prevent_privilege_escalation` trigger'ı |
| Son süper yönetici | `protect_last_super_admin` trigger'ı |
| Audit log silinemez | `prevent_audit_mutation` trigger'ı + policy yok |
| Durum makinesi | `enforce_post_status_machine` trigger'ı (8.2 geçiş tablosu) |
| Belgeler gizli | `verification-docs` bucket private + süreli imzalı URL |

## API sözleşmesi (Şartname 23)

Bütün cevaplar `{ success, data, error: { code, message, field_errors }, request_id }`
zarfını kullanır (`lib/errors/index.ts`). Hata kodları 27.1'deki 17 koddur; kullanıcıya
teknik metin asla gösterilmez.

## Tasarım sistemi (Şartname 17–19)

`styles/tokens.css` şartnamedeki değişkenleri birebir tanımlar. Sanatçı temaları
`--artist-accent` CSS değişkeni üzerinden akar; her vurgu rengi
`lib/theme/contrast.ts` ile WCAG kontrast kontrolünden geçirilir, geçmeyen renk
otomatik aydınlatılır (28). `prefers-reduced-motion` bütün animasyonları kapatır (19.5).

## Bilinen üretim adımları

- Medya işleme (boyutlandırma, poster, waveform, zararlı içerik taraması) Supabase
  Edge Function / kuyruk gerektirir — `supabase/functions/` iskeleti hazırdır.
- Analitik seriler production'da zamanlanmış toplulaştırma görevleriyle üretilmelidir.
- Rate limit bellek içidir; çok sunuculu dağıtımda Redis/Upstash'a taşınmalıdır.
