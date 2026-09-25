# Personal QR codes: setup and operations

The dashboard is `https://devonzuegel.com/QR-codes/`. GitHub Pages serves `QR-codes/index.html`; the directory also resolves `/QR-codes` by adding its trailing slash. Hash routes work on refresh without SPA rewrites. This is a vanilla JavaScript page using the site's Open Sans typography, green links, and shared appearance control. `qr@0.6.0` (Paul Miller's maintained QR library) is bundled locally, with its MIT license. Printed images encode only the permanent tracking URL.

The TypeScript Worker serves `https://qr.devonzuegel.com`, with D1 persistence and a Resend outbox. Everything in this directory starts under `_qr-worker`, which the existing GitHub Pages Jekyll build excludes. There are no backend credentials, recipient addresses, sessions or visit data in the static frontend. Do not add `.nojekyll` or include this directory in a different static build without an explicit exclusion.

**Implementation and local validation are separate from deployment.** No Cloudflare resources, OAuth app, DNS records, Resend account or live messages were created during implementation. The recipient has not been assumed. The final live scan/email check below remains required after configuration.

## Validation record — September 25, 2026 UTC

- TypeScript check and all **22 automated tests passed**, including actual D1 transactions, concurrency, OAuth/CSRF, failures, pagination, retention and independent QR decoding.
- Headless Chrome browser checks passed at 1440px desktop and 390px phone widths, in light/dark appearance. SVG and PNG exports independently decoded to the permanent tracking URL. Preview and download generated no visits; the mock scan/redirect/email flow passed. No real email was sent.
- `wrangler d1 migrations apply --local` applied all 24 migration statements; real local Worker smoke checks returned correct 401, CORS and 404 responses. Production deployment dry run passed.
- Full **Jekyll 3.10.0 safe build** passed into a temporary directory. Existing homepage, QR dashboard, local QR bundle and privacy page were present; `_qr-worker` was absent. Public QR output was checked for secrets and test recipient data. The GitHub-hosted CI/Pages deployment itself has not run for these uncommitted changes.
- Live GitHub OAuth authorization, custom-domain TLS, Cloudflare geography and Resend inbox delivery remain unverified until the external accounts and recipient are configured.

## Repository and local commands

Repository: `https://github.com/devonzuegel/devonzuegel.github.io`. GitHub's Pages API was inspected on September 25, 2026 UTC: legacy branch deployment, `master`, root `/`, custom domain `devonzuegel.com`, status `built`. There is no frontend framework build for the main site. The root README's Evernote/Postach.io import is for blog updates; it is not needed to publish this tool. Do not run that import for QR changes.

Use Node 22 or later (the system Node 20 is too old for current Wrangler). On this machine Node 26 is at `/opt/homebrew/opt/node@26/bin`; for example, `export PATH=/opt/homebrew/opt/node@26/bin:$PATH` in the current terminal.

```sh
cd /Users/devonzuegel/dev/devonzuegel.github.io/_qr-worker
npm ci
npm run build
npm run check
npm test
npx playwright install chromium
npm run test:browser
npm run dry-run
```

`build` regenerates only `../QR-codes/vendor/qr.js`, its license, and ignored test bundles in `.build/`. The QR bundle is checked in because the existing Pages publication does not run npm. `npm test` uses the actual Cloudflare D1 emulator and mocked OAuth/Resend requests. Browser tests use an isolated test database, mock account calls, download SVG and PNG files, independently decode both with jsQR, and exercise a mock scan → redirect → visit → email. Screenshots are in `.build/screenshots/`. If Chromium installation stalls and Chrome is installed, run `PLAYWRIGHT_CHANNEL=chrome npm run test:browser`. Tests do not require external accounts or send real email. CI runs these checks and a GitHub Pages Jekyll build, checking the public entrypoint and backend exclusion.

For a manual local dashboard with real GitHub login:

1. Register a **separate local OAuth app** with homepage `http://localhost:8000/QR-codes/` and callback `http://localhost:8787/auth/callback`.
2. Put its client ID in `wrangler.local.jsonc`. Copy `.dev.vars.example` to `.dev.vars`, set that app's client secret, and generate a separate random `RATE_HASH_SECRET` of at least 32 characters. Keep the file ignored and local. No login bypass exists in the deployed code.
3. Run the following in two terminals:

```sh
# Terminal 1, from _qr-worker
npm run migrate:local
npm run dev

# Terminal 2, from repository root
python3 -m http.server 8000 --bind localhost
```

Visit `http://localhost:8000/QR-codes/` (use **localhost**, not 127.0.0.1 for this manual configuration). The browser config chooses the localhost Worker only on port 8000. Local email is disabled by default. Local cookies deliberately use an unprefixed, non-Secure variant only when both origins exactly match the localhost configuration. Production cookies remain Secure. Local D1 is separate from remote D1. Never print localhost, workers.dev or preview QR codes for real use.

## DNS inventory and plan

Public DNS was checked September 25, 2026 UTC (September 24 in New York):

| Name                         | Observation                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| `devonzuegel.com` NS         | `carl.ns.cloudflare.com`, `erin.ns.cloudflare.com`           |
| Apex and `www` A             | Cloudflare proxy addresses `104.21.36.195`, `172.67.198.197` |
| Apex AAAA                    | `2606:4700:3030::6815:24c3`, `2606:4700:3034::ac43:c6c5`     |
| Apex TXT                     | Existing Brave verification record                           |
| Apex MX / CAA; `_dmarc` TXT  | No answers from the resolver for these specific queries      |
| `qr` A / CNAME; `notify` TXT | No answers from the resolver for these specific queries      |

This indicates the domain already uses Cloudflare. It does **not** reveal the origin records behind the proxy or the complete DNS zone. Confirm the zone is **Active in the account where you deploy the Worker**, and export its full DNS records before changes. Do not replace apex/`www`, personal email, verification, DKIM, SPF, DMARC, calendar, or other existing records. Leave the repository's `CNAME` file unchanged. GitHub Pages remains the website host.

For the currently observed DNS, no nameserver migration is needed. Wrangler's `routes` entry creates a **Worker Custom Domain** for exactly `qr.devonzuegel.com`; Cloudflare provisions its DNS record and certificate. Do not create an arbitrary CNAME to a workers.dev address. If a conflicting `qr` record appears before deployment, inspect it before removing or replacing it. Do not put Cloudflare Access in front of the entire QR hostname: public `/r/` links must work without login. Exclude `qr.devonzuegel.com` from any existing “Cache Everything” rules; the Worker uses `Cache-Control: no-store` everywhere. Verify HTTPS on both origins. Pages' API currently reports `https_enforced: false`; verify Cloudflare's HTTPS redirect and enable Pages' HTTPS enforcement when available, without disrupting existing origin SSL settings.

If DNS has moved elsewhere by setup time: export the **complete** current zone; inventory all A/AAAA/CNAME/MX/TXT/CAA/SRV records and subdomains, including mail DKIM selectors and verification records. Add the domain on Cloudflare's Free plan, import records, and compare names, values, priorities, TTLs and proxy status against the export. Keep mail-related records DNS-only; preserve the existing GitHub Pages origin records instead of copying proxy IPs from this table. Coordinate any DNSSEC DS removal at the registrar before switching nameservers, switch only after the copied zone is verified, then wait for Active status, test the website and existing email, and re-enable DNSSEC with Cloudflare's new DS. Keep the old DNS service and export until the transition is verified; if it fails, restore the prior nameservers/DS arrangement. Custom Domains require an active zone; postpone printing until this is complete. [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

## 1. Cloudflare Free resources

Use the account holding the existing zone. Stay on the **Workers Free** and **D1 Free** allowances. Do not enable a paid Workers plan or paid overages for this project.

```sh
cd /Users/devonzuegel/dev/devonzuegel.github.io/_qr-worker
npx wrangler login
npx wrangler whoami
npx wrangler d1 create qr-codes
```

Copy the returned database UUID into `wrangler.jsonc` → `d1_databases[0].database_id`. The `database_name` stays `qr-codes`, binding stays `DB`. If you have multiple Cloudflare accounts, add the correct public `account_id` to the config. The rate limiter namespace IDs `697975501`–`697975503` must be unused by other Workers in that account; change them if needed. Rate limiter bindings are built in; no paid KV, queues or Durable Objects are required.

## 2. GitHub OAuth

In [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers), register an OAuth App:

| Field                      | Value                                      |
| -------------------------- | ------------------------------------------ |
| Application name           | Devon QR codes                             |
| Homepage URL               | `https://devonzuegel.com/QR-codes/`        |
| Authorization callback URL | `https://qr.devonzuegel.com/auth/callback` |
| Device flow                | Leave disabled                             |

Set `GITHUB_CLIENT_ID` in `wrangler.jsonc`. The numeric owner ID is already configured as **6979755**, verified using GitHub's public `users/devonzuegel` endpoint. Login requests an empty scope (public identity only); it requests no repository permissions. The backend compares numeric IDs, including on every authenticated request. Generate a client secret and keep it for the secret prompt below. [GitHub OAuth and PKCE](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)

## 3. Resend sender and chosen recipient

Create or use a dedicated [Resend](https://resend.com/) **Free transactional email** account/team. A dedicated sending API key and sender domain are useful isolation, but keys in a shared account still share its quotas. Other outbound/inbound email can consume its allowance. Keep open/click tracking disabled; this app only reports provider acceptance.

Add `notify.devonzuegel.com` as a sending domain; use the North Virginia (`us-east-1`) region if using the example below. Leave Receiving disabled. Set these **new records within the existing `devonzuegel.com` Cloudflare zone**, TTL Auto, DNS-only. Copy the exact values displayed for your new domain; the DKIM public key is generated by Resend and cannot be supplied in advance.

| Type | Cloudflare Name            | Value                                                                                     | Priority |
| ---- | -------------------------- | ----------------------------------------------------------------------------------------- | -------- |
| TXT  | `resend._domainkey.notify` | Exact `p=…` DKIM value from Resend                                                        | —        |
| MX   | `send.notify`              | Exact feedback host from Resend; for `us-east-1`, `feedback-smtp.us-east-1.amazonses.com` | 10       |
| TXT  | `send.notify`              | `v=spf1 include:amazonses.com ~all` (confirm against Resend's displayed record)           | —        |

These are the sending/DKIM/bounce records, **not** an inbound MX at the apex. Never replace existing personal email MX records or create a second SPF policy at an existing name. If Resend displays different record names/values, its generated records are authoritative. Verify DNS in Resend and wait for Verified. Optional DMARC can be added at `_dmarc.notify` after reviewing any inherited existing policy. [Resend's Cloudflare DNS guide](https://resend.com/docs/knowledge-base/cloudflare)

The configured sender is `QR Alerts <qr-alerts@notify.devonzuegel.com>`. Create a **Sending access** API key restricted to that domain. Select the one recipient email address explicitly; no address is inferred from the website or GitHub profile. It will be a Worker secret and visible only in authenticated settings, email payloads in private D1, and the provider/mailbox. No public request can select a recipient.

## 4. Migrate, set secrets, enable email

With the public D1 and OAuth client IDs filled in, first deploy with `EMAIL_ENABLED` still `false`:

```sh
npm run check
npm test
npx wrangler d1 migrations apply qr-codes --remote
npm run deploy
```

This creates the Worker with its custom domain, D1 binding and one-minute scheduled trigger. Wait for the hostname certificate to become active. Set secrets via **interactive prompts**, never inline shell arguments, frontend config, source files, chat, or commit messages:

```sh
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put RATE_HASH_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ALERT_RECIPIENT
```

Use the production OAuth client secret, a freshly generated random value of at least 32 characters for the HMAC secret, the domain-restricted Resend key, and the chosen recipient. Generate the HMAC value in your password manager (or locally with `openssl rand -hex 32`) and paste it into the secret prompt, keeping it out of saved transcripts. `EMAIL_FROM` is a non-secret server variable. After sender verification and secrets are set, change `EMAIL_ENABLED` to `true` in `wrangler.jsonc` and run `npm run deploy` again. Re-deploying vars preserves Worker secrets.

Check Workers → Settings for the custom domain, D1 binding, secrets and `* * * * *` trigger. Cron changes can take time to propagate. Do not configure an all-host authentication gate or redirect/cache rule that overrides `/r/`. Worker application logs contain only fixed event codes. Persistent Worker observability is disabled by default to avoid retaining OAuth callback query strings and public identifiers. Provider/platform infrastructure may still log requests. Avoid recording full requests/cookies in debugging tools.

## 5. Publish the static dashboard using the existing Pages process

Run `npm run build` and the checks before publishing. Review and commit **only this feature's files** (`QR-codes/`, `_qr-worker/`, `privacy.html`, the QR CI workflow and the README addition). There were numerous pre-existing uncommitted blog/concert/meditation/theme changes when this task started; do not stage those automatically. Root package files are unrelated to this feature.

Publish your reviewed feature commit to `master`, following the repository's current Pages convention. Follow the Pages job in [repository Actions](https://github.com/devonzuegel/devonzuegel.github.io/actions). No source changes, commits or deployments are needed for subsequent code creation or editing. `/QR-codes/` is deliberately not added to public navigation. The authenticated dashboard footer links the public privacy explanation.

Check `/`, an existing article, `/QR-codes`, `/QR-codes/`, and a detail hash route. The dashboard uses absolute asset paths; direct opens and refreshes work. Verify `/_qr-worker/src/index.ts` and `/_qr-worker/.dev.vars` return 404 on the deployed Pages site. Never deploy local D1 files or build-test artifacts. [GitHub Pages static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)

## 6. Explicit live end-to-end check (still pending)

This check **sends real email** to the configured recipient:

1. Open the dashboard in a private browser window. Confirm it shows only sign-in. Sign in as the owner. Use a separate non-owner GitHub account to confirm access is denied, if one is available.
2. Settings should show the chosen recipient and configuration readiness. Click **Send test email** once, then Refresh status. Confirm both “Sent to email service” and arrival in the intended inbox; check spam. This uses one budget slot.
3. Create `LIVE CHECK — delete no records` with placement `Setup test` and an HTTPS destination you control. Download the PNG. Confirm its encoded URL starts with **`https://qr.devonzuegel.com/r/`**. Preview the destination once; it should add no opens.
4. Scan the downloaded image on a real phone and **open** the link once. Check the destination, one eligible recorded open, a New York display time, and the code/placement/approximate location in one email (or honest “Location unavailable”). Dispatch normally begins immediately outside the redirect response; retries run each minute. Inbox timing cannot be guaranteed.
5. Edit the destination, then open the same printed/downloaded image again. It should reach the new destination. Cooldowns may suppress this second email while still counting the open. Duplicate the code and verify a different ID. Disable/reactivate the original and check its visitor page.
6. Disable the test code afterward. Record the scan time, provider acceptance, inbox arrival, phone/browser and any missing geography here. Do not mark live verification complete until actually observed.

## Free-tier limits and controls

Rechecked September 25, 2026 UTC; verify again immediately before deployment. No guarantee of future pricing or unlimited service:

| Service              | Current Free allowance                                        | Application behavior                                                                                                                    |
| -------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Workers              | 100,000 requests/day; 10 ms CPU per invocation                | Public requests, login, API and cron consume allowances; overload/platform exhaustion can interrupt service                             |
| D1                   | 5 million rows read/day; 100,000 rows written/day; 5 GB total | Indexed queries and bounded pages; default global logging cap 1,000 opens per UTC day                                                   |
| Resend transactional | 100 emails per UTC day; 3,000/month                           | Default 80 reservations per rolling 24 hours and 2,400 per rolling 31 days, including tests; conservative reserve below provider limits |

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Resend pricing](https://resend.com/pricing), [Resend quotas](https://resend.com/docs/knowledge-base/account-quotas-and-limits). Stay on Free; do not accept an upgrade or enable overages. Index maintenance, deletion, sessions, dashboard polling and other applications consume allowances too. Watch Cloudflare D1 row read/write metrics after initial use; application caps are a conservative guard, not a full account quota meter.

Controls in `wrangler.jsonc`:

- `EMAIL_DAILY_BUDGET` defaults 80, hard-capped 90; `EMAIL_MONTHLY_BUDGET` defaults 2400, hard-capped 2700. A sliding reservation records each distinct job. Admission and reservation insert are one D1 transaction. Every send attempt atomically rechecks capacity and extends that job's reservation, protecting calendar boundaries and delayed retries. Reservations stay conservative even if a send fails. No new budget-suppressed alert is held for a later reset.
- `CODE_COOLDOWN_SECONDS` defaults 15; `SOURCE_COOLDOWN_SECONDS` defaults 300 (maximum 3600). Cooldowns suppress emails while recording allowed opens. Shared IPs can represent several people. The daily rotating HMAC is an abuse-control signal only; it is never stored with visit records. Expired cooldown rows are removed in bounded scheduled batches.
- `LOG_DAILY_LIMIT` defaults 1000, maximum 2000. Rate limiter bindings additionally allow 20 logging attempts/source/minute and 60 overall/minute per Cloudflare location. Those edge counters are approximate/local; the D1 daily cap is atomic/global. Rejected logging work still redirects. Uncounted traffic cannot be reconstructed later. These limits do not protect unlimited Worker requests or destination database reads.
- Login flow insertion is rate limited by source and globally (10/minute/location); every flow is one-use, browser-bound and expires after ten minutes. Sessions expire after seven days, are stored as SHA-256 hashes, and can be revoked.
- `VISIT_RETENTION_DAYS` defaults 90 and cannot exceed 90. Cleanup runs each minute in bounded batches; outages can delay deletion. Aggregate open counts remain. The code list is capped at 1,000 codes so substring search stays bounded.

## Outbox, failure handling and recovery

Eligible GETs persist the visit, immutable email payload and budget reservation in one D1 transaction. Only resolved stored destinations are used. HEAD, OPTIONS, explicit prefetch and recognizable automated previews do not count; detection is inherently incomplete. An active link returns **302 + no-store**, with no email network call awaited before redirect. The Worker schedules an immediate outbox drain and a one-minute retry cron. If recording fails after lookup, the redirect still succeeds and a fixed error event is emitted. If lookup itself fails, it returns a clear 503; no claim is made that redirects survive every platform outage.

Each job has an atomic 120-second lease, unique claim token and stable `qr/<job-id>` Resend idempotency key. The serialized from/to/subject/text/HTML payload never changes on retry. Up to five attempts back off 60/120/240/480 seconds; retry headers may extend that delay. No attempt starts after the six-hour job deadline, well within [Resend's 24-hour idempotency retention](https://resend.com/changelog/idempotency-keys). Expired leases retry the same job. After an uncertain final attempt, “Failed / unconfirmed” is honest: the provider may have accepted it before a connection failed. Accepted means **Sent to email service**, not inbox delivery.

Resend 429 rate limits and 5xx/network errors retry. Daily/monthly quota errors suppress the job and persist a conservative global pause (24 hours/31 days). Later opens are suppressed instead of backlogged. Authentication/sender/validation errors fail visibly. Pending alerts for a disabled code are suppressed; an already in-flight email cannot be recalled. Changing the alert toggle affects future opens; already-queued snapshots retain their settings and contents.

Settings exposes readiness, reservation usage, the logging cap, quota pauses, last test and recent delivery problems. Readiness checks configuration, not provider-domain state; a real test email is necessary. A source-cooldown suppression is visible in that code's recent visits; delivery problems show in Settings. “Refresh” updates server state.

After fixing an account issue, inspect the provider first. To clear an obsolete quota pause only when capacity is known to be available:

```sh
npx wrangler d1 execute qr-codes --remote --command="DELETE FROM operations WHERE key='email_pause'"
```

This does not resend suppressed/failed jobs. Use the deliberate test action after five minutes. Never manually reset an old failed job to pending or change its idempotency key; that can duplicate an email.

## Schema and API contract

All timestamps in JSON and D1 are **UTC Unix seconds**. Public code IDs are 16 cryptographically random bytes (128 bits), base64url encoded to 22 characters, with a primary-key uniqueness constraint. The browser formats dates in `America/New_York` with an explicit page label.

| Table                | Purpose and key/index                                                                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codes`              | Stored destination, editable name/placement/toggles; durable `opens` and `last_open`; random PK, unique create request key, `(created_at,id)` listing index |
| `visits`             | Coarse geography, time, email status/reason; `(code_id,opened_at,id)` pagination and time retention indexes                                                 |
| `email_jobs`         | Immutable serialized email, status, deadline, attempts, lease/token/provider ID; unique visit; due/status, lease and code/time indexes                      |
| `email_reservations` | One per job; indexed last-reservation time for rolling budgets; removed after 32 days                                                                       |
| `sessions`           | Hashed opaque cookie, numeric owner ID, CSRF token, expiry                                                                                                  |
| `oauth_flows`        | Hashed state/browser nonce, PKCE verifier, ten-minute expiry                                                                                                |
| `cooldowns`          | Expiring source/code hash key or test-email key; expiry index                                                                                               |
| `daily_logging`      | UTC day and aggregate allowed logging count                                                                                                                 |
| `operations`         | Expiring provider quota pause                                                                                                                               |

Triggers update code aggregates on visit insert and copy job status to its visit. Visit retention cascades to its email job. All routine queries use indexes or intentionally bounded owner datasets. No raw IP, full user agent, GPS or fingerprint is persisted. Provider tokens exist only during OAuth callback requests and are discarded afterward.

Production session cookie: `__Host-qr_session`, Path `/`, Secure, HttpOnly, SameSite=Lax, **no Domain**. Dashboard and backend are different origins on the same HTTPS site. CORS allows exactly `https://devonzuegel.com` with credentials; every admin API independently verifies the owner session. POST/PATCH require exact `Origin`, matching `X-CSRF-Token`, and JSON content type. Bodies are bounded to 8 KiB. Do not store these values in URLs/localStorage; the CSRF token is kept in page memory. OAuth's short-lived authorization code and state necessarily appear in its standard callback URL and are immediately exchanged server-side; access/session tokens never do.

| Endpoint                            | Behavior                                                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /auth/login`                   | Start GitHub OAuth (empty scope, state + S256 PKCE)                                                                                                                           |
| `GET /auth/callback`                | Consume state once, verify browser cookie and numeric owner, issue session; redirect to fixed dashboard URL                                                                   |
| `POST /auth/logout`                 | Auth + CSRF; delete the session and expire cookie                                                                                                                             |
| `GET /api/session`                  | Auth; `{csrf}`                                                                                                                                                                |
| `GET /api/codes?q=&cursor=`         | Auth; `{items,next_cursor}`; 30 codes, newest first; optional substring search of name/note/destination                                                                       |
| `POST /api/codes`                   | Auth + CSRF + `Idempotency-Key` (16–80 URL-safe characters); `{name,destination,placement,alerts}` → code, 201; retried key returns the same code; duplicates use a fresh key |
| `GET /api/codes/:id`                | Auth; full code including permanent `tracking_url`                                                                                                                            |
| `PATCH /api/codes/:id`              | Auth + CSRF; full editable `{name,destination,placement,alerts,active}`; retains ID and aggregates; last save wins                                                            |
| `GET /api/codes/:id/visits?cursor=` | Auth; `{items,next_cursor}`; 25 newest visit rows, coarse geography, `email_status`, reason                                                                                   |
| `GET /api/settings`                 | Auth; fixed recipient, configuration readiness, budgets, pause, logging usage, latest test and delivery problems                                                              |
| `POST /api/test-email`              | Auth + CSRF; `{}`; 202 queued or 429 if unavailable/cooldown/budget; at most one per five minutes globally; ignores recipient input                                           |
| `GET /r/:id`                        | Public; 302 to stored active destination; eligible logging/outbox; 404 unknown, 410 disabled, 503 lookup failure                                                              |
| `HEAD /r/:id`                       | Same resolution/redirect without a body, logging or email                                                                                                                     |
| `OPTIONS`                           | 204, no logging; CORS headers only for the configured origin                                                                                                                  |

A code JSON object contains `id,name,destination,placement,alerts,active,created_at,updated_at,opens,last_open,tracking_url`. Booleans are JSON booleans. Visit JSON contains `id,opened_at,city,region,country,email_status,reason`. Locations may be null. Email states are `pending`, `accepted`, `suppressed`, `failed`; internal `sending` is shown as pending. Pagination cursors are server-issued `<timestamp>:<id>` keysets; pass unchanged and stop at null. This is pagination, not a transaction snapshot across later edits. Errors are JSON `{error}` with appropriate 400/401/403/404/409/413/415/429/503 codes. No destructive delete API exists.

## Rollback and revocation

- Frontend: revert only the feature commit and publish through `master`. Existing printed codes continue working as long as the Worker/domain/D1 remain. Do not reset or stage unrelated local work.
- Worker: `npx wrangler deployments list`, then `npx wrangler rollback <VERSION_ID>` for a previously verified version. Keep D1 and the custom domain intact so printed URLs retain meaning. This initial migration is additive; do not drop tables to roll back code. For later schema changes, keep compatibility with the preceding Worker and back up first.
- Back up private D1 outside the website repository: `npx wrangler d1 export qr-codes --remote --output /private/tmp/qr-codes-backup.sql`. This contains sensitive destinations, sessions and email snapshots; protect and delete it when no longer needed. Use Cloudflare's available D1 recovery tools for accidental data loss. Restore deliberately; an old database can resurrect sessions/jobs, so revoke sessions and suppress stale pending work after recovery.
- Revoke all sessions: `npx wrangler d1 execute qr-codes --remote --command="DELETE FROM sessions"`. Expired sessions also clean up automatically. Revoke the OAuth app or rotate its secret if needed.
- Stop outgoing email: set `EMAIL_ENABLED=false`, deploy, and revoke the Resend key if compromised. Redirects still work. To discard pending work before re-enabling, execute `UPDATE email_jobs SET status='suppressed',reason='alerts_off' WHERE status='pending'`; status triggers update visits. In-flight provider requests cannot be recalled.
- Do not remove the `qr` hostname while printed codes are in circulation. Disabling codes gives a reversible unavailable page. Removing D1 or the hostname permanently breaks them.
