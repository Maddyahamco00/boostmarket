import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TestClock } from "../helpers/test-clock";
import { SystemStatusBuilder, TestEnvironmentBuilder } from "../helpers/test-builders";
import { validateEnvironment } from "@boost-market/config";

describe("Testing Foundation Helpers (Unit Tests)", () => {
  describe("TestClock (Deterministic Time)", () => {
    it("should return the exact fixed time upon construction", () => {
      // Given a fixed ISO timestamp
      const fixedIso = "2026-10-06T12:00:00.000Z";
      const clock = new TestClock(fixedIso);

      // Then the clock returns the identical timestamp
      assert.equal(clock.nowIso(), fixedIso);
      assert.equal(clock.nowMs(), new Date(fixedIso).getTime());
    });

    it("should advance time deterministically when advanceSeconds is invoked", () => {
      // Given a clock initialized at 12:00:00
      const clock = new TestClock("2026-10-06T12:00:00.000Z");

      // When advancing by 45 seconds
      clock.advanceSeconds(45);

      // Then the new timestamp reflects exactly 45 seconds forward
      assert.equal(clock.nowIso(), "2026-10-06T12:00:45.000Z");
    });
  });

  describe("SystemStatusBuilder (Test Data Builder Pattern)", () => {
    it("should build default healthy status when no custom options are specified", () => {
      // When building a default status
      const status = new SystemStatusBuilder().build();

      // Then default fields are applied
      assert.equal(status.status, "healthy");
      assert.equal(status.uptimeSeconds, 100);
      assert.equal(status.timestamp, "2026-10-06T00:00:00.000Z");
    });

    it("should override specific fields cleanly without mutating defaults", () => {
      // When overriding status and uptime
      const status = new SystemStatusBuilder()
        .withStatus("degraded")
        .withUptime(500)
        .build();

      // Then overridden values are applied
      assert.equal(status.status, "degraded");
      assert.equal(status.uptimeSeconds, 500);
    });
  });

  describe("TestEnvironmentBuilder", () => {
    it("should construct valid development environment that passes validation", () => {
      // Given a development test environment builder
      const env = new TestEnvironmentBuilder().build();

      // When validating through the configuration validator
      const result = validateEnvironment(env);

      // Then validation succeeds
      assert.equal(result.isSuccess, true);
      assert.equal(result.getValue().app.isDevelopment, true);
    });

    it("should construct valid production environment with required secrets", () => {
      // Given a production test environment builder
      const env = new TestEnvironmentBuilder().asProduction().build();

      // When validating
      const result = validateEnvironment(env);

      // Then validation succeeds with production flags
      assert.equal(result.isSuccess, true);
      assert.equal(result.getValue().app.isProduction, true);
    });
  });
});
