/** Durum kodu ekranları — Şartname 27.3: 401, 403, 404, 410, 429, 500, 503 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ERROR_SCREENS, ErrorScreen } from "@/components/ui/ErrorScreen";

export function generateStaticParams() {
  return Object.keys(ERROR_SCREENS).map((kod) => ({ kod }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kod: string }>;
}): Promise<Metadata> {
  const { kod } = await params;
  const screen = ERROR_SCREENS[kod];
  return { title: screen ? `${screen.code} — ${screen.title}` : "Hata" };
}

export default async function ErrorCodePage({
  params,
}: {
  params: Promise<{ kod: string }>;
}) {
  const { kod } = await params;
  if (!ERROR_SCREENS[kod]) notFound();
  return <ErrorScreen code={kod} />;
}
