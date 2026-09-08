CREATE TABLE IF NOT EXISTS waitlist_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  legal_agreed INTEGER NOT NULL CHECK (legal_agreed = 1),
  legal_version TEXT NOT NULL,
  legal_agreed_at TEXT,
  founding_eligible INTEGER NOT NULL DEFAULT 0
    CHECK (founding_eligible IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  survey_token_hash TEXT NOT NULL UNIQUE,
  country_code TEXT,
  referral_source TEXT,
  referral_community TEXT,
  referral_other TEXT,
  expansion_interests_json TEXT,
  desktop_browsers_json TEXT,
  mobile_apps_json TEXT,
  annual_price_tier TEXT CHECK (
    annual_price_tier IS NULL OR annual_price_tier IN (
      'usd_19_99',
      'usd_29_99',
      'usd_39_99',
      'usd_49_99_plus'
    )
  ),
  survey_completed_at TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  referrer_host TEXT
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created
  ON waitlist_submissions(created_at);

CREATE INDEX IF NOT EXISTS idx_waitlist_eligible
  ON waitlist_submissions(founding_eligible, created_at);
