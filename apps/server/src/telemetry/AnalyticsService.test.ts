import { assert, it } from "@effect/vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as HttpClient from "effect/http/HttpClient";

import * as AnalyticsService from "./AnalyticsService.ts";

it.effect("drops product events and feedback even with an ingest endpoint configured", () =>
  Effect.gen(function* () {
    const analytics = yield* AnalyticsService.AnalyticsService;
    assert.isFalse(yield* analytics.record("turn.completed"));
    assert.isFalse(yield* analytics.record("agent.feedback", {}, { anonymous: true }));
    yield* analytics.flush;
  }).pipe(
    Effect.provide(AnalyticsService.layer),
    Effect.provideService(
      HttpClient.HttpClient,
      HttpClient.make(() => Effect.die("unexpected outbound analytics request")),
    ),
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromUnknown({
          T3CODE_TELEMETRY_ENABLED: true,
          T3CODE_TELEMETRY_HOST: "http://localhost",
          T3CODE_TELEMETRY_KEY: "test",
        }),
      ),
    ),
  ),
);
