# Concert storage

Private, bearer-authenticated storage bridge for the existing Vercel concert API.
D1 stores gzip/base64 JSON records with integer versions. Conditional writes are
atomic and the API retries conflicts; account and list keys are never cached.

`STORAGE_SECRET` is a Cloudflare secret, also configured as
`CONCERTS_STORAGE_SECRET` on the Vercel project. `CONCERTS_STORAGE_URL` selects
this backend. These secrets must never be committed or printed.

The migration preserves every original `concerts:v1:` key, including shared list
IDs and profile code hashes. The original export is kept outside this repository.
