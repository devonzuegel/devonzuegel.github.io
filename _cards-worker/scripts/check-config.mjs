import { readFileSync } from 'node:fs';
const config = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
if (config.includes('REPLACE_')) throw new Error('Configure the dedicated D1 database and GitHub OAuth app before deploying. See README.md.');
