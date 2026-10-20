import type { Metadata } from "next";
import { REFUND_LINE } from "@/lib/content";

export const metadata: Metadata = { title: "Privacy and refunds" };

export default function Privacy() {
  return (
    <main className="min-h-dvh bg-cream px-5 py-14 text-ink">
      <article className="mx-auto max-w-[680px] space-y-5 text-[17px] leading-relaxed">
        <a href="/" className="kicker underline underline-offset-4">← On Mic Community</a>
        <h1 className="font-display text-[64px] leading-[0.9]">Privacy + refunds</h1>
        <h2 className="font-display text-[30px]">What we collect</h2>
        <p>When you book a seat we collect your name, your WhatsApp number, optionally your Instagram handle, and the UPI reference (UTR) of your payment. If you ask for a stage slot or join the waitlist, we collect your name, number and what you tell us.</p>
        <h2 className="font-display text-[30px]">Why</h2>
        <p>Only to run the jam: to hold your seat, match your payment, send you your pass on WhatsApp, check you in at the door, and hand over your mocktail token. We don't sell or share your details, and we don't send marketing unless you join our community group yourself.</p>
        <h2 className="font-display text-[30px]">Who sees it</h2>
        <p>The On Mic core team, who also get a copy of each booking, stage request and waitlist entry in a private Google Sheet. Door and cafe-counter staff see your name and pass number on the night. The venue owner gets a headcount, not your details.</p>
        <h2 className="font-display text-[30px]">Analytics</h2>
        <p>We count page visits and button taps without cookies and without storing your IP address, so we can tell which Instagram posts bring people in.</p>
        <h2 className="font-display text-[30px]">Deleting your data</h2>
        <p>Message us on WhatsApp and we'll delete your booking details once the jam is over.</p>
        <h2 className="font-display text-[30px]">Refunds and cancellations</h2>
        <p>{REFUND_LINE}</p>
      </article>
    </main>
  );
}
