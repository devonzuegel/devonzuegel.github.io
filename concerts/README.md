# Encore / concerts

A concert notebook at `/concerts/`, built to fit this static website. The front end works on GitHub Pages. A small Node API adds username-based sync, cached recording searches, and optional Ticketmaster/YouTube/Spotify integrations.

## Run and check

Requires Node 22 or later.

```sh
cd concerts
npm ci
npm run dev
```

Open **http://127.0.0.1:4317/concerts/**. No keys are needed. The local server stores notebooks in the ignored `concerts/.data/` directory; keep that directory to keep synced profiles. A phone on the same trusted network can use the computer's LAN IP and port 4317 while the server is running. For access outside that network, publish the backend as described below.

```sh
npm test          # Dates/export, filters, source parsing, sync conflicts, API and offline edits
npm run build     # Static deployment files in public/concerts/
npm run refresh   # Retrieve official calendars; update events.json and coverage.md
npm run format
```

## What works without accounts or keys

The interface automatically follows the device’s light/dark appearance, including changes while open. Night mode also covers dialogs, calendar, native light/dark basemaps and controls and native inputs.

- SF Bay Area, Miami metro and NYC metro are followed by default. Add/remove cities, toggle them, and adjust custom-city radii. City search uses Open-Meteo/GeoNames.
- Chronological list, month calendar, venue view and clustered MapLibre vector map share filters. The initial range is 60 days; presets extend to a year. Venue capacity comes from cited sources, including specific rooms when known. Unknown capacities/coordinates stay unknown.
- One saved list with upcoming/past/all, global counts, notes, and separate music, expected venue and visuals ratings. Notes and ratings automatically save a show. Removed feed items remain in the notebook; unsaving retains the notes.
- Internet Archive video and audio samples, with videos first, artist switching, search and pagination. A recording only plays on request. Paste a YouTube video URL into the recording search box to play it here without an API key. Availability and embedding depend on the source.
- Import Spotify streaming-history JSON, including extended-history exports. Raw history is parsed in the browser; only artist play/minute totals are saved or synced. Matches use the lineup's artist names or Spotify IDs, not inferred taste. No recommendations or artist-following system.
- Ticket/source links and individual/selected `.ics` downloads, with venue-local dates and time zones. Missing times export as date-only events; no fabricated end time, private notes or reminders.
- Username + generated private sync code, field-level merging, local offline queue, and explicit conflict resolution for concurrent note edits. This is lightweight personal-app auth, with no password recovery, email, sharing or social features.

## Current source coverage

`data/events.json` contains real retrieved listings, not demonstration events. See [the generated source report](data/coverage.md) for counts, failures and the check time. At implementation time, 14 official calendars returned 707 upcoming listings; three other sources were unavailable or empty. Coverage is **partial**, especially outside the urban cores, for larger halls/arenas, and for added metros. Some venue pages only publish a few weeks ahead. The importer does not bypass restricted sources, TLS failures or paywalls.

`data/venues.json` is the source/venue directory, not a manual concert-entry mechanism. Adapters support TicketWeb, See Tickets, The Events Calendar, Elsewhere, LPR, Bottom of the Hill and several venue-specific public calendars. Different rooms keep separate capacities. Offsite listings never inherit the promoter's map pin; LPR's unverified offsite listings are excluded. Source timestamps, errors and gaps are visible in the app. A failed source retains its previously retrieved upcoming listings. Successful empty results are treated conservatively when earlier listings exist.

The daily `concerts-catalog.yml` workflow starts after these files reach the repository's default branch and GitHub Actions is enabled. It refreshes only the two public catalog/report files and commits them. The published front end reads the current catalog from this repository's raw URL, avoiding dependence on whether a bot commit triggers a GitHub Pages rebuild. Refresh in the app reloads that catalog; it does not scrape every venue on every click. Local development uses the bundled file. If this repo is forked or the branch renamed, update `catalogURL` in `config.js`.

## Publish the backend and connect GitHub Pages

The static app is published at `https://devonzuegel.com/concerts/` through GitHub Pages. The API runs at `https://concerts-api-six.vercel.app/api/concerts`. Signed-in notebooks persist in the dedicated `concerts` Upstash Redis database on the Free plan in AWS us-east-1. Database credentials are stored as Vercel production secrets. Guest notebooks and offline queues stay in browser localStorage. Local preview notebooks in `.data/` are separate from the published site and are not uploaded by deployment.

1. Create a separate Vercel project with `concerts` as its root. Its `vercel.json` builds the static preview and serves `/api/concerts`. This does not replace the existing website.
2. Connect a dedicated free-tier Redis instance supporting the Upstash REST protocol. Set `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or the corresponding `UPSTASH_REDIS_REST_*` variables). Serverless deployments deliberately refuse to save profiles without durable storage. Alternatively, run `npm start` on a persistent Node host and back up `.data/`.
3. Set `APP_ORIGIN=https://devonzuegel.com` (comma-separated origins if more are needed). Change `apiBase` in `config.js` to the deployed `https://…/api/concerts` URL. Never put service keys in browser configuration.
4. Publish this repository's `concerts/` front-end files through its existing GitHub Pages process. Create a notebook, save its sync code, and open that notebook on the other device.

The included Vercel static preview has the same `/concerts/` route. To use it alongside GitHub Pages, add its origin to `APP_ORIGIN`. The Redis namespace is `concerts:v1:`. Profile codes are stored as SHA-256 hashes on the server, and only the browser holding the code can retrieve that profile. Local profiles and Spotify tokens are never part of the public catalog/build.

## Optional integrations

Copy `.env.example` to `.env` for local configuration. All services are optional; keep usage within their free allowances.

| Variable                                                             | Enables                                                                                                                                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TICKETMASTER_API_KEY`                                               | Broader city/metro discovery with pagination and six-hour caching. New cities without venue adapters need this for broad listings.                                                          |
| `YOUTUBE_API_KEY`                                                    | Official YouTube search for embeddable videos, with full-set search and 24-hour caching; Archive remains the fallback.                                                                      |
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` | OAuth for top artists/recent plays. Current Spotify development rules require an eligible developer account; the user has no Premium or keys, so history import is the implemented default. |

Spotify redirect URI must match the registered endpoint exactly; the example includes `?action=spotify-callback`. OAuth tokens live only in backend storage. Disconnect removes tokens and listening summaries. Imported history matching does not need Spotify Premium. These credential-dependent paths have automated coverage around supporting behavior but have not been verified against live accounts/keys.

## Architecture and limits

- `app.js`, `styles.css`, `index.html`: responsive UI, accessible dialogs, a single playback iframe, list/calendar/map/venue views.
- `shared/core.js`: dates, filtering, snapshots, artist matching, deduplication and calendar export.
- `shared/client-store.js`: local persistence, operation queue, retry/deduplication and conflict-aware sync.
- `server/`: parsing, source fetching, API integrations and atomic storage. Local writes use per-profile queues and atomic rename; Redis writes use compare-and-set transactions.
- `api/concerts.mjs`: one portable API handler used by the local server and Vercel.
- `tests/`: meaningful checks for data preservation, concurrent edits, date boundaries, source location errors and filtering.

Catalog completeness is not promised. Genres and lineups are only as precise as the venue's source data. Exact artist matching may miss alternate spellings, tour titles or collaborations. Internet Archive has much thinner coverage than YouTube. Source layouts and service policies change; use the coverage report to identify adapters needing attention. This personal/small-group version has no account recovery, production abuse controls, general recommendation engine, reminders, artist following or sharing.

Map tiles are requested only for the visible map, with OpenStreetMap attribution. No bulk tile downloading or background geocoding. Bundled Leaflet and markercluster retain their upstream licenses in `vendor/`.

## Verification completed

On September 19, 2026: the build and 26 automated tests passed. Browser checks covered desktop and 390-pixel phone layouts, all four views, map clustering and venue selection, artist filtering, adding/removing a city, automatic saving, independent ratings, note persistence after reload, and creating/reopening a username notebook. An Internet Archive performance played in the embedded player; its media element reported active playback with no error, and ratings did not replace the player. Temporary test notes/ratings/bookmarks were cleared. Cloud Redis, live Spotify OAuth, and credential-dependent Ticketmaster/YouTube searches remain unverified.

Map rendering uses MapLibre GL JS with the Leaflet adapter, keeping venue clustering and selection. Maptoolkit Community light/dark styles require no API key for this personal site. Keep the Maptoolkit logo and copyright links visible; see https://docs.maptoolkit.org/attribution/. Map resources load only when Map view is opened.
