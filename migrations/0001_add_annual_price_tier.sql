ALTER TABLE waitlist_submissions
ADD COLUMN annual_price_tier TEXT CHECK (
  annual_price_tier IS NULL OR annual_price_tier IN (
    'usd_19_99',
    'usd_29_99',
    'usd_39_99',
    'usd_49_99_plus'
  )
);
