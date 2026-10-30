import { Module } from "@nestjs/common";
import { ApiConfigModule } from "./config/api-config.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [ApiConfigModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
