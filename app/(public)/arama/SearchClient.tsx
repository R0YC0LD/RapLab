"use client";

/**
 * Arama arayüzü — Şartname 25:
 * 250–350 ms debounce, en az 2 karakter, son aramalar yerel saklanır.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from "@/lib/validation";
import { VerifiedBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

interface ArtistResult {
  id: string;
  stage_name: string;
  slug: string;
  city: string | null;
  profile_image_path: string;
  verification_status: string;
  follower_count: number;
}

interface PostResult {
  id: string;
  title: string | null;
  body: string | null;
  artist_slug: string;
  artist_name: string;
}

const RECENT_KEY = "raplab_recent_searches";

export function SearchClient() {
  const [query, setQuery] = useState("");
  const [artists, setArtists] = useState<ArtistResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [recent, setRecent] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Son aramalar yalnızca istemcide okunur (25); SSR uyumsuzluğunu önlemek
  // için mount sonrası tek seferlik senkronizasyon yapılır.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"));
      } catch {
        /* yok say */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Zamanlayıcı bileşen kaldırıldığında temizlenir
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  /** 25: 250–350 ms debounce, en az iki karakter — olay işleyicisinde yürütülür */
  function handleQueryChange(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);

    const trimmed = value.trim();
    if (trimmed.length < SEARCH_MIN_CHARS) {
      setArtists([]);
      setPosts([]);
      setState("idle");
      return;
    }

    setState("loading");
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        if (json.success) {
          setArtists(json.data.artists);
          setPosts(json.data.posts);
          setState("done");
          setRecent((prev) => {
            const next = [trimmed, ...prev.filter((r) => r !== trimmed)].slice(0, 6);
            localStorage.setItem(RECENT_KEY, JSON.stringify(next));
            return next;
          });
        } else {
          setState("error");
        }
      } catch {
        setState("error");
      }
    }, SEARCH_DEBOUNCE_MS);
  }

  return (
    <div>
      <label htmlFor="arama-girisi" className="sr-only">
        Sanatçı, şehir, tür veya gönderi ara
      </label>
      <input
        id="arama-girisi"
        type="search"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Sanatçı, şehir, tür veya gönderi ara…"
        autoFocus
        style={{
          width: "100%",
          padding: "var(--space-4) var(--space-5)",
          fontSize: "var(--font-lg)",
          background: "var(--color-bg-elevated)",
          border: "1px solid var(--color-border-soft)",
          borderRadius: "var(--radius-md)",
          color: "var(--color-text-primary)",
        }}
      />

      {state === "idle" && recent.length > 0 && (
        <div style={{ marginTop: "var(--space-6)" }}>
          <h2 style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "var(--space-3)" }}>
            Son aramalar
          </h2>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {recent.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleQueryChange(r)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--color-border-soft)",
                  color: "var(--color-text-secondary)",
                  fontSize: "var(--font-sm)",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      {state === "loading" && (
        <p style={{ marginTop: "var(--space-6)", color: "var(--color-text-muted)" }} role="status">
          Aranıyor…
        </p>
      )}

      {state === "error" && (
        <p style={{ marginTop: "var(--space-6)", color: "var(--color-danger)" }} role="alert">
          Arama tamamlanamadı. Lütfen tekrar dene.
        </p>
      )}

      {state === "done" && (
        <div style={{ marginTop: "var(--space-8)", display: "grid", gap: "var(--space-8)" }} aria-live="polite">
          <section>
            <h2 style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "var(--space-4)" }}>
              Sanatçılar ({artists.length})
            </h2>
            {artists.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>Sanatçı bulunamadı.</p>
            ) : (
              <div style={{ display: "grid", gap: "var(--space-3)" }}>
                {artists.map((a) => (
                  <Link
                    key={a.id}
                    href={`/sanatci/${a.slug}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-4)",
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border-soft)",
                      background: "var(--color-bg-secondary)",
                    }}
                  >
                    <Avatar src={a.profile_image_path} alt={a.stage_name} size={48} />
                    <div>
                      <span style={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {a.stage_name}
                        {a.verification_status === "approved" && <VerifiedBadge size={15} />}
                      </span>
                      <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>
                        {a.city} · {a.follower_count.toLocaleString("tr-TR")} takipçi
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: "var(--font-xs)", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "var(--space-4)" }}>
              Gönderiler ({posts.length})
            </h2>
            {posts.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)" }}>Gönderi bulunamadı.</p>
            ) : (
              <div style={{ display: "grid", gap: "var(--space-3)" }}>
                {posts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/sanatci/${p.artist_slug}`}
                    style={{
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border-soft)",
                      background: "var(--color-bg-secondary)",
                    }}
                  >
                    <p style={{ fontWeight: 600 }}>{p.title ?? p.body?.slice(0, 80)}</p>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-sm)" }}>{p.artist_name}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
