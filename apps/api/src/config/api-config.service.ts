import { Injectable } from "@nestjs/common";
import {
  ServerConfig,
  AppCoreConfig,
  DatabaseConfig,
  RedisConfig,
  AIConfig,
  AuthConfig,
  PaymentConfig,
  AdvertisingConfig,
  StorageConfig,
  EmailConfig,
  ObservabilityConfig,
  PublicClientConfig,
  validateEnvironment,
  extractPublicConfig,
} from "@boost-market/config";

@Injectable()
export class ApiConfigService {
  private readonly _config: ServerConfig;

  constructor() {
    const result = validateEnvironment(process.env);
    if (result.isFailure) {
      const error = result.getError();
      // Fail fast immediately at startup with sanitized, actionable error
      throw new Error(`[ApiConfigService] Fatal Configuration Error:\n${error.message}`);
    }
    this._config = result.getValue();
  }

  get config(): ServerConfig {
    return this._config;
  }

  get app(): AppCoreConfig {
    return this._config.app;
  }

  get database(): DatabaseConfig {
    return this._config.database;
  }

  get redis(): RedisConfig {
    return this._config.redis;
  }

  get ai(): AIConfig {
    return this._config.ai;
  }

  get auth(): AuthConfig {
    return this._config.auth;
  }

  get payments(): PaymentConfig {
    return this._config.payments;
  }

  get advertising(): AdvertisingConfig {
    return this._config.advertising;
  }

  get storage(): StorageConfig {
    return this._config.storage;
  }

  get email(): EmailConfig {
    return this._config.email;
  }

  get observability(): ObservabilityConfig {
    return this._config.observability;
  }

  get publicClientConfig(): PublicClientConfig {
    return extractPublicConfig(this._config);
  }
}
