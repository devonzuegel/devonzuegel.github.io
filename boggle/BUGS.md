# Boggle Trainer — Known Bugs & Incidents

## [FIXED] Devon data wiped on new-device login

**Status:** Fixed 2026-08-04
**Severity:** Critical — wipes all session history for Devon
**First observed:** 2026-08-04 (Miami Beach)

### Symptom
After opening the app on a new device (or a device where the token had expired/been cleared) and entering the Devon password, all session history is gone. Upstash shows `sessions: []` and a fresh `createdAt` timestamp.

### Root cause
`showDevonPasswordModal()` was verifying the password by doing a **POST** with the current local `data` blob as the body — using it as both the auth check and the upload payload. On a new device, local `data` has `sessions: []` (nothing in localStorage yet), so a successful password entry immediately overwrites the server with empty data.

```js
// BAD — was doing this:
var testPayload = Object.assign({}, data, { lastSyncedAt: Date.now() });
fetch(API + "?user=devon", { method: "POST", body: JSON.stringify(testPayload) })
```

### Fix
Changed the password verification to use a **GET** request (which requires the token but doesn't write anything). Only after the token is confirmed does `setPlayer()` run, which then calls `syncDown()` to pull the real server data before ever pushing.

```js
// GOOD — now does this:
fetch(API + "?user=devon", { headers: { "X-Admin-Token": pw } })
```

### Data recovery
Session data backed up at `boggle/backups/devon-sessions-2026.08.04.json` (25 completed rounds from the 2026-08-03 session in Miami Beach). Restore via the admin panel or by importing via Settings → Backup.

### Timeline of incidents
- **2026-08-04**: First confirmed wipe. Restored manually via Upstash. Bug fixed in same session.
