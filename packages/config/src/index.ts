export * from "./config.types";
export * from "./env.validator";

/**
 * Boost Market shared configuration defaults.
 */
export const WORKSPACE_CONFIG = {
  APP_NAME: "Boost Market",
  DEFAULT_WEB_PORT: 3000,
  DEFAULT_API_PORT: 3001,
  DEFAULT_LOCALE: "en-NG",
  DEFAULT_CURRENCY: "NGN",
} as const;
