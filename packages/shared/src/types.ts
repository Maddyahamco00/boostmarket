/**
 * Core primitive types shared across web, api, and worker tiers.
 */
export type Environment = "development" | "staging" | "production" | "test";

export interface SystemStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptimeSeconds: number;
}
