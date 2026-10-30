import { Result } from "@boost-market/shared";
import {
  AppEnvironment,
  LogLevel,
  AIProviderName,
  PaymentProviderName,
  StorageDriver,
  EmailDriver,
  ServerConfig,
  PublicClientConfig,
} from "./config.types";

export interface ConfigValidationError {
  readonly message: string;
  readonly failedKeys: string[];
}

/**
 * Validates integer environment variables within bounds.
 */
function parseInteger(
  val: string | undefined,
  fallback: number,
  keyName: string,
  min: number,
  max: number,
  errors: string[]
): number {
  if (val === undefined || val.trim() === "") {
    return fallback;
  }
  const parsed = Number(val);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    errors.push(`${keyName} must be an integer between ${min} and ${max}`);
    return fallback;
  }
  return parsed;
}

/**
 * Validates URL format if provided.
 */
function parseUrl(val: string | undefined, fallback: string, keyName: string, errors: string[]): string {
  if (!val || val.trim() === "") {
    return fallback;
  }
  try {
    const url = new URL(val);
    return url.toString().replace(/\/$/, "");
  } catch {
    errors.push(`${keyName} must be a valid URL`);
    return fallback;
  }
}

/**
 * Pure environment configuration validator.
 * Transforms raw environment dictionary into validated, strongly-typed ServerConfig.
 * Redacts secret values from error messages to prevent leakage.
 */
export function validateEnvironment(env: Record<string, string | undefined>): Result<ServerConfig, ConfigValidationError> {
  const errors: string[] = [];
  const failedKeys: string[] = [];

  // Determine environment
  const rawNodeEnv = (env.NODE_ENV || "development").toLowerCase();
  let nodeEnv: AppEnvironment = "development";
  if (rawNodeEnv === "production" || rawNodeEnv === "test" || rawNodeEnv === "development") {
    nodeEnv = rawNodeEnv;
  } else {
    errors.push(`Invalid NODE_ENV: '${rawNodeEnv}'. Expected 'development', 'test', or 'production'`);
    failedKeys.push("NODE_ENV");
  }

  const isProduction = nodeEnv === "production";
  const isTest = nodeEnv === "test";
  const isDevelopment = nodeEnv === "development";

  // Application Core
  const appName = env.APP_NAME || "Boost Market";
  const webPort = parseInteger(env.PORT, 3000, "PORT", 1024, 65535, errors);
  const apiPort = parseInteger(env.API_PORT, 3001, "API_PORT", 1024, 65535, errors);
  const appUrl = parseUrl(env.APP_URL || env.NEXT_PUBLIC_APP_URL, "http://localhost:3000", "APP_URL", errors);
  const apiUrl = parseUrl(env.API_URL || env.NEXT_PUBLIC_API_URL, "http://localhost:3001", "API_URL", errors);

  // Database (PostgreSQL)
  const databaseUrl = env.DATABASE_URL;
  if (isProduction && (!databaseUrl || databaseUrl.trim() === "")) {
    errors.push("DATABASE_URL is required in production environment");
    failedKeys.push("DATABASE_URL");
  }
  const poolMin = parseInteger(env.DATABASE_POOL_MIN, 2, "DATABASE_POOL_MIN", 0, 100, errors);
  const poolMax = parseInteger(env.DATABASE_POOL_MAX, 10, "DATABASE_POOL_MAX", 1, 100, errors);
  const dbSsl = env.DATABASE_SSL === "true" || (isProduction && env.DATABASE_SSL !== "false");

  // Redis
  const redisUrl = env.REDIS_URL;
  const redisTtl = parseInteger(env.REDIS_TTL_SECONDS, 3600, "REDIS_TTL_SECONDS", 1, 86400 * 30, errors);

  // AI Provider
  const rawAiProvider = (env.AI_DEFAULT_PROVIDER || (isTest ? "mock" : "gemini")).toLowerCase();
  let aiProvider: AIProviderName = "gemini";
  if (rawAiProvider === "gemini" || rawAiProvider === "openai" || rawAiProvider === "mock") {
    aiProvider = rawAiProvider;
  } else {
    errors.push(`Invalid AI_DEFAULT_PROVIDER: '${rawAiProvider}'. Expected 'gemini', 'openai', or 'mock'`);
    failedKeys.push("AI_DEFAULT_PROVIDER");
  }

  // Authentication
  const jwtSecret = env.JWT_SECRET;
  if (isProduction && (!jwtSecret || jwtSecret.length < 32)) {
    errors.push("JWT_SECRET is required and must be at least 32 characters in production");
    failedKeys.push("JWT_SECRET");
  }
  const jwtExpiresIn = env.JWT_EXPIRES_IN || "7d";
  const sessionSecret = env.SESSION_SECRET;

  // Payments
  const rawPaymentProvider = (env.PAYMENT_DEFAULT_PROVIDER || (isTest ? "mock" : "paystack")).toLowerCase();
  let paymentProvider: PaymentProviderName = "paystack";
  if (rawPaymentProvider === "paystack" || rawPaymentProvider === "flutterwave" || rawPaymentProvider === "mock") {
    paymentProvider = rawPaymentProvider;
  } else {
    errors.push(`Invalid PAYMENT_DEFAULT_PROVIDER: '${rawPaymentProvider}'. Expected 'paystack', 'flutterwave', or 'mock'`);
    failedKeys.push("PAYMENT_DEFAULT_PROVIDER");
  }

  // Storage
  const rawStorage = (env.STORAGE_DRIVER || "local").toLowerCase();
  let storageDriver: StorageDriver = "local";
  if (rawStorage === "local" || rawStorage === "gcs" || rawStorage === "s3") {
    storageDriver = rawStorage;
  } else {
    errors.push(`Invalid STORAGE_DRIVER: '${rawStorage}'. Expected 'local', 'gcs', or 's3'`);
    failedKeys.push("STORAGE_DRIVER");
  }

  // Email
  const rawEmail = (env.EMAIL_DRIVER || (isTest ? "mock" : "smtp")).toLowerCase();
  let emailDriver: EmailDriver = "smtp";
  if (rawEmail === "smtp" || rawEmail === "resend" || rawEmail === "mock") {
    emailDriver = rawEmail;
  } else {
    errors.push(`Invalid EMAIL_DRIVER: '${rawEmail}'. Expected 'smtp', 'resend', or 'mock'`);
    failedKeys.push("EMAIL_DRIVER");
  }

  // Observability
  const rawLogLevel = (env.LOG_LEVEL || "info").toLowerCase();
  let logLevel: LogLevel = "info";
  if (rawLogLevel === "debug" || rawLogLevel === "info" || rawLogLevel === "warn" || rawLogLevel === "error") {
    logLevel = rawLogLevel;
  } else {
    errors.push(`Invalid LOG_LEVEL: '${rawLogLevel}'. Expected 'debug', 'info', 'warn', or 'error'`);
    failedKeys.push("LOG_LEVEL");
  }

  if (errors.length > 0) {
    return Result.fail<ServerConfig, ConfigValidationError>({
      message: `Configuration validation failed with ${errors.length} error(s):\n - ${errors.join("\n - ")}`,
      failedKeys,
    });
  }

  const serverConfig: ServerConfig = {
    app: {
      nodeEnv,
      appName,
      webPort,
      apiPort,
      appUrl,
      apiUrl,
      isProduction,
      isDevelopment,
      isTest,
    },
    database: {
      url: databaseUrl,
      poolMin,
      poolMax,
      ssl: dbSsl,
    },
    redis: {
      url: redisUrl,
      ttlSeconds: redisTtl,
    },
    ai: {
      defaultProvider: aiProvider,
      geminiApiKey: env.GEMINI_API_KEY,
      openaiApiKey: env.OPENAI_API_KEY,
    },
    auth: {
      jwtSecret,
      jwtExpiresIn,
      sessionSecret,
    },
    payments: {
      defaultProvider: paymentProvider,
      paystackPublicKey: env.PAYSTACK_PUBLIC_KEY || env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      paystackSecretKey: env.PAYSTACK_SECRET_KEY,
      flutterwavePublicKey: env.FLUTTERWAVE_PUBLIC_KEY || env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY,
      flutterwaveSecretKey: env.FLUTTERWAVE_SECRET_KEY,
    },
    advertising: {
      metaAppId: env.META_APP_ID,
      metaAppSecret: env.META_APP_SECRET,
      googleAdsDeveloperToken: env.GOOGLE_ADS_DEVELOPER_TOKEN,
      googleAdsClientId: env.GOOGLE_ADS_CLIENT_ID,
      googleAdsClientSecret: env.GOOGLE_ADS_CLIENT_SECRET,
    },
    storage: {
      driver: storageDriver,
      bucketName: env.STORAGE_BUCKET_NAME,
    },
    email: {
      driver: emailDriver,
      fromAddress: env.EMAIL_FROM || "no-reply@boostmarket.ng",
    },
    observability: {
      logLevel,
      otelEnabled: env.OTEL_ENABLED === "true",
    },
  };

  return Result.ok<ServerConfig, ConfigValidationError>(Object.freeze(serverConfig));
}

/**
 * Extracts public, client-safe configuration for the browser bundle.
 * Guarantees zero backend secrets are returned.
 */
export function extractPublicConfig(serverConfig: ServerConfig): PublicClientConfig {
  return Object.freeze({
    nodeEnv: serverConfig.app.nodeEnv,
    appName: serverConfig.app.appName,
    appUrl: serverConfig.app.appUrl,
    apiUrl: serverConfig.app.apiUrl,
    paystackPublicKey: serverConfig.payments.paystackPublicKey,
    flutterwavePublicKey: serverConfig.payments.flutterwavePublicKey,
  });
}
