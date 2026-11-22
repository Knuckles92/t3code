import type { MenuAction } from "@react-native-menu/menu";
import {
  isManagedSettingPath,
  type ManagedPolicySummary,
  type ProviderDriverKind,
  type ProviderInstanceConfig,
  type ProviderInstanceId,
  type ProviderInstanceMutation,
  type RuntimeMode,
  type ServerProvider,
  type ServerSettings,
} from "@t3tools/contracts";
import { msg } from "gt-react-native";

import { m, type MessageResolver } from "../../i18n/messages";
import {
  RUNTIME_MODE_CHOICES,
  runtimeModeChoicesForSupportedModes,
  withManagedRuntimeModeLimits,
} from "../threads/thread-settings-options";

const PERMISSION_ACTION_PREFIX = "defaultRuntimeMode:";
const INHERIT_ACTION_ID = `${PERMISSION_ACTION_PREFIX}default`;

export function runtimeModeLabel(mode: RuntimeMode, resolve: MessageResolver = m): string {
  const choice = RUNTIME_MODE_CHOICES.find((candidate) => candidate.mode === mode);
  return choice ? resolve(choice.label) : mode;
}

function isProviderDefaultPermissionsLocked(
  policy: ManagedPolicySummary | undefined,
  instanceId: ProviderInstanceId,
): boolean {
  return (
    policy !== undefined &&
    (isManagedSettingPath(policy, "defaultRuntimeMode") ||
      isManagedSettingPath(policy, `providerInstances.${instanceId}`))
  );
}

export function parseProviderDefaultPermissionsMenuAction(
  actionId: string,
): { readonly matched: false } | { readonly matched: true; readonly mode: RuntimeMode | null } {
  if (!actionId.startsWith(PERMISSION_ACTION_PREFIX)) {
    return { matched: false };
  }
  if (actionId === INHERIT_ACTION_ID) {
    return { matched: true, mode: null };
  }
  const value = actionId.slice(PERMISSION_ACTION_PREFIX.length);
  const choice = RUNTIME_MODE_CHOICES.find((candidate) => candidate.mode === value);
  return choice ? { matched: true, mode: choice.mode } : { matched: false };
}

export function buildProviderDefaultPermissionsMenuAction(input: {
  readonly instanceId: ProviderInstanceId;
  readonly currentMode: RuntimeMode | undefined;
  readonly environmentDefaultMode: RuntimeMode;
  readonly supportedRuntimeModes: ServerProvider["supportedRuntimeModes"];
  readonly policy: ManagedPolicySummary | undefined;
  readonly disabled?: boolean;
  readonly resolve?: MessageResolver;
}): MenuAction {
  const resolve = input.resolve ?? m;
  const locked = isProviderDefaultPermissionsLocked(input.policy, input.instanceId);
  const disabled = Boolean(input.disabled) || locked;
  const baseChoices = runtimeModeChoicesForSupportedModes(input.supportedRuntimeModes);
  const choicesWithCurrent =
    input.currentMode !== undefined &&
    !baseChoices.some((choice) => choice.mode === input.currentMode)
      ? [
          ...baseChoices,
          ...RUNTIME_MODE_CHOICES.filter((choice) => choice.mode === input.currentMode),
        ]
      : baseChoices;
  const choices = withManagedRuntimeModeLimits(choicesWithCurrent, [input.policy], resolve);
  const defaultLabel = runtimeModeLabel(input.environmentDefaultMode, resolve);

  return {
    id: "defaultRuntimeMode",
    title: resolve(msg("Default permissions")),
    subtitle:
      input.currentMode !== undefined
        ? runtimeModeLabel(input.currentMode, resolve)
        : resolve(msg("Default ({mode})", { mode: defaultLabel })),
    image: "lock.shield",
    ...(disabled ? { attributes: { disabled: true } } : {}),
    subactions: [
      {
        id: INHERIT_ACTION_ID,
        title: resolve(msg("Use default ({mode})", { mode: defaultLabel })),
        ...(input.currentMode === undefined ? { state: "on" as const } : {}),
        ...(disabled ? { attributes: { disabled: true } } : {}),
      },
      ...choices.map((choice) => ({
        id: `${PERMISSION_ACTION_PREFIX}${choice.mode}`,
        title: resolve(choice.label),
        ...(choice.disabledReason ? { subtitle: choice.disabledReason } : {}),
        ...(input.currentMode === choice.mode ? { state: "on" as const } : {}),
        ...(disabled || choice.disabledReason !== undefined
          ? { attributes: { disabled: true } }
          : {}),
      })),
    ],
  };
}

export function planProviderDefaultRuntimeModeMutation(input: {
  readonly providerInstances: ServerSettings["providerInstances"];
  readonly policy: ManagedPolicySummary | undefined;
  readonly instanceId: ProviderInstanceId;
  readonly driver: ProviderDriverKind;
  readonly mode: RuntimeMode | null;
  readonly resolve?: MessageResolver;
}): { readonly mutation: ProviderInstanceMutation } | { readonly error: string } {
  const resolve = input.resolve ?? m;
  if (input.policy && isProviderDefaultPermissionsLocked(input.policy, input.instanceId)) {
    return {
      error: resolve(
        msg("Managed by {organization}.", { organization: input.policy.organization }),
      ),
    };
  }
  const current: ProviderInstanceConfig = Object.hasOwn(input.providerInstances, input.instanceId)
    ? input.providerInstances[input.instanceId]!
    : { driver: input.driver };
  const { defaultRuntimeMode: _omit, ...rest } = current;
  const instance: ProviderInstanceConfig =
    input.mode !== null ? { ...rest, defaultRuntimeMode: input.mode } : rest;
  return {
    mutation: { operation: "upsert", instanceId: input.instanceId, instance },
  };
}
