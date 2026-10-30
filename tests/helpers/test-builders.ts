import { SystemStatus } from "@boost-market/shared";

/**
 * Test Data Builder for SystemStatus objects.
 * Demonstrates the Builder pattern for readable, maintainable test data generation.
 */
export class SystemStatusBuilder {
  private _status: "healthy" | "degraded" | "unhealthy" = "healthy";
  private _timestamp: string = "2026-10-06T00:00:00.000Z";
  private _uptimeSeconds: number = 100;

  withStatus(status: "healthy" | "degraded" | "unhealthy"): this {
    this._status = status;
    return this;
  }

  withTimestamp(timestamp: string): this {
    this._timestamp = timestamp;
    return this;
  }

  withUptime(seconds: number): this {
    this._uptimeSeconds = seconds;
    return this;
  }

  build(): SystemStatus {
    return Object.freeze({
      status: this._status,
      timestamp: this._timestamp,
      uptimeSeconds: this._uptimeSeconds,
    });
  }
}

/**
 * Test Environment Dictionary Builder.
 * Pre-populates standard valid development environment variables.
 */
export class TestEnvironmentBuilder {
  private _env: Record<string, string | undefined> = {
    NODE_ENV: "development",
    APP_NAME: "Boost Market Test",
    PORT: "3000",
    API_PORT: "3001",
    APP_URL: "http://localhost:3000",
    API_URL: "http://localhost:3001",
  };

  asProduction(): this {
    this._env.NODE_ENV = "production";
    this._env.DATABASE_URL = "postgresql://test_user:test_password@localhost:5432/boost_market_test";
    this._env.JWT_SECRET = "test_production_jwt_secret_must_be_at_least_32_characters";
    return this;
  }

  asTest(): this {
    this._env.NODE_ENV = "test";
    return this;
  }

  withVariable(key: string, value: string | undefined): this {
    this._env[key] = value;
    return this;
  }

  withoutVariable(key: string): this {
    delete this._env[key];
    return this;
  }

  build(): Record<string, string | undefined> {
    return { ...this._env };
  }
}
