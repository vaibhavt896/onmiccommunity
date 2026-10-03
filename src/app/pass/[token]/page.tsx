import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { passView } from "@/lib/booking";
import { looksLikeToken } from "@/lib/token";
import { PassPage } from "./PassPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your pass", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function Pass({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!looksLikeToken(token)) notFound();
  const view = await passView(token);
  if (!view) notFound();
  return <PassPage token={token} view={view} />;
}
