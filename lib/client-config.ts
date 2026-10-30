import { PublicClientConfig } from "@boost-market/config";

/**
 * Client-Side Configuration Accessor
 * 
 * SECURITY INVARIANT:
 * This accessor exposes ONLY variables prefixed with NEXT_PUBLIC_ or hardcoded
 * non-sensitive defaults. No backend secrets (DATABASE_URL, API keys, private tokens)
 * can ever be retrieved through this module.
 */
export function getClientConfig(): PublicClientConfig {
  const isDev = process.env.NODE_ENV !== "production";

  return Object.freeze({
    nodeEnv: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
    appName: "Boost Market",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || (isDev ? "http://localhost:3000" : ""),
    apiUrl: process.env.NEXT_PUBLIC_API_URL || (isDev ? "http://localhost:3001" : ""),
    paystackPublicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    flutterwavePublicKey: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
  });
}
