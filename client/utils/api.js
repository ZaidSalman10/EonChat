// Automatically uses the Vercel URL in prod, or localhost in dev
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";