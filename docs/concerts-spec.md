# Concerts at `/concerts`

Implementation approved · September 19, 2026 · Local build ready for review; see the implementation update for integration and coverage limits.

## Purpose

Help me decide which concerts to attend: discover upcoming shows across the metro areas I follow, watch several live performances without leaving the app, assess the music, venue, and visuals, and keep a useful shortlist across my phone and laptop.

The app is primarily for Devon, but other people should be able to use their own profiles. Concert data services must be free. Broad coverage, including small venues and unfamiliar artists, matters more than ticket-price comparison.

## The main experience

1. Open a chronological list of concerts in my enabled metro areas for the next two months.
2. Narrow it by dates, city, genre, venue, or venue size. See which performers match my Spotify listening, and optionally explore venue locations on a map.
3. Open a concert, switch between its performers, and watch several live recordings in the app.
4. Save it, write a note, and optionally rate the music, expected venue experience, and visuals.
5. Return to my saved list on either device, compare options, open ticket links, or export to my calendar.

## Cities, dates, and browsing

**Cities.** Start with SF Bay Area, Miami metro, and NYC metro, all enabled. Following a city and temporarily hiding it are separate actions. Add a city through place search; remove it from followed cities without deleting saved concerts from that city. Each profile remembers its cities and preferences.

Proposed initial geographic scope:

| Label | Intended coverage |
| --- | --- |
| SF Bay Area | San Francisco, East Bay, Peninsula, South Bay, and North Bay |
| Miami metro | Miami-Dade, Broward, and Palm Beach counties |
| NYC metro | Five boroughs, Long Island, nearby northern New Jersey, Westchester/Rockland, and southwestern Connecticut |

These are proposed product boundaries, not a claim that a single provider uses the same definition. Show the covered area in city settings. Query a sufficiently broad area, then filter against the selected footprint. Added cities can start with an editable radius if a metro boundary is unavailable. Disambiguate places by state/region and country. Coverage for added cities depends on available sources and must be visible.

**Dates.** Default to today through the next 60 days. Offer this weekend, next 30/60/90 days, six months, a year, and a custom range. Longer ranges fetch what sources have announced; an empty future month does not mean there will be no concerts. Display event times in the venue’s time zone, visibly labeled when useful. Keep dates/times marked TBA separate from confirmed schedules.

**Views.** Include a chronological list by default, a month calendar, a view grouped by venue, and an optional map view. All four use the same city/date/genre/venue/size filters and saved state. Calendar days expand to show all events rather than silently hiding overflow. Search artist, concert title, and venue. Preserve filters and scroll position when closing a concert.

**Map.** Plot the venues of concerts matching the current filters, available both while discovering concerts and browsing the saved list. Use one marker per venue, with the number of matching concerts; opening it shows those concerts chronologically, their dates, venue size, and saved state. Selecting a concert opens the same detail and sampling experience as the list, with saving available there. Cluster nearby markers when zoomed out, and distinguish venues containing saved shows with a visible symbol as well as color.

Offer “Fit results” and quick navigation to each enabled metro so viewing SF, Miami, and NYC together does not require manually crossing the country. Panning and zooming do not silently change filters, followed cities, or saved counts. Preserve map position when returning from concert details. On phones, show selected-venue concerts in a panel below the map or a bottom sheet.

Use verified venue coordinates or geocoded venue addresses, never a city-center placeholder presented as the venue. If a concert cannot be placed reliably, keep it in the list and show an explicit unmapped-results count with a way to inspect those entries. Map use does not require the user's current location. Select map tiles and any geocoding service within the free-only constraint, respecting attribution and usage limits; the provider is an implementation decision. A map-service failure must leave the list and saved concerts usable.

**List entries.** Show performers, date/time, metro and actual locality, venue/room, capacity or “size unknown,” genre, Spotify-match badge when applicable, and a save button. Indicate sold-out, postponed, rescheduled, or cancelled shows where reported. Price is optional secondary detail, with no price filter in the first version.

## Venue information is a core feature

Give venue size prominent space in both concert listings and details. Prefer the capacity of the actual room or concert configuration over the entire building’s maximum. Display a range when configurations differ, label approximate values, and link to the source. Capacity is not expected attendance.

Proposed size filters: under 300; 300–999; 1,000–2,999; 3,000–9,999; 10,000+; unknown. These are app categories, not an industry classification. Unknown sizes remain visible by default.

Venue details should include available room name, address/map link, indoor/outdoor setting, and seated/standing information. Use official venue information first and other attributable public sources where necessary. Store the source, configuration, and verification date. Never infer capacity from artist popularity or invent missing facts. If a range crosses size buckets, allow it to appear in either relevant bucket.

The first version needs a researched venue directory for the default metros, prioritizing venues with upcoming shows. Venue enrichment is part of implementation; Devon does not need to enter concerts or maintain their listings manually.

## Artist sampling

Opening a concert reveals its lineup and an artist selector, including opening acts when known. Keep an embedded video player alongside a browsable set of recordings. Start with roughly 6–12 relevant results when available, with a “more” action and an editable search query.

Default to live performances. Offer Live, Full sets, and All music search modes so studio recordings and music videos are also easy to find. Prefer clear artist matches and relevant concert footage; include both professional recordings and useful audience footage. Do not present search results as verified recordings of the upcoming tour.

Show title, channel, duration, and thumbnail. Reuse artist results across concerts. Only one player should play at once, and playback starts on user action. Desktop uses a detail panel; mobile uses a full-width detail screen with easy return to the list.

YouTube is the proposed first playback/search provider. Request embeddable results; videos that later fail to play offer another sample and an external link as a fallback. If live results are unavailable, explain that and offer broader music results. Avoid auto-loading searches for every artist in the feed: load on demand and cache results within provider requirements.

## One saved list, notes, and three ratings

Saving means “I’m interested.” There are no separate interested/bookmarked/going workflows in the first version.

Each concert can hold private notes and three optional, editable 1–5 ratings:

| Rating | Meaning |
| --- | --- |
| Music | How much I like the music and performances I have sampled |
| Venue | How good I expect this venue and room to be for this particular show |
| Visuals | How appealing the stage presentation, lighting, production, and performance look |

Ratings start blank, never at zero. “Visuals” is proposed to mean the performance’s presentation, rather than the recording’s camera quality. These are personal impressions, not predictions generated by the app. Keep the three scores separate without a composite score.

Proposed behavior: writing a note or rating automatically saves the concert. Ratings and notes belong to that concert, not every appearance by the artist or every event at the venue. Unsave removes the bookmark but preserves the assessment for later; explicit clearing removes its text/scores. Edits autosave with a visible pending/synced/error state.

Show an upcoming saved count and a total saved count. These global counts do not change when a city is toggled off. A filtered saved view says, for example, “Showing 4 of 12 upcoming saved concerts.” Upcoming counts exclude past and cancelled events. Saved concerts remain accessible after their date, cancellation, city removal, or disappearance from a feed; those conditions are labeled.

The saved list has Upcoming, Past, and All filters, plus sorting by date, recently saved, or any of the three ratings. Unrated entries sort last. Notes are searchable. Past concerts can be reviewed and ratings updated, without a separate attendance-tracking system.

## Spotify matching

Spotify connection is optional. Use top artists/tracks and recent listening, where available, to identify performers already in the user’s listening data. Treat top-artist rank as an affinity signal, not an exact play count or complete lifetime listening history. Match supporting acts as well as headliners, using provider IDs where possible and conservative artist-name matching otherwise.

Show explanatory badges such as “One of your top artists” or “Recently played,” identifying the matching performer. Keep the default feed chronological, with a prominent “Spotify matches” filter and optional match-first sorting. Within match-first mode, stronger listening matches rank higher, then date. Do not infer that a missing match means the user dislikes an artist.

This is direct matching to existing listening, which is explicitly in scope. Similar-artist discovery and a general personalized recommendation engine are out of scope. Public artist popularity is not a substitute for personal listening data. Genre filtering should use event/artist metadata that is actually available, with an Unknown option.

Show connection state and last refreshed time. Disconnecting removes the integration’s credentials and imported listening data without deleting saved concerts or personal notes. The rest of the app works without Spotify.

## Profiles and sync

Browsing works without signing in. Creating a profile requires a username, with separate cities, saved concerts, notes, ratings, and Spotify connection for each person.

Proposed lightweight access: generate a reusable private sync code when creating the profile. Enter username + code on a second device and remember it locally. No email/password registration or elaborate account management in the first version. A username identifies a profile; the code prevents another person from accidentally editing it. Losing all devices and the code has no automated recovery in this version.

Persist changes locally immediately, then sync to a shared backend. Pending changes survive refreshes and temporary loss of connectivity. A new device loads existing data before uploading changes; an empty local profile must never overwrite saved server data. Merge changes per record/field, preserve unsave operations, and detect competing note edits so one device does not silently erase another’s text. Normal edits should appear on the other online device within about ten seconds or immediately on refocus/refresh.

Personal notes and Spotify credentials must not be shipped in the public website repository. Spotify uses its own authorization flow even though app-profile access is simple.

## Tickets and calendar export

Link to the original event/ticket pages. When multiple sources describe the same show, show one concert with its relevant links; different nights or distinct showtimes remain separate concerts.

Provide a per-concert `.ics` export and an export of selected upcoming saved shows. Include performers, venue/address, source/ticket link, and event-local timezone information. Use a stable calendar event ID. Do not invent a start time or duration: explain missing time information and export a clearly labeled date-only entry when needed. This is a snapshot export, not an automatically updating calendar subscription, and contains no default reminders or private notes.

## Free data: proposed approach and limits

“Everything” is the coverage goal. No source checked so far establishes complete, free coverage of every concert in these metros. The app must not label a partial feed as exhaustive.

| Source | Proposed use and current constraint |
| --- | --- |
| Ticketmaster Discovery | Initial broad catalog candidate. Supports location/date queries and multiple ticketing sources; documented default limits are 5,000 calls/day and 5 requests/second. Deep paging stops at 1,000 results, so split busy metro/date queries into smaller windows. [Official API documentation](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/) |
| Official venue/promoter calendars | Complement the catalog with smaller and independent shows, using available feeds and permitted structured/calendar pages. Exact sources and accessible fields still need validation; do not promise arbitrary-site ingestion. Maintain a visible source/venue coverage list. |
| Songkick | Excluded under the free-only requirement: its developer page requires a license fee and says hobbyist applications are not being approved. [Developer access](https://www.songkick.com/developer) |
| Bandsintown | Not assumed available for general city discovery: ordinary keys are tied to one artist, with other uses requiring approval. Only add if appropriate free access is confirmed. [API access](https://help.artists.bandsintown.com/en/articles/7053475-what-is-the-bandsintown-api) |
| YouTube | In-app search and playback candidate. Current documentation lists a default 100 search calls/day per project, so share cached artist searches and load additional pages on demand. Actual project quota must be checked during setup. [Quota documentation](https://developers.google.com/youtube/v3/determine_quota_cost), [embeddable search](https://developers.google.com/youtube/v3/docs/search/list) |
| Spotify | Personal matching is conditional on access: development mode currently requires the app owner to have Premium and permits five allowlisted users. Others can still use the concert app without connecting Spotify. Do not assume general public Spotify onboarding. [Quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) |

Spotify’s documented [top-items endpoint](https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks) returns calculated affinity; [recently played](https://developer.spotify.com/documentation/web-api/reference/get-recently-played) provides recent tracks. Actual calls with the new app’s credentials still need to be tested before promising the integration. Existing Spotify Premium would be a prerequisite, not a paid data service purchased for this app; Devon confirmed that Premium and developer credentials are not available, so the implementation defaults to a streaming-history import.

Refresh shared event data at least daily where source limits permit, with timestamps and visible stale/source-failure states. Cache per source and region, deduplicate conservatively, and preserve source provenance and event identity through reschedules. Missing from one refresh is not proof of cancellation. Provider retention requirements apply to cached data; personal notes must survive any required provider-data cleanup.

For initial coverage verification, compare imported listings against a documented sample of at least five small/medium venues in each default metro, plus larger venues. Record missing shows and why. Ticketmaster-only coverage must not be called completion of the comprehensive-discovery goal. If suitable free access cannot close major gaps, present the measured limitation for review rather than quietly narrowing scope.

## Technical shape

Keep the front end under `/concerts/` in this repository and the existing website deployment. Support `/concerts` through its normal directory routing. A small external backend handles shared storage, source aggregation/cache, credentials, and synchronization; static browser storage alone cannot meet cross-device sync.

Use free infrastructure tiers for the initial personal/small-group workload. Choose the specific backend after checking the existing deployment setup and current free limits. The repository already has a static-front-end/external-API pattern in Boggle. This draft does not assume that service or its data should be modified or reused.

Core records are profiles; followed metros; concerts and source IDs; artists; venues/rooms with coordinates, location provenance, and capacity provenance; cached media search results; personal concert assessments/bookmarks; and optional Spotify connections/matches. Third-party secrets remain server-side. Hitting a quota yields a clear limited/stale state rather than a paid upgrade or a fabricated empty feed.

Responsive design should work equally well on phone and laptop: compact listings, prominent dates and capacity, comfortable touch targets, accessible controls, and a player that fits the screen. Proposed visual direction is a quiet, information-dense concert notebook with restrained artwork and color.

## First-version boundaries

Included: automatic concert ingestion; configurable metro areas; date/genre/venue/size filters; list, calendar, venue, and map views; venue enrichment; multiple embedded artist samples; one saved list with counts, notes and ratings; username profiles and sync; ticket links; calendar exports; optional Spotify listening matches subject to verified access.

Excluded: manual concert entry, paid data, reminders/notifications, artist following, similar-artist recommendations, social/sharing features, ticket purchasing within the app, price comparison, full Spotify playback, and a separate library of bookmarked recordings. Do not turn provider setup problems into a requirement for Devon to maintain listings manually.

## Acceptance checks

- A new profile sees all three default metros and a 60-day chronological feed; toggling, adding, and removing cities behaves consistently across views.
- Changing dates or switching list/calendar/venue/map view preserves other filters and bookmarks. Longer-range queries do not silently truncate crowded result sets.
- Map markers represent actual venue locations and reconcile with filtered concerts, including multiple shows at one venue and explicitly listed unmapped entries. Clustering, metro navigation, saved-state indicators, mobile details, and returning to the previous map position work in discovery and the saved list. A map failure does not block other views.
- Venue size is visible without opening a detail view. Exact/range/approximate/unknown values and room configurations are represented honestly.
- A concert with several performers supports artist switching and multiple playable samples when available; live recordings are prioritized and failures recover gracefully.
- A saved concert, note, and each independent rating can be edited on one device and retrieved on another. Empty-device initialization, offline edits, concurrent note edits, and unsaves do not erase unrelated data.
- Counts reconcile with their stated meaning; filtered, cancelled, past, and removed-city concerts remain understandable and retrievable.
- Spotify matching identifies actual listening matches when connected, explains the match, and does not reorder the default chronological view. Unsupported accounts and disconnected profiles still work.
- Ticket links resolve to the source, and calendar exports preserve local event times across time zones and daylight-saving changes.
- Data coverage is measured across venue sizes in all three metros. Duplicate events, reschedules, feed outages, unknown genres/capacities, and API quota exhaustion have verified behavior.

## Proposed choices to review

The main assumptions beyond Devon’s stated requirements are: username + private sync code; the metro boundaries above; calendar and venue-grouped views in addition to the requested chronological list and optional map; a 60-day default; 1–5 ratings attached to individual concerts; “visuals” meaning stage/performance presentation; automatic bookmarking when writing notes/ratings; and preserving assessments after unsaving.

The remaining setup decisions are cloud hosting/storage and optional API access to expand coverage. Devon authorized implementation after the clarification round. The local version and its remaining limits are described below.

## Implementation update — September 19, 2026

The user approved implementation and confirmed no Spotify Premium or developer keys are available. The implementation in `concerts/` therefore defaults to public official venue calendars, Internet Archive recording search/embeds, pasted YouTube-link playback, and Spotify streaming-history JSON import. Ticketmaster, YouTube search and Spotify OAuth remain optional backend integrations. The front end, Node API and durable-storage adapter are built; cloud publication and Redis connection have not been performed. See `concerts/README.md` for setup and explicit coverage limits, and `concerts/data/coverage.md` for the latest actual source results. This is a partial catalog rather than the comprehensive metro coverage originally desired.
