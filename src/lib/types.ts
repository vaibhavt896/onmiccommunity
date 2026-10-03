export type BookingState =
  | "HELD" | "PAID_PENDING" | "CONFIRMED" | "CHECKED_IN" | "EXPIRED" | "REJECTED" | "CANCELLED";

export type Tier = "regular" | "performer" | "core" | "guest";

export const TIER_LABEL: Record<Tier, string> = {
  regular: "Regular",
  performer: "Performer",
  core: "Core team",
  guest: "Special guest",
};

/** What the public page gets. Never contains the venue. */
export type PublicJam = {
  id: string;
  title: string;
  startsAt: string;
  cutoffAt: string;
  capacity: number;
  price: number;
  booked: number;
  seatsLeft: number;
  status: "draft" | "open" | "closed" | "done";
  /** open = bookable; soldout = no seats or past cutoff or closed */
  sale: "open" | "soldout";
};

export type PassView = {
  state: BookingState;
  name: string;
  passNo: string;
  tier: Tier;
  amount: number;
  holdExpiresAt: string | null;
  checkedInAt: string | null;
  jam: { title: string; startsAt: string };
  /** Present only for CONFIRMED / CHECKED_IN. */
  venue: { name: string; mapUrl: string } | null;
};
