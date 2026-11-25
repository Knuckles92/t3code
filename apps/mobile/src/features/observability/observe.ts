import Constants from "expo-constants";
import { Observe } from "expo-observe";

// Importing expo-observe installs its global JS error handler. This fork never dispatches reports.
const appVariant: unknown = Constants.expoConfig?.extra?.appVariant;

export const crashReportingAvailable: boolean = false;

export async function setCrashReportsEnabled(_enabled: boolean) {
  Observe.configure({
    dispatchingEnabled: false,
    ...(typeof appVariant === "string" ? { environment: appVariant } : {}),
  });
}

void setCrashReportsEnabled(false);
