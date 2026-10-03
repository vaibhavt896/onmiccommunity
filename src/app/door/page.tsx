import type { Metadata } from "next";
import { Door } from "./Door";

export const metadata: Metadata = { title: "Door", robots: { index: false } };

export default function DoorPage() {
  return <Door />;
}
