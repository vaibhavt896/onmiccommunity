import { Landing } from "@/components/landing/Landing";
import { safePublicJam } from "@/lib/jam";
import { EventJsonLd, jamMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return jamMetadata(await safePublicJam());
}

export default async function Home() {
  const jam = await safePublicJam();
  return (
    <>
      <EventJsonLd jam={jam} />
      <Landing jam={jam} />
    </>
  );
}
