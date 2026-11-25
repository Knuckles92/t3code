# t3code_with_addons

An unofficial, personal fork based on the [T3 Code](https://github.com/pingdotgg/t3code) source code.

> [!NOTE]
> This project is an **unofficial fork** and is not affiliated with, endorsed by, or maintained by T3 Tools, Inc. For the official releases, desktop installers, CLI, and mobile apps, see [pingdotgg/t3code](https://github.com/pingdotgg/t3code) and [t3.codes](https://t3.codes).

I maintain this fork primarily for my own personal use and periodically pull in updates from upstream `main`. If the changes here are useful to you too, you are welcome to use it or build from it.

## Differences from upstream `main`

This is a running list of the notable feature and behavior differences between this fork and upstream `main` (skipping small fixes and housekeeping):

- **Per-provider default permissions.** Set a default permission mode per provider instance across web, mobile, and server. New threads inherit the selected provider's default (with project-level overrides still taking precedence), and switching providers in the composer automatically applies the new provider's default when per-provider defaults are in effect.
- **Outbound telemetry stripped.** Product analytics (PostHog), relay connection traces, and mobile crash reports (Expo Observe / Axiom) are cut off where data would leave the machine. Agent feedback stays saved locally and is never sent, while optional user-configured OTLP export (**Settings > Maintenance > Diagnostics**) continues to work. See [Product usage data](./docs/user/telemetry.md) for details.

## Running this fork

Official installers (`t3.codes/download`, `npx t3@latest`, Homebrew, App Store, etc.) install upstream T3 Code and do not include the changes in this fork. To run this fork, build from source following the [development runbook](./docs/operations/00_development.md#first-checkout).

## Documentation

- [Install and first run](./docs/user/install.md)
- [Remote access from a phone or another machine](./docs/user/remote-access.md)
- [Permission modes](./docs/user/permission-modes.md)
- [Source control](./docs/user/source-control.md)
- [Connect outside agents over MCP](./docs/user/outside-agents.md)
- [Product usage data](./docs/user/telemetry.md)
- [FAQ](./docs/user/faq.md)

[All docs](./docs/README.md) has the full list. The [architecture overview](./docs/internals/01_architecture.md) explains how the codebase works.

## License and trademarks

The source code in this repository is licensed under the [MIT License](./LICENSE).

The MIT License applies **only to the source code**. T3 Code, T3 Connect, T3 Tools, and related logos and branding are trademarks of T3 Tools, Inc. See [TRADEMARK.md](./TRADEMARK.md) for the upstream trademark and branding policy.
