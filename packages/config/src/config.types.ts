/**
 * Boost Market - Configuration Type Definitions
 * 
 * Establishes typed boundaries for all platform subsystems.
 * Clearly separates Public Client Configuration from Server-Only Secrets.
 */

export type AppEnvironment = "development" | "test" | "production";
export type LogLevel = "debug" | "info" | "warn" | "error";
export type AIProviderName = "gemini" | "openai" | "mock";
export type PaymentProviderName = "paystack" | "flutterwave" | "mock";
export type StorageDriver = "local" | "gcs" | "s3";
export type EmailDriver = "smtp" | "resend" | "mock";

/**
 * 1. Application Core Configuration
 */
export interface AppCoreConfig {
  readonly nodeEnv: AppEnvironment;
  readonly appName: string;
  readonly webPort: number;
  readonly apiPort: number;
  readonly appUrl: string;
  readonly apiUrl: string;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly isTest: boolean;
}

/**
 * 2. Database Configuration (PostgreSQL)
 */
export interface DatabaseConfig {
  readonly url?: string;
  readonly poolMin: number;
  readonly poolMax: number;
  readonly ssl: boolean;
}

/**
 * 3. Cache & Queue Configuration (Redis)
 */
export interface RedisConfig {
  readonly url?: string;
  readonly ttlSeconds: number;
}

/**
 * 4. AI Provider Configuration (Provider-Agnostic)
 */
export interface AIConfig {
  readonly defaultProvider: AIProviderName;
  readonly geminiApiKey?: string;
  readonly openaiApiKey?: string;
}

/**
 * 5. Authentication Configuration
 */
export interface AuthConfig {
  readonly jwtSecret?: string;
  readonly jwtExpiresIn: string;
  readonly sessionSecret?: string;
}

/**
 * 6. Payment Provider Configuration
 */
export interface PaymentConfig {
  readonly defaultProvider: PaymentProviderName;
  readonly paystackPublicKey?: string;
  readonly paystackSecretKey?: string;
  readonly flutterwavePublicKey?: string;
  readonly flutterwaveSecretKey?: string;
}

/**
 * 7. Advertising Channel Configuration
 */
export interface AdvertisingConfig {
  readonly metaAppId?: string;
  readonly metaAppSecret?: string;
  readonly googleAdsDeveloperToken?: string;
  readonly googleAdsClientId?: string;
  readonly googleAdsClientSecret?: string;
}

/**
 * 8. Object Storage Configuration
 */
export interface StorageConfig {
  readonly driver: StorageDriver;
  readonly bucketName?: string;
}

/**
 * 9. Email & Notification Configuration
 */
export interface EmailConfig {
  readonly driver: EmailDriver;
  readonly fromAddress: string;
}

/**
 * 10. Observability & Logging Configuration
 */
export interface ObservabilityConfig {
  readonly logLevel: LogLevel;
  readonly otelEnabled: boolean;
}

/**
 * Full Server Configuration (Strictly Server-Only)
 */
export interface ServerConfig {
  readonly app: AppCoreConfig;
  readonly database: DatabaseConfig;
  readonly redis: RedisConfig;
  readonly ai: AIConfig;
  readonly auth: AuthConfig;
  readonly payments: PaymentConfig;
  readonly advertising: AdvertisingConfig;
  readonly storage: StorageConfig;
  readonly email: EmailConfig;
  readonly observability: ObservabilityConfig;
}

/**
 * Public Client Configuration (Safe for Browser & Client Bundles)
 * Contains ONLY non-sensitive properties.
 */
export interface PublicClientConfig {
  readonly nodeEnv: AppEnvironment;
  readonly appName: string;
  readonly appUrl: string;
  readonly apiUrl: string;
  readonly paystackPublicKey?: string;
  readonly flutterwavePublicKey?: string;
}
