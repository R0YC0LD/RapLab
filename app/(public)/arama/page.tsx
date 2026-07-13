import type { Metadata } from "next";
import ui from "@/components/ui/ui.module.css";
import { SearchClient } from "./SearchClient";

export const metadata: Metadata = { title: "Arama" };

export default function SearchPage() {
  return (
    <div className="container page-enter" style={{ padding: "var(--space-12) var(--space-6)", maxWidth: 800 }}>
      <h1 className={ui.sectionTitle}>
        Arama <span>sanatçı adı, slug, şehir, tür, gönderi</span>
      </h1>
      <SearchClient />
    </div>
  );
}
