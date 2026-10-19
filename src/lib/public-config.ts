/** Public (NEXT_PUBLIC_*) values, safe in the client bundle. */
export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || "onmic@upi";
export const UPI_NAME = process.env.NEXT_PUBLIC_UPI_NAME || "On Mic Community";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/$/, "");
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/on_mic_community/";
export const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://chat.whatsapp.com/KvublhQ8R6z0PC5lkhhqvb";
/** Shown as the link label, derived from the profile URL (@on_mic_community). */
export const INSTAGRAM_HANDLE = `@${INSTAGRAM_URL.replace(/\/+$/, "").split("/").pop() || "on_mic_community"}`;
