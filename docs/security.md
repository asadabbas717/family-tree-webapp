# Security and privacy

Family data and backups contain personal information. Data is stored per browser origin in plaintext localStorage. Exports are plaintext JSON. Device access, same-origin scripts and browser extensions may access it. Keep backups private and protect the device. No authentication, network API, analytics, photo uploads, SQL or server-side command execution exists in this application; CSRF/CORS/rate limits are not relevant to its current scope.

The parser treats backups and saved storage as untrusted: it validates schema version, fields, enums, IDs, dates, link references, duplicates and ancestry cycles. Empty/reserved dictionary keys are rejected; references must be own properties. Iterative cycle detection avoids deep-stack failures. Names and notes render as escaped React text; no raw HTML insertion is used. Imports require explicit replacement confirmation and the UI asks for an additional confirmation before reading files above 2 MB. Unknown extra fields are currently retained for schema compatibility; they are not rendered or executed.

`public/_headers` configures CSP, frame denial, MIME sniffing protection, referrer and permissions restrictions on hosts that support that file. Inline styles are permitted because React Flow uses dynamic style attributes. Do not broaden script sources to fix a deployment problem without investigating. Vite dev/preview does not verify these deployed headers. See [Cloudflare's header behavior](https://developers.cloudflare.com/pages/configuration/headers/).

No credentials were found in the tracked application/configuration files inspected. This is not an exhaustive historical secret scan. There is one initial commit; history was not rewritten. All direct packages are pinned and the lockfile is tracked. A vulnerable development transitive `brace-expansion` 5.0.9 was patched to 5.0.12; rerun `npm audit` regularly because advisories change. Development-only vulnerabilities still affect build tooling even when absent from shipped browser code.

Detected stale-tab saves/resets are rejected. This does not supply cross-tab atomicity or collaboration. Export unsaved data before reloading. Never infer persistence success from the fact a node appeared in the UI.

Unexpected render failures use a boundary and local browser-console diagnostics. No remote telemetry collects family records. Existing diagnostics are not a full observability system; review captured console output before sharing it publicly.
