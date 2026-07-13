# RapLab — Demo'dan Gerçek Sisteme Geçiş (10 dakika)

Uygulama, Supabase anahtarları tanımlandığı anda demo modundan çıkar ve gerçek
kayıt/giriş, veritabanı, RLS güvenliği ve medya deposuyla çalışır. Kod tarafında
yapılacak hiçbir şey yok — her şey hazır.

## 1. Supabase projesi oluştur (ücretsiz)

1. https://supabase.com → **Start your project** → GitHub hesabınla giriş yap.
2. **New project** de; ad: `raplab`, bölge: `Frankfurt (eu-central-1)` (Türkiye'ye en yakın),
   güçlü bir veritabanı parolası belirle.
3. Proje açılınca **Project Settings → API** sayfasından üç değeri kopyala:
   - `Project URL`
   - `anon public` anahtarı
   - `service_role` anahtarı (gizli — asla istemciye/repoya koyma)

## 2. Anahtarları tanımla

Proje kökünde `.env.local` dosyası oluştur ( `.env.example` kopyası ) ve doldur:

```
NEXT_PUBLIC_SUPABASE_URL=https://XXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.gitignore` bu dosyayı zaten dışlıyor; anahtarlar GitHub'a gitmez.

## 3. Veritabanı şemasını yükle

Terminalde (proje kökünde):

```bash
npx supabase login          # tarayıcıda onayla
npx supabase link --project-ref XXXX    # XXXX = Project URL'deki alt alan adı
npx supabase db push        # 3 migration: şema + RLS + storage/fonksiyonlar
```

Alternatif: Supabase panelindeki **SQL Editor**'e `supabase/migrations/` içindeki
üç dosyayı sırayla yapıştırıp çalıştır.

## 4. Auth ayarları

Supabase panelinde **Authentication → Providers**:

- **Email**: açık kalsın ("Confirm email" işaretli — Şartname 11 e-posta doğrulama).
- **Google**: aç; Google Cloud Console'dan OAuth Client ID/Secret oluşturup gir.
  Redirect URL olarak Supabase'in gösterdiği adresi Google tarafına ekle.

**Authentication → URL Configuration**: Site URL = `http://localhost:3000`
(canlıya çıkınca alan adınla değiştir).

## 5. İlk süper yönetici

Siteye kayıt olduktan sonra Supabase **SQL Editor**'de bir kez çalıştır:

```sql
update profiles set role = 'super_admin' where username = 'SENIN_KULLANICI_ADIN';
```

Artık `/control-center` erişimin açık; sanatçı başvurularını buradan onaylarsın.

## 6. Çalıştır ve doğrula

```bash
npm run dev
```

- "DEMO MODU" bandı **görünmüyorsa** gerçek moddasın.
- Kayıt ol → e-posta doğrula → giriş yap → sanatçı başvurusu → Control Center'dan
  onayla → Artist Studio'dan gönderi paylaş → ikinci hesapla beğen/takip et.

## 7. (İsteğe bağlı) Canlıya alma — Vercel

1. https://vercel.com → GitHub ile giriş → **Import** → `R0YC0LD/RapLab`.
2. Environment Variables bölümüne `.env.local`'daki dört değeri gir
   (`NEXT_PUBLIC_SITE_URL` = Vercel alan adın).
3. Deploy. Supabase Auth URL ayarlarına Vercel adresini ekle.

## Sorun giderme

| Belirti | Çözüm |
| --- | --- |
| Hâlâ "DEMO MODU" bandı var | `.env.local` adı/konumu yanlış veya sunucu yeniden başlatılmadı |
| Google girişi dönmüyor | Supabase URL Configuration + Google redirect URL eşleşmiyor |
| `permission denied` hataları | Migration'lar eksik — `npx supabase db push` çalıştır |
| Kayıt sonrası profil yok | `00001_init.sql` içindeki `handle_new_user` trigger'ı yüklenmemiş |
