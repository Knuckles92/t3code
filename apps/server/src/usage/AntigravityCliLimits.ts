import {
  ProviderDriverKind,
  UsageLimitSourceId,
  type ServerProviderUsageWindow,
  type UsageLimitSourceSnapshot,
} from "@t3tools/contracts";
import { collectUint8StreamText } from "@t3tools/provider-core/server/collectStreamText";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as ChildProcess from "effect/process/ChildProcess";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import { AntigravityInstallation } from "../provider/AntigravityInstallation.ts";

const decode = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      status: Schema.Literal("SUCCESS"),
      command: Schema.Struct({
        name: Schema.Literal("usage"),
        data: Schema.Struct({
          groups: Schema.Array(
            Schema.Struct({
              name: Schema.NonEmptyString,
              buckets: Schema.Array(
                Schema.Struct({
                  id: Schema.NonEmptyString,
                  window: Schema.String,
                  name: Schema.String,
                  remaining_fraction: Schema.optional(Schema.Number),
                  reset_time: Schema.optional(Schema.String),
                }),
              ),
            }),
          ),
        }),
      }),
    }),
  ),
);

export function cliQuotaSource(json: string, checkedAt: string): UsageLimitSourceSnapshot | null {
  const reply = decode(json);
  if (Option.isNone(reply)) return null;
  const windows: ServerProviderUsageWindow[] = [];
  for (const group of reply.value.command.data.groups) {
    for (const bucket of group.buckets) {
      const remaining = bucket.remaining_fraction;
      if (remaining === undefined || remaining < 0 || remaining > 1) continue;
      const kind =
        bucket.window === "5h" ? "session" : bucket.window === "weekly" ? "weekly" : "other";
      const reset = DateTime.make(bucket.reset_time ?? "");
      windows.push({
        id: bucket.id,
        label: `${group.name} · ${kind === "session" ? "5-hour" : kind === "weekly" ? "Weekly" : bucket.name}`,
        kind,
        usedPercent: (1 - remaining) * 100,
        ...(Option.isSome(reset) && DateTime.toEpochMillis(reset.value) > 0
          ? { resetsAt: DateTime.formatIso(reset.value) }
          : {}),
        ...(kind === "session"
          ? { windowDurationMins: 300 }
          : kind === "weekly"
            ? { windowDurationMins: 10080 }
            : {}),
      });
    }
  }
  if (!windows.length) return null;
  return {
    id: UsageLimitSourceId.make("antigravity-cli"),
    kind: "antigravity-cli",
    label: "Antigravity CLI",
    checkedAt,
    accounts: [
      {
        id: "Local CLI account",
        driver: ProviderDriverKind.make("antigravity"),
        usageLimits: { checkedAt, windows },
      },
    ],
  };
}

export const makeCliQuotaReader = Effect.gen(function* () {
  const installation = yield* AntigravityInstallation;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const fs = yield* FileSystem.FileSystem;
  const read = Effect.gen(function* () {
    const executable = yield* installation.acquire();
    // The host CLI login may differ from every T3 instance. Keep this read outside project directories.
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-agy-usage-" });
    const child = yield* spawner.spawn(
      ChildProcess.make(
        executable.executablePath,
        ["-p", "/usage", "--output-format", "json", "--print-timeout", "12s"],
        {
          cwd,
          stdin: "ignore",
          stderr: "ignore",
          extendEnv: true,
          env: { AGY_CLI_DISABLE_AUTO_UPDATE: "true", BROWSER: "false" },
        },
      ),
    );
    const output = yield* collectUint8StreamText({ stream: child.stdout, maxBytes: 256 * 1024 });
    if (Number(yield* child.exitCode) !== 0 || output.truncated) return null;
    return cliQuotaSource(output.text, DateTime.formatIso(yield* DateTime.now));
  }).pipe(
    Effect.scoped,
    Effect.timeout("20 seconds"),
    Effect.orElseSucceed(() => null),
  );
  return yield* Effect.cachedWithTTL(read, "30 seconds");
});
