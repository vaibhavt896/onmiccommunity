import { Landing } from "@/components/landing/Landing";
import { currentPublicJam } from "@/lib/jam";
import { jamMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return jamMetadata(await currentPublicJam(), "/book");
}

/** Deep link for Instagram stories: the landing page with the booking sheet open. */
export default async function Book() {
  return <Landing jam={await currentPublicJam()} openOnLoad />;
}
