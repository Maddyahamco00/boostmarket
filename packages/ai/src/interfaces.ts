/**
 * Provider-agnostic AI interface definitions.
 * Implementations will be plugged in via adapters in later epics.
 */
export interface AIModelMetadata {
  providerName: string;
  modelIdentifier: string;
}

export interface IAIProviderContract {
  readonly metadata: AIModelMetadata;
  isAvailable(): Promise<boolean>;
}
