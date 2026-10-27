# Local Paraglide plugins

These upstream plugin bundles are kept in the repository so Paraglide can
compile translations without fetching plugins from a CDN during local startup.

- `plugin-message-format-4.5.5.js` — `@inlang/plugin-message-format` 4.5.5
- `plugin-m-function-matcher-2.2.6.js` — `@inlang/plugin-m-function-matcher` 2.2.6

Both bundles are distributed under the MIT License; see `LICENSE`.

The project settings reference these files from `project.inlang/settings.json`.
To update them, download each package's `dist/index.js` from jsDelivr at the
desired pinned version and update the file names and settings together.
