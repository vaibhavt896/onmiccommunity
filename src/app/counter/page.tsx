import type { Metadata } from "next";
import { Counter } from "./Counter";

export const metadata: Metadata = { title: "Counter", robots: { index: false } };

export default function CounterPage() {
  return <Counter />;
}
