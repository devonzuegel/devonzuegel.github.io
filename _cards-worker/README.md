# Cards at devonzuegel.com/remember/

A private Notion-backed spaced-repetition app. The static UI is in `../remember/`; this directory contains its separate Cloudflare Worker, D1 schema, tests, and setup. It does not change the existing QR Worker or other site apps.

**Deployment status (November 23, 2026):** the Cloudflare Worker, D1 migration, and reminder schedule are deployed. The frontend publishes through GitHub Pages at `/remember/`. The dedicated GitHub OAuth app and Notion integration still need credentials before live cards can load. All 14 backend tests and TypeScript checks pass. The sample session was checked at desktop and 390px phone widths. Live owner sign-in, Notion writes, and iPhone delivery still need verification.

## Behavior

- Source: existing “🎴 Spaced Repetition” database `e0d81a1f-2553-4121-b390-d2bcd1f54c06`, data source `7c583d6a-698c-470d-8d1e-86f269d502fd`.
- Reads `Card`, `Prompt`, `Answer`, `Tags`, `Due`, `Ease`, `Interval (days)` and `Last Reviewed`. Uses the title if Prompt is empty. Empty answers link back to Notion and cannot be rated. Legacy `<br>` text becomes line breaks; all content is rendered as text, never executable HTML.
- Writes **only** `Due`, `Ease`, `Interval (days)` and `Last Reviewed`. Preserves content, relations, tags and Status. The existing Due view has no Status filter, so the app also does not interpret Done as suspended.
- Unscheduled cards and cards currently due are reviewed first, sorted by Due and paginated. Date-only values become due on that date in the selected timezone; timestamp values become due at their exact instant.
- Simple ease-based scheduling, not FSRS: Again = 10 minutes and ease −0.2; Hard = previous interval ×1.2 (at least one day) and ease −0.15; Good = one day for new/relearning cards, otherwise previous interval ×ease (at least one day longer); Easy = four days for new/relearning cards, otherwise previous interval ×ease ×1.3, and ease +0.15. Ease defaults to 2.5 and stays within 1.3–3.5. Intervals cap at ten years. Button labels show the next interval. Days are elapsed 24-hour periods.
- As requested, reminders default to **9 a.m. America/New_York**, enabled. They send only if a device has subscribed and cards are due. The quarter-hour cron checks within the selected hour, follows daylight saving time, and attempts at most one reminder per device per local day.
- Push contents are generic; no card questions or answers appear on the lock screen. Clicking opens `/remember/`. Expired subscriptions are removed. A provider acceptance is not a delivery guarantee. An uncertain/failed send is recorded and visible in settings; no same-day automatic retry is made, to avoid duplicate reminders.
- Cards require an online connection. The service worker handles push/click only and caches no cards or API responses. The sample session is synthetic and never writes to Notion.

## Development

Node 22.13 or newer is required (tests use built-in SQLite). From this directory:

```sh
npm ci
npm run check
npm test
npm run dry-run
npm run preview
```

The preview serves only `/remember/` on `http://127.0.0.1:8017/remember/`. Use “Try a sample session” before the backend is connected. It deliberately never serves the repository or Worker secrets. `PORT` can override the port.

Backend tests use real SQLite statements behind a small D1-compatible adapter, and mock Notion and push HTTP calls. They cover scheduling, DST, pagination, owner sessions/CSRF, retries after an uncertain write, stale and foreign cards, concurrent pending reviews, provider endpoint validation, encryption request generation and reminder deduplication. These are not live Notion writes or physical-device push tests.

## Production setup

Cloudflare access is already available for account `c8bebf69ef232f4416601de728137fc8`. Keep this app separate from the existing QR app and its D1 database.

1. Create a dedicated internal Notion integration in the user's workspace with **Read content** and **Update content**. Grant it access to only the cards database. No user-info, comments, insertion, or workspace-wide access is needed. The Codex Notion connector is not a reusable runtime credential for this website.
2. Create a dedicated GitHub OAuth app with homepage `https://devonzuegel.com/remember/` and callback `https://cards-api.devonzuegel.com/auth/callback`. Put its client ID in `wrangler.jsonc`. This flow requests empty scope and restricts the verified numeric GitHub ID to the existing site's owner, `6979755`. Do not change the QR app's callback or credentials.
3. The dedicated `devon-cards` D1 database and `cards-api.devonzuegel.com` custom domain are already provisioned. For future migrations, run `npx wrangler d1 migrations apply devon-cards --remote`.
4. Store credentials using Wrangler's interactive secret commands; never paste them into frontend files, source control, command arguments, or chat:

```sh
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put GITHUB_CLIENT_SECRET
```

`RATE_HASH_SECRET`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY` are already stored in Cloudflare. Keep the same VAPID pair across deploys so existing subscriptions continue working. The authenticated session endpoint returns only the public half.

5. Run checks and deploy with `npm run deploy`. The command refuses unresolved `REPLACE_` placeholders. Verify missing/expired sessions return 401 and foreign origins cannot mutate the API.
6. Publish only the intended `remember/` frontend and `_cards-worker/` source changes through the site's normal GitHub Pages process. Preserve unrelated current working-tree changes. The existing Jekyll build excludes underscore-prefixed directories. **Do not add `.nojekyll` or switch static publishers without explicitly excluding `_cards-worker/`** (same constraint as `_qr-worker/`). Never include `.dev.vars`, build output, or dependencies in the published site.
7. Sign in, confirm the cards match Notion, review one real card, and verify its scheduling properties changed while its content stayed intact. Check the next queue load reflects that due date.
8. On the iPhone: open `https://devonzuegel.com/remember/` in Safari, Share → Add to Home Screen, then launch that icon. Sign in, open Reminders, enable this device and send a test. Confirm its lock-screen notification and that tapping it opens Cards. Save 9 a.m. New York time and verify a scheduled reminder on a day with due cards. iOS 16.4+ is required; permission must come from a direct tap.

## Security and consistency

Private API endpoints require an unexpired owner session. Cookies are host-only `__Host-cards_*`, Secure, HttpOnly, SameSite=Lax. CORS allows exactly the main site; mutations also require exact Origin, a session CSRF token and bounded JSON bodies. OAuth uses state, a browser nonce and PKCE, with a short-lived single-use flow. No provider access tokens persist. Auth and test-push requests are rate limited.

Each review stores a stable operation ID and absolute target scheduling values. D1's partial unique index permits only one pending review per card. A lost HTTP response is reconciled against Notion before another write; a retry never computes a second interval. The browser stores only the operation ID/card ID/version/rating, not card content, for recovery. Server-side pending reviews can also be recovered after a browser storage reset or from another signed-in device. Completed operations expire after 90 days; pending operations do not automatically expire.

The app rechecks Notion after acquiring the card lock and detects changes made before its write. **Notion does not provide an atomic conditional write here**: an external edit made in the narrow window between the final read and PATCH can race. Only the four scheduling properties are involved, but two independent review systems should not review the same card simultaneously. A page permanently deleted in Notion while an uncertain write is pending may need its pending row manually marked `conflict` after inspection.

Push subscriptions are encrypted by the standard Web Push library. Only HTTPS Apple, Google FCM and Mozilla push endpoints are accepted; redirects are disabled. Subscription endpoints/keys remain in D1. The app stores sessions, OAuth flows, settings, subscriptions, scheduling-operation records and reminder-attempt outcomes, not a replica of card answers. Session and OAuth cleanup runs on cron; reminder history is kept for roughly a month.

References: [WebKit iPhone push requirements](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [Notion data-source API](https://developers.notion.com/reference/query-a-data-source), [Notion page updates](https://developers.notion.com/reference/patch-page), [web-push library](https://github.com/web-push-libs/web-push).
