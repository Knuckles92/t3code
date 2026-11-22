import {
  ProviderDriverKind,
  ProviderInstanceId,
  type ManagedPolicySummary,
  type ServerSettings,
} from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  buildProviderDefaultPermissionsMenuAction,
  parseProviderDefaultPermissionsMenuAction,
  planProviderDefaultRuntimeModeMutation,
} from "./provider-default-permissions";

const codexId = ProviderInstanceId.make("codex");
const codexDriver = ProviderDriverKind.make("codex");

describe("provider-default-permissions", () => {
  it("builds a submenu filtered to supported modes and managed ceilings", () => {
    const policy: ManagedPolicySummary = {
      organization: "Example Corp",
      lockedSettings: [],
      limits: { maxRuntimeMode: "auto-accept-edits" },
    };
    const action = buildProviderDefaultPermissionsMenuAction({
      instanceId: codexId,
      currentMode: undefined,
      environmentDefaultMode: "auto-accept-edits",
      supportedRuntimeModes: ["approval-required", "auto-accept-edits", "full-access"],
      policy,
    });

    expect(action.subactions?.map((entry) => entry.id)).toEqual([
      "defaultRuntimeMode:default",
      "defaultRuntimeMode:approval-required",
      "defaultRuntimeMode:auto-accept-edits",
      "defaultRuntimeMode:full-access",
    ]);
    expect(action.subactions?.[0]?.state).toBe("on");
    expect(action.subactions?.[3]?.attributes?.disabled).toBe(true);
  });

  it("parses menu actions back into runtime modes or inherit", () => {
    expect(parseProviderDefaultPermissionsMenuAction("defaultRuntimeMode:default")).toEqual({
      matched: true,
      mode: null,
    });
    expect(parseProviderDefaultPermissionsMenuAction("defaultRuntimeMode:auto")).toEqual({
      matched: true,
      mode: "auto",
    });
    expect(parseProviderDefaultPermissionsMenuAction("edit")).toEqual({ matched: false });
  });

  it("plans upsert mutations preserving existing fields and honoring managed locks", () => {
    const providerInstances: ServerSettings["providerInstances"] = {
      [codexId]: {
        driver: codexDriver,
        displayName: "Work Codex",
        enabled: true,
      },
    };
    const setPlan = planProviderDefaultRuntimeModeMutation({
      providerInstances,
      policy: undefined,
      instanceId: codexId,
      driver: codexDriver,
      mode: "approval-required",
    });
    expect(setPlan).toEqual({
      mutation: {
        operation: "upsert",
        instanceId: codexId,
        instance: {
          driver: codexDriver,
          displayName: "Work Codex",
          enabled: true,
          defaultRuntimeMode: "approval-required",
        },
      },
    });

    const clearPlan = planProviderDefaultRuntimeModeMutation({
      providerInstances: {
        [codexId]: {
          driver: codexDriver,
          displayName: "Work Codex",
          enabled: true,
          defaultRuntimeMode: "approval-required",
        },
      },
      policy: undefined,
      instanceId: codexId,
      driver: codexDriver,
      mode: null,
    });
    expect(clearPlan).toEqual({
      mutation: {
        operation: "upsert",
        instanceId: codexId,
        instance: {
          driver: codexDriver,
          displayName: "Work Codex",
          enabled: true,
        },
      },
    });

    const lockedPlan = planProviderDefaultRuntimeModeMutation({
      providerInstances,
      policy: {
        organization: "Example Corp",
        lockedSettings: ["defaultRuntimeMode"],
      },
      instanceId: codexId,
      driver: codexDriver,
      mode: "full-access",
    });
    expect(lockedPlan).toEqual({ error: "Managed by Example Corp." });
  });
});
