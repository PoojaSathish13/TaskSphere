import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:8000"),
  NEXT_PUBLIC_WS_URL: z.string().url().default("ws://localhost:8000"),
});

// Run validation
const parseEnv = () => {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
  });

  if (!result.success) {
    console.error("❌ Invalid environment configurations:", result.error.format());
    // Fall back to defaults in dev, throw in prod
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing required production environment variables.");
    }
    return envSchema.parse({}); // fallback
  }

  return result.data;
};

export const env = parseEnv();
export type EnvConfig = z.infer<typeof envSchema>;
