-- Keep confirmed activity after the retry records in reviews expire.
CREATE TABLE review_activity (
  review_id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  rating TEXT NOT NULL,
  reviewed_at INTEGER NOT NULL
);
CREATE INDEX review_activity_by_date ON review_activity(reviewed_at);

INSERT INTO review_activity (review_id, card_id, rating, reviewed_at)
SELECT id, card_id, rating, created_at FROM reviews WHERE state = 'done';

CREATE TRIGGER record_confirmed_review
AFTER UPDATE OF state ON reviews
WHEN NEW.state = 'done' AND OLD.state <> 'done'
BEGIN
  INSERT OR IGNORE INTO review_activity (review_id, card_id, rating, reviewed_at)
  VALUES (NEW.id, NEW.card_id, NEW.rating, NEW.created_at);
END;
