# RapLab

Türkçe Rap Sanatçı–Topluluk Platformu — `RapLab_Tam_Proje_Plani.txt` şartnamesinin birebir uygulaması.

> "RapLab, sanatçının konuştuğu, takipçinin takip edip beğenerek tepki verdiği,
> sanatçı kimliğinin ve topluluğunun merkezde olduğu premium dijital kültür platformudur."

## Hızlı başlangıç

```bash
npm install
npm run dev
```

`http://localhost:3000` — Supabase anahtarları tanımlı değilse uygulama **DEMO modunda**
açılır: kurgusal sanatçılar, bellek içi veri deposu ve seçilebilir demo personaları
(dinleyici / sanatçı / moderatör / süper yönetici). Demo modu arayüzde açıkça belirtilir;
hiçbir özellik "çalışıyor gibi" gösterilmez (Şartname 37).

## Gerçek backend (Supabase)

1. Bir Supabase projesi oluştur, `supabase/migrations/` dosyalarını sırayla uygula
   (`supabase db push` veya SQL editörü).
2. `.env.example` → `.env.local` kopyala, anahtarları doldur.
3. Google OAuth'u Supabase Auth panelinden etkinleştir.
4. Local geliştirme için: `supabase start && supabase db reset` (seed dahil).

Bütün yetki kuralları **veritabanı seviyesinde RLS ile** uygulanır (Değişmez Kural 20):
tekil beğeni/takip birincil anahtarları, gönderi durum makinesi trigger'ı, rol yükseltme
koruması, son süper yönetici koruması, değiştirilemez audit log ve storage klasör kuralları
`supabase/migrations/` içindedir.

## Komutlar

| Komut | Açıklama |
| --- | --- |
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | Production build (hatasız tamamlanmalı — Şartname 36) |
| `npm run typecheck` | TypeScript kontrolü |
| `npm run lint` | ESLint |
| `npm test` | Unit + integration testleri (Vitest) |
| `npm run test:e2e` | Playwright E2E (5 görüntü boyutu — Şartname 29.5) |
| `supabase test db` | pgTAP RLS testleri (`tests/rls/`) |
| `node scripts/generate-demo-assets.mjs` | Telifsiz demo SVG/ses varlıklarını yeniden üret |

## Yapı

Şartname 32'deki klasör yapısı uygulanmıştır: `app/` (sayfalar + `api/`), `components/`,
`features/`, `lib/`, `styles/`, `types/`, `tests/{unit,integration,rls,e2e}`,
`supabase/{migrations,functions,seed.sql}`, `docs/`, `.github/workflows/`.

Ayrıntılar için `docs/mimari.md` dosyasına bak.

## Demo içeriği hakkında

Bütün sanatçılar (Ray Vold, Nefes, Karga, Sema K, Gölge 06, Beton Çiçeği) **kurgusaldır**.
Görseller kodla üretilmiş SVG'lerdir; ses dosyası sentezlenmiş telifsiz bir kayıttır.
Gerçek sanatçı fotoğrafı veya telifli medya kullanılmamıştır (Şartname 37).
