import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApiConfigService } from "../../apps/api/src/config/api-config.service";

describe("NestJS ApiConfigService (Integration Tests)", () => {
  it("should initialize ApiConfigService and supply validated environment configuration", () => {
    // Given the ApiConfigService instance
    const configService = new ApiConfigService();

    // Then it exposes strongly-typed getters for subsystems
    assert.ok(configService.app);
    assert.ok(configService.database);
    assert.ok(configService.redis);
    assert.ok(configService.ai);
    assert.ok(configService.payments);

    // And application defaults match workspace expectations
    assert.equal(configService.app.appName, "Boost Market");
    assert.equal(typeof configService.app.apiPort, "number");
    assert.ok(configService.app.apiPort >= 1024 && configService.app.apiPort <= 65535);
  });

  it("should supply public client configuration free of sensitive backend secrets", () => {
    const configService = new ApiConfigService();
    const publicConfig = configService.publicClientConfig;

    // Verify public properties exist
    assert.equal(typeof publicConfig.appName, "string");
    assert.equal(typeof publicConfig.nodeEnv, "string");

    // Verify backend secrets are not present on public client config
    const publicKeys = Object.keys(publicConfig);
    assert.equal(publicKeys.includes("databaseUrl"), false);
    assert.equal(publicKeys.includes("geminiApiKey"), false);
    assert.equal(publicKeys.includes("paystackSecretKey"), false);
    assert.equal(publicKeys.includes("jwtSecret"), false);
  });
});
