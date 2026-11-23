# Concert storage

Private, bearer-authenticated storage bridge for the existing Vercel concert API.
D1 stores gzip/base64 JSON records with integer versions. Conditional writes are
atomic and the API retries conflicts; account and list keys are never cached.

`STORAGE_SECRET` is a Cloudflare secret, also configured as
`CONCERTS_STORAGE_SECRET` on the Vercel project. `CONCERTS_STORAGE_URL` selects
this backend. These secrets must never be committed or printed.

The migration preserves every original `concerts:v1:` key, including shared list
IDs and profile code hashes. The original export is kept outside this repository.

Production cutover: November 23, 2026. All 890 exported records were imported and
read back byte-for-byte before switching the Vercel production environment.
Verified the original Thanksgiving shared link (16 concerts, 5 planned shows)
and the signed-in app's Synced status. The API remains hosted on Vercel; only
storage moved. The old Upstash database and recovery export remain intact.

Deploy this worker with Wrangler using this directory's `wrangler.jsonc`; apply
`schema.sql` only when initializing a new database. Deploy `concerts/` to Vercel
after configuring both storage environment variables. Never switch back to the
old export without reconciling writes made since the cutover.
