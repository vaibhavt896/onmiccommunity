/** Public (NEXT_PUBLIC_*) values, safe in the client bundle. */
export const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || "onmic@upi";
export const UPI_NAME = process.env.NEXT_PUBLIC_UPI_NAME || "On Mic Community";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/$/, "");
export const INSTAGRAM_URL = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://instagram.com/";
export const WHATSAPP_URL = process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://chat.whatsapp.com/";
