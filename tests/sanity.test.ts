import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Result } from "@boost-market/shared";
import { WORKSPACE_CONFIG } from "@boost-market/config";

describe("Boost Market Foundation Sanity Tests", () => {
  it("should verify Result.ok behavior", () => {
    const result = Result.ok("boost-active");
    assert.equal(result.isSuccess, true);
    assert.equal(result.isFailure, false);
    assert.equal(result.getValue(), "boost-active");
  });

  it("should verify Result.fail behavior", () => {
    const result = Result.fail("invalid-input");
    assert.equal(result.isSuccess, false);
    assert.equal(result.isFailure, true);
    assert.equal(result.getError(), "invalid-input");
  });

  it("should verify workspace defaults", () => {
    assert.equal(WORKSPACE_CONFIG.APP_NAME, "Boost Market");
    assert.equal(WORKSPACE_CONFIG.DEFAULT_WEB_PORT, 3000);
    assert.equal(WORKSPACE_CONFIG.DEFAULT_API_PORT, 3001);
    assert.equal(WORKSPACE_CONFIG.DEFAULT_CURRENCY, "NGN");
  });
});
