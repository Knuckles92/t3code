# Product analytics

This fork sends no telemetry. Data that used to leave the machine is cut off where it would leave,
so call sites stay the same as upstream and merges stay small:

- **Product events.** [`AnalyticsService`](../../apps/server/src/telemetry/AnalyticsService.ts) is
  a no-op: `record` returns `false`, so [agent feedback](../../apps/server/src/feedback/FeedbackStore.ts)
  stays saved locally and unsent.
- **Relay traces.** [`relayTracing.layer`](../../packages/shared/src/relayTracing.ts) never builds an
  exporter, for the server, desktop, web, and mobile alike, whatever trace URL or token is configured.
- **Mobile crash reports.** [`observe.ts`](../../apps/mobile/src/features/observability/observe.ts)
  keeps Expo Observe dispatch off, and its native endpoint in `app.config.ts` never resolves.

When merging upstream, keep these three cut-offs. A new path that sends data off the machine needs
the same treatment. User-configured OTLP export (Settings > Diagnostics) is the user's own receiver
and stays.
