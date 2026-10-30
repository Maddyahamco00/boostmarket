import { Controller, Get, Inject } from "@nestjs/common";
import { SystemStatus } from "@boost-market/shared";
import { ApiConfigService } from "./config/api-config.service";

export interface HealthResponse extends SystemStatus {
  environment: string;
}

@Controller("health")
export class HealthController {
  constructor(
    @Inject(ApiConfigService)
    // eslint-disable-next-line no-unused-vars
    private readonly configService: ApiConfigService
  ) {}

  @Get()
  getHealth(): HealthResponse {
    return {
      status: "healthy",
      environment: this.configService.app.nodeEnv,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}
