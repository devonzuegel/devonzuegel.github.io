PRAGMA foreign_keys = ON;
CREATE TABLE codes (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, destination TEXT NOT NULL, placement TEXT NOT NULL DEFAULT '',
  alerts INTEGER NOT NULL DEFAULT 1 CHECK(alerts IN (0,1)), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, opens INTEGER NOT NULL DEFAULT 0, last_open INTEGER,
  request_key TEXT UNIQUE
);
CREATE INDEX codes_created ON codes(created_at DESC, id DESC);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE oauth_flows (state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, verifier TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX oauth_expiry ON oauth_flows(expires_at);
CREATE TABLE visits (
  id TEXT PRIMARY KEY, code_id TEXT NOT NULL REFERENCES codes(id), opened_at INTEGER NOT NULL,
  city TEXT, region TEXT, country TEXT, email_status TEXT NOT NULL CHECK(email_status IN ('pending','accepted','suppressed','failed')),
  reason TEXT
);
CREATE INDEX visits_code_time ON visits(code_id, opened_at DESC, id DESC);
CREATE INDEX visits_retention ON visits(opened_at);
CREATE TABLE email_jobs (
  id TEXT PRIMARY KEY, visit_id TEXT UNIQUE REFERENCES visits(id) ON DELETE CASCADE,
  code_id TEXT REFERENCES codes(id), kind TEXT NOT NULL DEFAULT 'visit', payload TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending','sending','accepted','suppressed','failed')),
  reason TEXT, created_at INTEGER NOT NULL, deadline INTEGER NOT NULL, next_attempt INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, lease_until INTEGER, claim_token TEXT, provider_id TEXT
);
CREATE INDEX jobs_due ON email_jobs(status,next_attempt);
CREATE INDEX jobs_code_time ON email_jobs(code_id,created_at DESC);
CREATE INDEX jobs_created ON email_jobs(created_at);
CREATE INDEX jobs_lease ON email_jobs(status,lease_until);
CREATE TABLE email_reservations (id TEXT PRIMARY KEY, reserved_at INTEGER NOT NULL);
CREATE INDEX reservations_time ON email_reservations(reserved_at);
CREATE TABLE cooldowns (key TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
CREATE INDEX cooldown_expiry ON cooldowns(expires_at);
CREATE TABLE daily_logging (day TEXT PRIMARY KEY, count INTEGER NOT NULL DEFAULT 0);
CREATE TABLE operations (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL);
-- Aggregates survive visit retention. Only accepted logging work increments them.
CREATE TRIGGER visit_aggregate AFTER INSERT ON visits BEGIN
  UPDATE codes SET opens=opens+1, last_open=MAX(COALESCE(last_open,0),NEW.opened_at) WHERE id=NEW.code_id;
  UPDATE daily_logging SET count=count+1 WHERE day=strftime('%Y-%m-%d', NEW.opened_at, 'unixepoch');
END;
CREATE TRIGGER job_status AFTER UPDATE OF status ON email_jobs BEGIN
  UPDATE visits SET email_status=CASE WHEN NEW.status='sending' THEN 'pending' ELSE NEW.status END, reason=NEW.reason WHERE id=NEW.visit_id;
END;
