<p align="center">
  <img src="SafariWebExtension/icons/icon-256.png" width="160" height="160" alt="DUYO app icon">
</p>

# DUYO

**Why pay for pixels?**

DUYO is a free, MIT-licensed Safari web extension exploring wider web pages on iPhone Duo. Built with SwiftUI and plain JavaScript. No ads, subscriptions, in-app purchases, accounts, product servers, or analytics SDKs.

> **Development build, not a finished App Store release.** Controlled Duo simulator pages have passed rendering, button taps, horizontal scroll control, pinch zoom, restoration, and display-transition checks. General website compatibility and physical-device testing remain incomplete.

## Status

The current development build includes global automatic application and an optional translucent edge arrow. Both switches default to on. No per-site setup is required. The button appears when the tested outer-display geometry has expansion space, and disappears on the full inner display. Safari must grant website access first.

Left-edge expansion is currently unavailable in this build. In unsupported orientations, DUYO restores its changes and hides the arrow without changing your saved preferences. When supported conditions return, it follows the existing automatic setting; manual OFF remains OFF.

The automatic path defaults to the protected-background prototype and reuses your selected mode. The prototype now detects full-width section backgrounds and preserves their text layout. Broader image detection, site compatibility, and final product modes are still in development. Narrow inner-display windows and unusual viewport settings need further testing.

The popup offers **Full Width** (widens the body), **Protected background** (preserves text width), and **OFF**. Full Width can place content behind Safari controls. Your chosen mode is reused by automatic application and the floating arrow. Smart mode remains planned. See [current work and verified results](docs/harness/STATE.md).

## Build and test

You need Xcode with an iOS simulator runtime for the app. Fast checks also need Node.js 18+, Python 3, Git, and Ruby with Psych.

Build, install, and launch the app in Device Hub:

```sh
bash scripts/run-simulator.sh
```

Run checks separately (`check-fast.sh` does not build or launch the app):

```sh
bash scripts/check-fast.sh
bash scripts/check-full.sh
```

The run script selects a booted iPhone Duo, or boots the only installed Duo. If multiple Duo simulators are available, select one with `SIMULATOR_UDID=<device-uuid> bash scripts/run-simulator.sh` (the same variable works for full checks). Missing tools/runtimes produce a `BLOCKED` message. Full checks also build and launch the app before running Safari tests.

Open `DUYO/DUYO.xcodeproj` in Xcode. The project uses `com.aeogae.DUYO` for development. No personal signing team is included; select your own team and unique bundle identifiers before physical-device installation or distribution.

Enable DUYO in Safari settings and allow access to **All Websites**. Automatic protected-background application needs no per-site selection. On the outer display, the floating arrow expands or restores the current page. It sits at the screen’s vertical center on the expansion edge, stays in the same position when applied or restored, and reverses its arrow direction. It hides on the inner display. Reload tabs that were already open before enabling or updating DUYO.

Open DUYO from Safari's page menu to change the global switches or run a manual experiment. **OFF — Restore page** restores the current page; automatic application remains enabled for future visits unless you turn its switch off. Manual document-width experiments can overlap Safari controls.

Full checks require an installed Duo runtime and DUYO enabled in Safari. Unrelated booted simulators are ignored. Use a dedicated simulator: the UI tests can grant website access and change the global switches, then leave automatic application and floating controls enabled. They build and install the app, compare installed resources with source, and exercise actual Safari. Skipped rendering checks remain unverified.

## Archive

Select the **DUYO** scheme and **Any iOS Device (arm64)** as the run destination, then choose **Product → Archive**. Archive is unavailable when a simulator is selected. The shared scheme archives the Release configuration. App and extension targets need your signing team for a signed archive. App Store export and upload are separate steps.

## Project layout

| Path | Purpose |
| --- | --- |
| `DUYO/` | SwiftUI app, native extension, and Xcode project |
| `SafariWebExtension/` | Popup and layout experiments |
| `Tests/` | Unit tests, controlled pages, and Safari UI tests |
| `scripts/` | Fast, full, and harness checks |
| `CLAUDE.md`, `.claude/` | Project development harness |
| `docs/` | Decisions, evidence, limitations, and session state |

Public documentation and the base UI use English. Existing technical and harness notes use Korean. Japanese and Korean product localization are planned.

## Contributing

Bug reports and focused contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and run relevant checks. Follow [SECURITY.md](SECURITY.md) for vulnerabilities; do not post browsing data or credentials.

- [Testing and simulator setup](docs/technical/TEST_STRATEGY.md)
- [Architecture decisions](docs/adr/)
- [Harness and Ponytail setup](docs/harness/CONFIGURATION.md)
- [Privacy](PRIVACY.md) · [Changelog](CHANGELOG.md)

## Support

DUYO will remain free. Donations are optional and do not unlock features.

[A Duo for Duyo? Start with a coffee. ☕](https://buymeacoffee.com/duyo)

## License

[MIT](LICENSE) © 2026 Duyo Son.
