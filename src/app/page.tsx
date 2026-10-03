import { Landing } from "@/components/landing/Landing";
import { currentPublicJam } from "@/lib/jam";
import { EventJsonLd, jamMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return jamMetadata(await currentPublicJam());
}

export default async function Home() {
  const jam = await currentPublicJam();
  return (
    <>
      <EventJsonLd jam={jam} />
      <Landing jam={jam} />
    </>
  );
}
