[🇨🇿 Česky](README.md) | [🇬🇧 **English**](README_EN.md)

# Shared App Core Playground 1.0.0

## Required dependency: Hacesoft Core

**Playground does not work without Core installed and enabled.** It requires **Core 0.18.0-dev.16 or newer**. Core provides the shared services and components demonstrated by Playground.

**Core repository: [https://github.com/hacesoft/core](https://github.com/hacesoft/core)**

Install and enable Core first, following its installation guide. Then install Playground. Core is a separate application and is not bundled in this archive.

A separate demo/test application for Nextcloud 35 and Shared App Core >= 0.18.0-dev.16. Explore layout, forms, editor, maps, lists and other Core services. Install separately from Core.

Extract the complete package and run `sudo sh install.sh`. It includes prebuilt runtime, sources, documentation and `uninstall.sh`. Rebuild with `sh build-release.sh`. Local automated tests do not constitute NAS runtime qualification.

## Concurrent editing

Two editors share an in-memory test document. Save A, then save changed B with its stale revision to trigger a conflict. Reload, keep editing, compare/merge or preserve a test copy. Separate edits can merge; overlapping changes are not silently overwritten. Revision watching preserves unsaved text.

The demo uses real `core.concurrency` helpers but simulates persistence and HTTP 409 in one browser page. It is not a server-side file lock or a real two-user integration test. Consumers must implement atomic compare-and-swap and permission checks in their backend. Reloading discards the test document and copies.

[Core](https://github.com/hacesoft/core) · [Documentation](docs/) · [License](LICENSE)
