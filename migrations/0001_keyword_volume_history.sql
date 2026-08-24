CREATE TABLE IF NOT EXISTS keyword_volume_history (
  keyword TEXT NOT NULL,
  category TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  pc_volume INTEGER NOT NULL,
  mobile_volume INTEGER NOT NULL,
  total_volume INTEGER NOT NULL,
  competition_grade TEXT NOT NULL,
  collected_at TEXT NOT NULL,
  collected_date TEXT NOT NULL,
  PRIMARY KEY (keyword, collected_date)
);

CREATE INDEX IF NOT EXISTS idx_keyword_volume_history_latest
  ON keyword_volume_history (collected_date, total_volume DESC);

CREATE INDEX IF NOT EXISTS idx_keyword_volume_history_category
  ON keyword_volume_history (category_slug, collected_date, total_volume DESC);

CREATE INDEX IF NOT EXISTS idx_keyword_volume_history_keyword
  ON keyword_volume_history (keyword, collected_date DESC);
