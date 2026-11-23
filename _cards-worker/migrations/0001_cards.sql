CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE oauth_flows (state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, verifier TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id=1), enabled INTEGER NOT NULL DEFAULT 1, hour INTEGER NOT NULL DEFAULT 9 CHECK(hour BETWEEN 0 AND 23), timezone TEXT NOT NULL DEFAULT 'America/New_York');
INSERT INTO settings(id) VALUES(1);
CREATE TABLE subscriptions (id TEXT PRIMARY KEY, subscription TEXT NOT NULL, created_at INTEGER NOT NULL);
-- One reminder attempt per device per local calendar day, including overlapping cron runs.
CREATE TABLE notifications (subscription_id TEXT NOT NULL, day TEXT NOT NULL, status TEXT NOT NULL, PRIMARY KEY(subscription_id, day));
-- Serialize reviews of a card. Uncertain writes remain pending until retried or reconciled.
CREATE TABLE reviews (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, rating TEXT NOT NULL, expected_version TEXT NOT NULL, payload TEXT, result TEXT, state TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL);
CREATE UNIQUE INDEX one_pending_review_per_card ON reviews(card_id) WHERE state='pending';
