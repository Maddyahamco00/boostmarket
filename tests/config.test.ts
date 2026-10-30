import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateEnvironment, extractPublicConfig } from "@boost-market/config";

describe("Boost Market Configuration & Environment Architecture Tests", () => {
  it("should successfully validate standard development configuration", () => {
    const env = {
      NODE_ENV: "development",
      APP_NAME: "Boost Market Dev",
      PORT: "3000",
      API_PORT: "3001",
    };

    const result = validateEnvironment(env);
    assert.equal(result.isSuccess, true);

    const config = result.getValue();
    assert.equal(config.app.nodeEnv, "development");
    assert.equal(config.app.appName, "Boost Market Dev");
    assert.equal(config.app.webPort, 3000);
    assert.equal(config.app.apiPort, 3001);
    assert.equal(config.app.isProduction, false);
    assert.equal(config.app.isDevelopment, true);
  });

  it("should fail fast if required production variables (DATABASE_URL, JWT_SECRET) are missing", () => {
    const prodEnvWithoutSecrets = {
      NODE_ENV: "production",
      PORT: "3000",
      API_PORT: "3001",
    };

    const result = validateEnvironment(prodEnvWithoutSecrets);
    assert.equal(result.isFailure, true);

    const error = result.getError();
    assert.match(error.message, /DATABASE_URL is required in production/);
    assert.match(error.message, /JWT_SECRET is required/);
    assert.ok(error.failedKeys.includes("DATABASE_URL"));
    assert.ok(error.failedKeys.includes("JWT_SECRET"));
  });

  it("should fail validation with clear error if port is out of valid range", () => {
    const env = {
      NODE_ENV: "development",
      API_PORT: "999999", // Invalid port > 65535
    };

    const result = validateEnvironment(env);
    assert.equal(result.isFailure, true);
    assert.match(result.getError().message, /API_PORT must be an integer between 1024 and 65535/);
  });

  it("should fail validation with clear error if URL is malformed", () => {
    const env = {
      NODE_ENV: "development",
      APP_URL: "not-a-valid-url",
    };

    const result = validateEnvironment(env);
    assert.equal(result.isFailure, true);
    assert.match(result.getError().message, /APP_URL must be a valid URL/);
  });

  it("should permit optional configuration (Redis, AI keys, Ad credentials) to be absent in dev", () => {
    const minimalEnv = {
      NODE_ENV: "development",
    };

    const result = validateEnvironment(minimalEnv);
    assert.equal(result.isSuccess, true);

    const config = result.getValue();
    assert.equal(config.database.url, undefined);
    assert.equal(config.ai.geminiApiKey, undefined);
    assert.equal(config.advertising.metaAppId, undefined);
  });

  it("should guarantee that extractPublicConfig contains ZERO backend secrets", () => {
    const fullServerEnv = {
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://secret_user:super_secret_password@db.boostmarket.ng:5432/db",
      GEMINI_API_KEY: "AIzaSy_SECRET_GEMINI_KEY",
      PAYSTACK_SECRET_KEY: "sk_live_SECRET_PAYSTACK_KEY",
      PAYSTACK_PUBLIC_KEY: "pk_live_PUBLIC_KEY",
      META_APP_SECRET: "SECRET_META_APP_SECRET",
      JWT_SECRET: "SECRET_JWT_SIGNING_KEY_32_CHARS_LONG",
    };

    const result = validateEnvironment(fullServerEnv);
    assert.equal(result.isSuccess, true);

    const serverConfig = result.getValue();
    const publicConfig = extractPublicConfig(serverConfig);

    // Verify public properties exist
    assert.equal(publicConfig.nodeEnv, "development");
    assert.equal(publicConfig.paystackPublicKey, "pk_live_PUBLIC_KEY");

    // Verify secrets are NOT on the public object
    const publicKeys = Object.keys(publicConfig);
    assert.equal(publicKeys.includes("databaseUrl"), false);
    assert.equal(publicKeys.includes("geminiApiKey"), false);
    assert.equal(publicKeys.includes("paystackSecretKey"), false);
    assert.equal(publicKeys.includes("metaAppSecret"), false);
    assert.equal(publicKeys.includes("jwtSecret"), false);

    const stringified = JSON.stringify(publicConfig);
    assert.equal(stringified.includes("super_secret_password"), false);
    assert.equal(stringified.includes("AIzaSy_SECRET_GEMINI_KEY"), false);
    assert.equal(stringified.includes("sk_live_SECRET_PAYSTACK_KEY"), false);
    assert.equal(stringified.includes("SECRET_META_APP_SECRET"), false);
  });

  it("should default to mock AI and payment providers in test environment", () => {
    const testEnv = {
      NODE_ENV: "test",
    };

    const result = validateEnvironment(testEnv);
    assert.equal(result.isSuccess, true);

    const config = result.getValue();
    assert.equal(config.app.isTest, true);
    assert.equal(config.ai.defaultProvider, "mock");
    assert.equal(config.payments.defaultProvider, "mock");
    assert.equal(config.email.driver, "mock");
  });

  it("should never expose secret values in error messages", () => {
    const invalidSecretEnv = {
      NODE_ENV: "production",
      JWT_SECRET: "short", // Invalid: < 32 chars in production
      DATABASE_URL: "",
    };

    const result = validateEnvironment(invalidSecretEnv);
    assert.equal(result.isFailure, true);

    const errorMessage = result.getError().message;
    // Error must identify the key, but never print the actual secret value
    assert.match(errorMessage, /JWT_SECRET is required and must be at least 32 characters/);
    assert.equal(errorMessage.includes("short"), false);
  });
});
