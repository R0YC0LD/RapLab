"use client";

/** Dış bağlantı paylaşımı — Şartname 4.2/8.4: gönderi bağlantısını dış platformlarda paylaşma */

import { useState } from "react";
import styles from "./posts.module.css";

export function ShareButton({
  slug,
  postId,
  title,
}: {
  slug: string;
  postId: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/sanatci/${slug}?gonderi=${postId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* kullanıcı iptal etti */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* pano erişimi yok */
    }
  }

  return (
    <button type="button" className={styles.footerAction} onClick={share} aria-label="Bağlantıyı paylaş">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M13 3h4v4M17 3l-7 7M9 5H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {copied ? "Kopyalandı ✓" : "Paylaş"}
    </button>
  );
}
