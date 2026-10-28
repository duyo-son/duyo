# Contributing to DUYO

Keep changes small, accessible, and easy to restore. Use SwiftUI and platform APIs before adding dependencies.

1. Read `CLAUDE.md` and `docs/harness/STATE.md`, then only the files relevant to your task.
2. Describe the problem and a reproducible case. Discuss major architectural or permission changes before implementation.
3. Run `bash scripts/check-fast.sh`. For layout, extension, or native changes, run the relevant Safari/Xcode checks in `docs/technical/TEST_STRATEGY.md`.
4. Submit a focused pull request with the behavior change, test evidence, and remaining limitations.

Use English for public documentation, base UI strings, identifiers, and APIs. Existing technical/harness notes use Korean. Keep discussions respectful and constructive.

Do not commit signing identities, certificates, provisioning profiles, tokens, personal Xcode settings, browsing records, or simulator artifacts. Do not add servers, analytics, ads, paid features, or remote executable scripts.

Chromium results do not prove Safari behavior. Mark unavailable checks as unverified. Do not claim support for an API or device state without evidence.

Contributions use the project's [MIT license](LICENSE). Donations are never required to contribute or receive fixes.
