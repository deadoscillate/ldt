import { APP_VERSION } from "@/lib/app/version";

export interface ClientEventMetadata {
  [key: string]: string | number | boolean | null;
}

export interface ClientTelemetryIdentity {
  clientId: string;
  sessionId: string;
}

export interface ClientEventEnvironment extends ClientTelemetryIdentity {
  pagePath: string;
}

export interface ClientEventRequest {
  eventName: string;
  source: string;
  metadata: ClientEventMetadata;
}

export function buildClientEventPayload(input: {
  eventName: string;
  source?: string;
  metadata?: ClientEventMetadata;
  environment: ClientEventEnvironment;
}): ClientEventRequest {
  return {
    eventName: input.eventName,
    source: input.source ?? "landing-page",
    metadata: {
      ...(input.metadata ?? {}),
      clientId: input.environment.clientId,
      sessionId: input.environment.sessionId,
      pagePath: input.environment.pagePath,
      appVersion: APP_VERSION,
    },
  };
}
