import "server-only";
import { scryptSync } from "node:crypto";
import { env } from "./env";

export function hashPin(pin: string): string {
  return scryptSync(pin, env.STAFF_PIN_SALT, 32).toString("hex");
}
