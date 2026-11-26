import { expect, it } from "vite-plus/test";
import { cliQuotaSource } from "./AntigravityCliLimits.ts";

it("keeps the host login separate and preserves zero remaining and unknown reset times", () => {
  const checkedAt = "2026-11-26T00:00:00.000Z";
  const bucket = {
    id: "3p-weekly",
    name: "Weekly",
    remaining_fraction: 0,
    window: "weekly",
    reset_time: "1970-01-01T00:00:00Z",
  };
  const json = JSON.stringify({
    status: "SUCCESS",
    command: {
      name: "usage",
      data: {
        groups: [
          {
            name: "Claude and GPT models",
            buckets: [bucket, { ...bucket, id: "unknown", remaining_fraction: undefined }],
          },
        ],
      },
    },
  });
  const source = cliQuotaSource(json, checkedAt);
  expect(source?.kind).toBe("antigravity-cli");
  expect(source?.accounts[0]?.usageLimits.windows).toEqual([
    {
      id: "3p-weekly",
      label: "Claude and GPT models · Weekly",
      kind: "weekly",
      usedPercent: 100,
      windowDurationMins: 10080,
    },
  ]);
  expect(cliQuotaSource('{"status":"ERROR"}', checkedAt)).toBeNull();
});
