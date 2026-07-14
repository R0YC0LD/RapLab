import type { Metadata, Viewport } from "next";
import { Anton, Lora, Rubik_Wet_Paint, Space_Grotesk } from "next/font/google";
import { getSessionUser } from "@/lib/auth/session";
import { unreadCount } from "@/features/notifications/service";
import { isDemoMode } from "@/lib/env";
import { TopNav } from "@/components/navigation/TopNav";
import { MobileNav } from "@/components/navigation/MobileNav";
import { DemoBanner } from "@/components/ui/DemoBanner";
import { SiteExperience } from "@/components/experience/SiteExperience";
import "./globals.css";

/* 17.3 Tipografi: Display — büyük, yoğun, karakterli */
const displayFont = Anton({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-display",
  display: "swap",
});

/* Street — marka, kamusal basliklar ve sanatci isimleri */
const streetFont = Rubik_Wet_Paint({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-street",
  display: "swap",
});

/* Interface — net, geometrik, orta ağırlık */
const interfaceFont = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-interface",
  display: "swap",
});

/* Reading — yüksek okunabilirlik, rahat satır yüksekliği */
const readingFont = Lora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-reading",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RapLab — Türkçe Rap Sanatçı–Topluluk Platformu",
    template: "%s | RapLab",
  },
  description:
    "RapLab; sanatçının konuştuğu, takipçinin takip edip beğenerek tepki verdiği, sanatçı kimliğinin merkezde olduğu premium dijital kültür platformu.",
};

export const viewport: Viewport = {
  themeColor: "#08090b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const notificationCount = user ? await unreadCount(user) : 0;
  const demo = isDemoMode();

  return (
    <html
      lang="tr"
      className={`${displayFont.variable} ${streetFont.variable} ${interfaceFont.variable} ${readingFont.variable}`}
    >
      <body>
        {demo && <DemoBanner />}
        <TopNav user={user} notificationCount={notificationCount} />
        <main id="icerik" style={{ position: "relative", zIndex: 2 }}>
          {children}
        </main>
        <MobileNav user={user} notificationCount={notificationCount} />
        <SiteExperience />
        <footer
          style={{
            position: "relative",
            zIndex: 2,
            borderTop: "1px solid var(--color-border-soft)",
            padding: "var(--space-10) var(--space-6) var(--space-24)",
            color: "var(--color-text-muted)",
            fontSize: "var(--font-sm)",
            textAlign: "center",
          }}
        >
          <p
            className="type-display"
            style={{
              fontSize: "var(--font-xl)",
              color: "var(--color-text-secondary)",
              marginBottom: "var(--space-3)",
            }}
          >
            RAPLAB
          </p>
          <p>Türkçe rap kültürü için tasarlanmış sanatçı–topluluk platformu.</p>
        </footer>
      </body>
    </html>
  );
}
