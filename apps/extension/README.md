# Extension module

**Runtime/build owner: Person 3. UI owner: Kripa.** Read [Person 3 prompts](../../teams/03_extension.md) and [contracts](../../docs/contracts.md).

Person 3 owns manifest, HTML entrypoints, bundler, background, content, overlay, adapters, and tests. Kripa exclusively owns src/popup and src/options. Agree on UI mount exports before editing either side.

Bundle worker as an extension module and content as a standalone injected bundle. Copy HTML, CSS, icons, and manifest into dist. Never ship development-server imports or remotely executed scripts. Load this production dist unpacked.

Core checks: user-enable, repeated injection, cleanup, two-page discovery, cancellation, at-most-once action, keyboard/native fallback, and worker restart. The local pointer engine must work without the service.

Fill exact build/load/reload commands and supported Chrome version after verification. This scaffold contains instructions, not an installed extension.
