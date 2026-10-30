import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ApiConfigService } from "./config/api-config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const configService = app.get(ApiConfigService);
  const port = configService.app.apiPort;

  await app.listen(port);
  console.log(`Boost Market API is running in [${configService.app.nodeEnv}] mode on: http://localhost:${port}`);
}

// Allow starting directly if invoked as main module
if (require.main === module) {
  bootstrap();
}

export { bootstrap };
